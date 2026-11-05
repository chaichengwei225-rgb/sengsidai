import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { PiggyBank, RefreshCw, Plus, Sparkles, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import ApprovalCard from '../components/ApprovalCard';
import ShareModal from '../components/ShareModal';
import { getCurrentUser } from '../lib/user';
import { getSupabase } from '../lib/supabase';
import { ROAST_MESSAGES } from '../lib/constants';
import { autoSettleApproval } from '../lib/settle';
import { syncFromCloud, getCachedApprovals, getCachedVotes, deleteApproval } from '../lib/cloudStore';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function RecordsPage() {
  const [currentUser] = useState(() => getCurrentUser());
  const [approvals, setApprovals] = useState(() => {
    const cached = getCachedApprovals() || [];
    return cached.filter(a => a.creator_id === currentUser.id);
  });
  const [votes, setVotes] = useState(() => getCachedVotes() || []);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'rejected' | 'approved' | 'pending'
  const [sharingApproval, setSharingApproval] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 删除本人发布的审批单（二次确认后执行）
  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const res = await deleteApproval(pendingDelete.id, currentUser.id);
    setDeleting(false);
    setPendingDelete(null);
    if (!res.success) {
      window.alert(res.error);
    } else if (!res.cloudSynced) {
      window.alert(res.warning || '已从本机删除，但云端同步暂时失败，其他设备可能仍能看到，请稍后重试。');
    }
  };

  // 获取属于当前用户的审批与战报
  const fetchRecords = async (isManual = false) => {
    if (isManual) setLoading(true);

    const cached = getCachedApprovals() || [];
    const myCached = cached.filter(a => a.creator_id === currentUser.id);
    setApprovals(myCached);
    setVotes(getCachedVotes() || []);

    try {
      const data = await syncFromCloud();
      if (data) {
        const myApps = (data.approvals || []).filter(a => a.creator_id === currentUser.id);
        setApprovals(myApps);
        setVotes(data.votes || []);

        myApps.forEach(app => {
          if (app.status === 'pending') {
            const related = (data.votes || []).filter(v => v.approval_id === app.id);
            autoSettleApproval(app, related);
          }
        });
      }
    } catch (e) {
      console.warn('Error fetching records:', e);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

    const handleDataUpdate = (e) => {
      if (e.detail && e.detail.approvals) {
        const myApps = e.detail.approvals.filter(a => a.creator_id === currentUser.id);
        setApprovals(myApps);
        if (e.detail.votes) setVotes(e.detail.votes);
      }
    };
    window.addEventListener('sengsidai_data_updated', handleDataUpdate);

    const timer = setInterval(() => {
      fetchRecords(false);
    }, 8000);

    const client = getSupabase();
    let channel = null;
    if (client) {
      channel = client
        .channel(`records_realtime_${currentUser.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'approvals', filter: `creator_id=eq.${currentUser.id}` },
          () => fetchRecords(false)
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('sengsidai_data_updated', handleDataUpdate);
      if (client && channel) client.removeChannel(channel);
    };
  }, [currentUser.id]);

  // 胜负与拦截战报数据统计
  const totalCount = approvals.length;
  const rejectedApprovals = useMemo(() => approvals.filter(a => a.status === 'rejected'), [approvals]);
  const approvedApprovals = useMemo(() => approvals.filter(a => a.status === 'approved'), [approvals]);
  const pendingApprovals = useMemo(() => approvals.filter(a => a.status === 'pending'), [approvals]);

  // 本人参与表态总数（包含自己发起的单子 + 给他人投过票的单子）
  const myVotedCount = useMemo(() => {
    const uniqueApprovalIds = new Set(votes.filter(v => v.voter_id === currentUser.id).map(v => v.approval_id));
    return uniqueApprovalIds.size;
  }, [votes, currentUser.id]);

  // 累计拦截省下金额
  const totalSavedMoney = useMemo(() => {
    return rejectedApprovals.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [rejectedApprovals]);

  // 筛选显示的单子
  const displayedApprovals = useMemo(() => {
    if (statusFilter === 'all') return approvals;
    return approvals.filter(a => a.status === statusFilter);
  }, [approvals, statusFilter]);

  const roastMsg = ROAST_MESSAGES[Math.floor(totalSavedMoney) % ROAST_MESSAGES.length] || ROAST_MESSAGES[0];

  return (
    <div className="space-y-6 pb-28 text-left animate-fadeIn">
      {/* 战绩大盘与累计拦截总额 */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-amber relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1">
                <PiggyBank className="w-3.5 h-3.5 text-yellow-200" />
                <span>冷静期消费拦截战绩榜</span>
              </span>
              <span className="text-xs text-amber-100 font-medium">@{currentUser.nickname}</span>
            </div>

            <Link
              href="/create"
              className="px-3.5 py-1.5 bg-white text-amber-900 font-black text-xs rounded-xl shadow-xs hover:bg-amber-50 transition flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>测一笔冲动消费</span>
            </Link>
          </div>

          {/* 累计为你拦截冲动消费 */}
          <div className="bg-black/15 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-100 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-200" />
                <span>冷静期累计为你拦截冲动消费：</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                ¥{totalSavedMoney.toLocaleString()}
              </div>
              {totalSavedMoney > 0 ? (
                <p className="text-xs text-yellow-100/90 italic font-medium mt-1">
                  “{roastMsg}”
                </p>
              ) : (
                <p className="text-[11px] text-amber-100/80 mt-1">
                  目前还没有被劝退驳回的单子，继续保持克制理性！
                </p>
              )}
            </div>

            {/* 核心胜负战报指标卡 */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 shrink-0">
              <div className="bg-white/10 rounded-xl p-2 text-center min-w-[62px]">
                <div className="text-base sm:text-lg font-black text-white font-mono">{totalCount}</div>
                <div className="text-[10px] text-amber-100">发起审批</div>
              </div>
              <div className="bg-rose-500/30 rounded-xl p-2 text-center border border-rose-300/30 min-w-[62px]">
                <div className="text-base sm:text-lg font-black text-white font-mono">{rejectedApprovals.length}</div>
                <div className="text-[10px] text-rose-100">成功劝退</div>
              </div>
              <div className="bg-emerald-500/30 rounded-xl p-2 text-center border border-emerald-300/30 min-w-[62px]">
                <div className="text-base sm:text-lg font-black text-white font-mono">{approvedApprovals.length}</div>
                <div className="text-[10px] text-emerald-100">理性放行</div>
              </div>
              <div className="bg-blue-500/30 rounded-xl p-2 text-center border border-blue-300/30 min-w-[62px]">
                <div className="text-base sm:text-lg font-black text-white font-mono">{myVotedCount}</div>
                <div className="text-[10px] text-blue-100">表态参与</div>
              </div>
            </div>
          </div>
        </div>

        {/* 装饰水印 */}
        <div className="absolute -right-6 -bottom-8 text-9xl opacity-15 pointer-events-none select-none">
          🏆
        </div>
      </div>

      {/* 胜负与拦截记录筛选 Tab */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>拦截战绩与已结算胜负记录</span>
          <span className="text-xs text-slate-400 font-normal">({displayedApprovals.length})</span>
        </h3>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-amber-100 shadow-2xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-amber-100 text-amber-900' : 'text-slate-500'
            }`}
          >
            全部 ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
              statusFilter === 'rejected' ? 'bg-rose-100 text-rose-900' : 'text-slate-500'
            }`}
          >
            🛑 成功拦截 ({rejectedApprovals.length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
              statusFilter === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-500'
            }`}
          >
            ✅ 理性放行 ({approvedApprovals.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
              statusFilter === 'pending' ? 'bg-amber-100 text-amber-900' : 'text-slate-500'
            }`}
          >
            🕒 冷静中 ({pendingApprovals.length})
          </button>
        </div>
      </div>

      {/* 战绩记录卡片列表 */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs">加载战绩数据中...</p>
        </div>
      ) : displayedApprovals.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-amber-100 text-center space-y-3">
          <div className="text-5xl">🎯</div>
          <h4 className="text-sm font-bold text-slate-800">
            {statusFilter === 'rejected' ? '暂无成功拦截的记录' : '暂无相关战绩记录'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            有想买的东西就发一单，让 AI 和理性网友帮你冷静把关，拦截一笔立省 100%！
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>发起审批增加战绩</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedApprovals.map(app => (
            <ApprovalCard
              key={app.id}
              approval={app}
              votes={votes.filter(v => v.approval_id === app.id)}
              onShare={(a) => setSharingApproval(a)}
              isOwner={true}
              onDelete={(a) => setPendingDelete(a)}
            />
          ))}
        </div>
      )}

      {/* 分享弹窗 */}
      {sharingApproval && (
        <ShareModal 
          approval={sharingApproval} 
          onClose={() => setSharingApproval(null)} 
        />
      )}

      {/* 删除确认 */}
      {pendingDelete && (
        <ConfirmDeleteModal
          title="删除这条消费审批？"
          message="删除后将立即从你和所有人的页面消失，关联的投票与讨论也会一并清除，且无法恢复。"
          detail={pendingDelete.title || ''}
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
