import React, { useState, useEffect, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { 
  ArrowLeft, Clock, ThumbsUp, ThumbsDown, Eye, Share2, 
  MessageSquare, Sparkles, AlertCircle, CheckCircle2, XCircle, Send, UserCheck, ShieldAlert,
  Bot, Tag
} from 'lucide-react';
import CountdownTimer from '../components/CountdownTimer';
import ShareModal from '../components/ShareModal';
import AiVerdictCard from '../components/AiVerdictCard';
import { QUICK_REASONS, ROAST_MESSAGES } from '../lib/constants';
import { getCurrentUser } from '../lib/user';
import { getSupabase } from '../lib/supabase';
import { autoSettleApproval, calculateApprovalTally } from '../lib/settle';
import { 
  syncFromCloud, getCachedApprovals, getCachedVotes, 
  getCachedComments, submitVote, submitComment, updateApproval 
} from '../lib/cloudStore';
import confetti from 'canvas-confetti';

export default function DetailPage() {
  const [, params] = useRoute('/approval/:id');
  const approvalId = params?.id;

  const currentUser = getCurrentUser();

  const [approval, setApproval] = useState(null);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  // 投票前置选项：是否已拥有该物品（null | true | false）
  const [ownsItem, setOwnsItem] = useState(null);

  // 投票表单状态
  const [voteType, setVoteType] = useState('reject'); // 'approve' | 'reject' | 'spectate'
  const [voteReason, setVoteReason] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState('');

  // 评论表单状态
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 自动弹出分享弹窗（若从发起页跳转过来）
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('created') === '1') {
      setShowShareModal(true);
    }
  }, []);

  // 1. 获取审批单数据、投票列表、评论列表
  const fetchDetail = async (isManual = false) => {
    if (!approvalId) return;
    if (isManual) setLoading(true);

    // 先从本地缓存秒开渲染
    const allApps = getCachedApprovals() || [];
    const foundLocal = allApps.find(a => a.id === approvalId);
    if (foundLocal) {
      setApproval(foundLocal);
      setVotes(getCachedVotes().filter(v => v.approval_id === approvalId));
      setComments(getCachedComments(approvalId));
      setLoading(false);
    }

    try {
      const data = await syncFromCloud();
      if (data) {
        const found = (data.approvals || []).find(a => a.id === approvalId);
        if (found) {
          setApproval(found);
          const currentVotes = (data.votes || []).filter(v => v.approval_id === approvalId);
          setVotes(currentVotes);
          setComments((data.comments || []).filter(c => c.approval_id === approvalId));

          // 检查自动结算
          if (found.status === 'pending') {
            const settled = await autoSettleApproval(found, currentVotes);
            if (settled && settled.status !== 'pending') {
              setApproval(settled);
              updateApproval(settled);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching detail from cloud:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    // 监听全局数据变动事件
    const handleDataUpdate = (e) => {
      if (e.detail && approvalId) {
        const found = (e.detail.approvals || []).find(a => a.id === approvalId);
        if (found) setApproval(found);
        if (e.detail.votes) {
          setVotes(e.detail.votes.filter(v => v.approval_id === approvalId));
        }
        if (e.detail.comments) {
          setComments(e.detail.comments.filter(c => c.approval_id === approvalId));
        }
      }
    };
    window.addEventListener('sengsidai_data_updated', handleDataUpdate);

    // 每 6 秒轻量同步一次详情页数据
    const timer = setInterval(() => {
      fetchDetail(false);
    }, 6000);

    // Supabase Realtime 订阅（若配置）
    const client = getSupabase();
    let channel = null;
    if (client && approvalId) {
      channel = client
        .channel(`detail_${approvalId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'approvals', filter: `id=eq.${approvalId}` },
          (payload) => setApproval(payload.new)
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'votes', filter: `approval_id=eq.${approvalId}` },
          (payload) => setVotes((prev) => [payload.new, ...prev.filter(v => v.id !== payload.new.id)])
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comments', filter: `approval_id=eq.${approvalId}` },
          (payload) => setComments((prev) => [...prev, payload.new])
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('sengsidai_data_updated', handleDataUpdate);
      if (client && channel) client.removeChannel(channel);
    };
  }, [approvalId]);

  // 计算票数统计与 AI 折算
  const tally = useMemo(() => {
    return calculateApprovalTally(approval, votes);
  }, [approval, votes]);

  const totalDecisive = tally.humanApprove + tally.humanReject;
  const approvePct = (tally.finalApprove + tally.finalReject) === 0 
    ? 50 
    : Math.round((tally.finalApprove / (tally.finalApprove + tally.finalReject)) * 100);
  const rejectPct = 100 - approvePct;

  // 判断当前用户是否为发起人
  const isCreator = useMemo(() => {
    return approval && approval.creator_id === currentUser.id;
  }, [approval, currentUser.id]);

  // 判断当前用户是否已经投过票
  const myVote = useMemo(() => {
    return votes.find(v => v.voter_id === currentUser.id);
  }, [votes, currentUser.id]);

  // 提交投票
  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    setVoteError('');

    // 1. 发起人禁止投票校验
    if (isCreator) {
      setVoteError('你是发起人，不能给自己投票');
      return;
    }

    // 2. 必须先选择“是否已拥有”
    if (ownsItem === null) {
      setVoteError('请先选择你是否已经拥有该物品（已有 / 还没有）');
      return;
    }

    if (myVote) {
      setVoteError('您已经参与过本单投票，每人限投一单一次不可修改');
      return;
    }
    if (!voteReason.trim()) {
      setVoteError('投票必须附带一句话理由，为当事人提供参考！');
      return;
    }
    if (approval.status !== 'pending') {
      setVoteError('本单冷静期已结算，不再接受新投票');
      return;
    }

    setSubmittingVote(true);

    const newVote = {
      approval_id: approval.id,
      voter_id: currentUser.id,
      voter_nickname: currentUser.nickname,
      type: voteType,
      owns_item: ownsItem,
      reason: voteReason.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      // 触发自动结算检测计算
      const updatedVotes = [newVote, ...votes.filter(v => !(v.approval_id === approval.id && v.voter_id === currentUser.id))];
      const settled = await autoSettleApproval(approval, updatedVotes);
      
      await submitVote(newVote, settled && settled.status !== 'pending' ? settled : null);

      setVotes(updatedVotes);
      if (settled && settled.status !== 'pending') {
        setApproval(settled);
      }
      setVoteReason('');
      setOwnsItem(null);

      if (voteType === 'approve') {
        confetti({ particleCount: 50, spread: 60 });
      }
    } catch (err) {
      setVoteError(`提交异常: ${err.message || '网络连接异常'}`);
    } finally {
      setSubmittingVote(false);
    }
  };

  // 提交讨论区留言
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);

    const newComment = {
      approval_id: approval.id,
      user_id: currentUser.id,
      user_nickname: currentUser.nickname,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await submitComment(newComment);
      setComments(prev => [...prev, saved]);
      setCommentText('');
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 倒计时结束结算触发
  const handleTimerExpire = async () => {
    if (approval && approval.status === 'pending') {
      const settled = await autoSettleApproval(approval, votes);
      if (settled) {
        setApproval(settled);
      }
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-2 animate-fadeIn">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs">正在连接实时审批单...</p>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="py-24 text-center space-y-3 animate-fadeIn">
        <h3 className="text-lg font-bold text-slate-800">未找到此笔消费审批</h3>
        <Link href="/" className="inline-block px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold">
          返回广场
        </Link>
      </div>
    );
  }

  // 扎心文案
  const roastIndex = Math.abs(approval.title.length + Math.round(approval.price)) % ROAST_MESSAGES.length;
  const roastMsg = ROAST_MESSAGES[roastIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28 text-left animate-fadeIn">
      {/* 顶部返回与分享 */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-3 rounded-xl hover:bg-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回广场大厅</span>
        </Link>

        <button
          onClick={() => {
            setShowShareModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200/80 text-amber-800 font-bold text-xs rounded-xl transition shadow-2xs active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>分享审批群 / 劝退口令</span>
        </button>
      </div>

      {/* 核心商品卡片 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-md">
        {/* 顶部元数据与倒计时 */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {approval.category}
            </span>
            <span className="text-xs text-slate-500">
              发起人：<span className="font-semibold text-slate-700">@{approval.creator_nickname}</span>
              {(approval.creator_gender || approval.creator_mbti || approval.creator_zodiac) && (
                <span className="ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                  {approval.creator_gender ? `${approval.creator_gender} · ` : ''}
                  {approval.creator_mbti ? `${approval.creator_mbti} · ` : ''}
                  {approval.creator_zodiac || ''}
                </span>
              )}
              {isCreator && <span className="ml-1 text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded-md">(我)</span>}
            </span>
          </div>

          <CountdownTimer 
            deadline={approval.deadline} 
            status={approval.status} 
            onExpire={handleTimerExpire} 
          />
        </div>

        {/* 商品名称与价格 */}
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {approval.title}
            </h1>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
              {approval.expected_duration && (
                <>
                  <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                    ⏳ 预计使用时长：{approval.expected_duration}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>冷静期设定：{approval.cooling_hours || 24} 小时</span>
              <span>•</span>
              <span>发起时间：{new Date(approval.created_at).toLocaleString('zh-CN', { hour12: false })}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400 block">冲动预算</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
              ¥{approval.price}
            </span>
          </div>
        </div>

        {/* 上传的图片 / 视频实拍展示（若有） */}
        {approval.media_url && (
          <div className="mb-4 rounded-2xl overflow-hidden bg-slate-900/5 border border-slate-200">
            {approval.media_type === 'video' ? (
              <video 
                src={approval.media_url} 
                controls 
                className="w-full max-h-72 object-contain bg-black rounded-2xl" 
              />
            ) : (
              <img 
                src={approval.media_url} 
                alt={approval.title} 
                className="w-full max-h-80 object-contain rounded-2xl" 
              />
            )}
          </div>
        )}

        {/* 购买理由 */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            💭 冲动消费心动理由：
          </h4>
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 text-slate-800 text-sm leading-relaxed">
            {approval.reason}
          </div>
        </div>

        {/* 替代方案对比 */}
        {approval.alternative && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              🔄 现有平替方案与闲置情况：
            </h4>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-slate-700 text-xs leading-relaxed">
              {approval.alternative}
            </div>
          </div>
        )}

        {/* 希望哪些 MBTI 的人给建议标签展示 */}
        {approval.target_mbtis && Array.isArray(approval.target_mbtis) && approval.target_mbtis.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
            <span className="font-bold text-slate-700">🎯 发起人特别希望听到这些 MBTI 的建议：</span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {approval.target_mbtis.map(m => (
                <span key={m} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-amber-800 shadow-2xs">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 结算结果大卡片（若已结束） */}
        {approval.status === 'rejected' && (
          <div className="mt-5 p-5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl text-white shadow-lg glow-rose animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-6 h-6 text-yellow-200" />
              <span className="text-base font-black">【消费审批已驳回】成功守住钱包！</span>
            </div>
            <div className="text-2xl font-black font-mono my-2 text-yellow-100">
              成功为TA省下 ¥{approval.price}
            </div>
            <div className="text-xs text-white/90 font-mono mb-2 bg-black/15 p-2 rounded-xl">
              票数构成：{tally.summaryText}
            </div>
            <p className="text-xs text-rose-100 font-medium italic">“{roastMsg}”</p>
          </div>
        )}

        {approval.status === 'approved' && (
          <div className="mt-5 p-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl text-white shadow-lg glow-emerald animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-100" />
              <span className="text-base font-black">【消费审批已通过】理性放行！</span>
            </div>
            <div className="text-xs text-white/90 font-mono mb-2 bg-black/15 p-2 rounded-xl">
              票数构成：{tally.summaryText}
            </div>
            <p className="text-xs text-emerald-100 font-medium">
              网友与 AI 多数一致判定具备实际价值与高性价比，买完要好好利用它哦！
            </p>
          </div>
        )}
      </div>

      {/* AI建议点评区 */}
      <AiVerdictCard 
        approval={approval} 
        votes={votes}
        onUpdateApproval={(updated) => {
          setApproval(updated);
          updateApproval(updated);
        }}
      />

      {/* 投票实时大盘与双色柱 */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm text-left">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>实时综合表态大盘</span>
            <span className="text-[11px] font-normal text-slate-400">
              (目标 {tally.requiredVotes} 人 · 人类已投 {totalDecisive} 票)
            </span>
          </h3>
          <span className="text-xs font-mono font-bold text-amber-600">
            {approval.status === 'pending' ? '🔥 实时投票进行中' : '🔒 投票已锁定'}
          </span>
        </div>

        {/* 结算规则明示 */}
        <p className="text-[11px] text-slate-400 mb-3 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100/70">
          💡 <span className="font-semibold text-slate-600">判定规则：</span>
          达到设定人数或 {approval.cooling_hours || 24} 小时冷静期到期后，将自动按最终总票数（人类有效票 + AI 折算票）判定结果；平票坚决判不买劝退！
        </p>

        {/* 双色动态大进度柱 */}
        <div className="space-y-2.5">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${approvePct}%` }}
              className="bg-emerald-500 progress-bar-transition rounded-l-full relative group"
            />
            <div 
              style={{ width: `${rejectPct}%` }}
              className="bg-rose-500 progress-bar-transition rounded-r-full relative group"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <div className="text-emerald-600 flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4" />
              <span>综合支持买: {tally.finalApprove} 票 ({approvePct}%)</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              👀 围观中立: {tally.humanSpectate} 人
            </div>
            <div className="text-rose-600 flex items-center gap-1.5">
              <span>综合劝退: {tally.finalReject} 票 ({rejectPct}%)</span>
              <ThumbsDown className="w-4 h-4" />
            </div>
          </div>

          {/* 票数构成直观卡片：AI权重直接算入总票数 */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="bg-emerald-50/80 border border-emerald-100/80 rounded-xl p-2.5 text-emerald-800">
              <div className="text-[11px] font-bold text-emerald-700">👍 支持方票数构成：</div>
              <div className="text-xs font-mono mt-0.5">
                人类 {tally.humanApprove} + AI {tally.aiApprove} = <span className="font-bold text-emerald-950">{tally.finalApprove} 票</span>
              </div>
            </div>
            <div className="bg-rose-50/80 border border-rose-100/80 rounded-xl p-2.5 text-rose-800">
              <div className="text-[11px] font-bold text-rose-700">🛑 劝退方票数构成：</div>
              <div className="text-xs font-mono mt-0.5">
                人类 {tally.humanReject} + AI {tally.aiReject} = <span className="font-bold text-rose-950">{tally.finalReject} 票</span>
              </div>
            </div>
          </div>

          {/* AI 折算明细标尺 */}
          <div className="text-[11px] text-slate-600 font-mono pt-1 text-center bg-slate-50 py-1.5 rounded-xl border border-slate-200/60">
            {tally.summaryText}
          </div>
        </div>
      </div>

      {/* 投票操作交互区 */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm text-left">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <span>我要表态投票</span>
          <span className="text-[11px] font-normal text-slate-400">（每人限投 1 次，投完不可更改）</span>
        </h3>

        {/* 发起人禁止投票提示 */}
        {isCreator ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">你是发起人，不能给自己投票。</span>
              <p className="text-[11px] text-amber-700 mt-0.5">请耐心等候网友、朋友或 AI 为你理智把关！</p>
            </div>
          </div>
        ) : myVote ? (
          /* 已投过票提示 */
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
            <UserCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-800 space-y-1">
                <div className="text-slate-600">您已经对本单完成表态：</div>
                <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                  <span className="text-slate-500 font-semibold">表态：</span>
                  <span className={`font-black ${
                    myVote.type === 'approve' ? 'text-emerald-600' : myVote.type === 'reject' ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    {myVote.type === 'approve' ? '👍 支持购买' : myVote.type === 'reject' ? '🛑 劝退驳回' : '👀 中立围观'}
                  </span>
                  <span className="text-slate-300 font-normal">/</span>
                  <span className="text-slate-500 font-semibold">是否已拥有：</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-medium text-[11px]">
                    {myVote.owns_item ? '已拥有' : '未拥有'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic mt-1 bg-white/80 p-2 rounded-xl border border-amber-100">
                “{myVote.reason}”
              </p>
            </div>
          </div>
        ) : approval.status !== 'pending' ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
            本单已达到判定上限或已度过冷静期，投票通道已关闭。
          </div>
        ) : (
          /* 正常表态投票表单 */
          <form onSubmit={handleVoteSubmit} className="space-y-4">
            {voteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium animate-fadeIn">
                ⚠️ {voteError}
              </div>
            )}

            {/* 前置问题：是否已拥有此物品 */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ❓ 你已经有这个东西（或类似平替）了吗？ <span className="text-rose-500">* (必选)</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setOwnsItem(true);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                    ownsItem === true
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  <span>🙋 已有</span>
                  <span className="text-[10px] font-normal opacity-80">(买过/家里有)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOwnsItem(false);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                    ownsItem === false
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  <span>🙅 还没有</span>
                  <span className="text-[10px] font-normal opacity-80">(未拥有)</span>
                </button>
              </div>
            </div>

            {/* 三选一：通过 / 驳回 / 围观 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setVoteType('reject');
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 active:scale-95 ${
                  voteType === 'reject'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400/40'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ThumbsDown className={`w-5 h-5 ${voteType === 'reject' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">驳回 (劝退)</span>
                <span className="text-[10px] text-slate-400">别买立省100%</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoteType('approve');
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 active:scale-95 ${
                  voteType === 'approve'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/40'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ThumbsUp className={`w-5 h-5 ${voteType === 'approve' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">通过 (放行)</span>
                <span className="text-[10px] text-slate-400">刚需生产力冲</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoteType('spectate');
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1 active:scale-95 ${
                  voteType === 'spectate'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/40'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Eye className={`w-5 h-5 ${voteType === 'spectate' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">中立 (围观)</span>
                <span className="text-[10px] text-slate-400">吃瓜看后续</span>
              </button>
            </div>

            {/* 快捷理由点击 */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>点击选用理由：</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(QUICK_REASONS[voteType] || []).map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setVoteReason(reason);
                    }}
                    className="text-[11px] bg-slate-100 hover:bg-amber-100/70 text-slate-600 hover:text-amber-900 px-2.5 py-1 rounded-xl transition text-left active:scale-95"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* 一句话理由输入 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                必填一句话理由： <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="请真诚给出你的理由（支持/劝退/吐槽）..."
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={submittingVote || ownsItem === null}
              className={`w-full py-3 text-white font-black text-xs rounded-2xl shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5 ${
                ownsItem === null
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {submittingVote 
                  ? '正在记录投票...' 
                  : ownsItem === null 
                  ? '请先选择是否已有此物品' 
                  : '确认投出这一票（不可更改）'}
              </span>
            </button>
          </form>
        )}
      </div>

      {/* 投票理由卡片墙 */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm text-left">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
          <span>表态意见墙 ({votes.length})</span>
          <span className="text-[11px] text-slate-400">实时更新中</span>
        </h3>

        {votes.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">暂无人表态，快来做第一个清醒发言人！</p>
        ) : (
          <div className="space-y-2.5">
            {votes.map((v) => (
              <div 
                key={v.id || v.voter_id + v.created_at}
                className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs flex items-start justify-between gap-3 animate-fadeIn"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">@{v.voter_nickname}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      v.type === 'approve'
                        ? 'bg-emerald-100 text-emerald-800'
                        : v.type === 'reject'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {v.type === 'approve' ? '👍 批准购买' : v.type === 'reject' ? '🛑 劝退驳回' : '👀 围观中立'}
                    </span>
                    {/* 已拥有标签 */}
                    {v.owns_item !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-0.5 ${
                        v.owns_item
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Tag className="w-2.5 h-2.5" />
                        <span>{v.owns_item ? '已拥有' : '未拥有'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 italic">“{v.reason}”</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {new Date(v.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 实时讨论盖楼区 */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm text-left">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span>围观讨论区 ({comments.length})</span>
        </h3>

        {/* 讨论列表 */}
        <div className="space-y-2.5 mb-4 max-h-72 overflow-y-auto no-scrollbar">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">暂无闲聊留言，来发一句吧！</p>
          ) : (
            comments.map((c) => (
              <div key={c.id || c.created_at} className="bg-amber-50/40 p-3 rounded-2xl border border-amber-100/60 text-xs animate-fadeIn">
                <div className="flex items-center justify-between text-slate-500 mb-1 text-[11px]">
                  <span className="font-bold text-slate-700">@{c.user_nickname}</span>
                  <span className="font-mono text-[10px]">
                    {new Date(c.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-800">{c.content}</div>
              </div>
            ))
          )}
        </div>

        {/* 发言输入 */}
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="加入讨论，吐槽或者给TA点建议..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={submittingComment || !commentText.trim()}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold transition disabled:opacity-50 active:scale-95"
          >
            发送
          </button>
        </form>
      </div>

      {/* 分享弹窗 */}
      {showShareModal && (
        <ShareModal
          approval={approval}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
