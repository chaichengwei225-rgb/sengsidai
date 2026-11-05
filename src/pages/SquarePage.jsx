import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Clock, Flame, RefreshCw, Plus } from 'lucide-react';
import { Link } from 'wouter';
import ApprovalCard from '../components/ApprovalCard';
import ShareModal from '../components/ShareModal';
import { CATEGORIES } from '../lib/constants';
import { getSupabase } from '../lib/supabase';
import { autoSettleApproval } from '../lib/settle';
import { getCurrentUser } from '../lib/user';
import { syncFromCloud, getCachedApprovals, getCachedVotes, deleteApproval } from '../lib/cloudStore';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function SquarePage({ onOpenConfig }) {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [approvals, setApprovals] = useState(getCachedApprovals());
  const [votes, setVotes] = useState(getCachedVotes());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'hottest' | 'urgent'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'finished'
  const [loading, setLoading] = useState(false);
  const [sharingApproval, setSharingApproval] = useState(null);
  const [newIncomingCount, setNewIncomingCount] = useState(0);
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

  useEffect(() => {
    const handleUserUpdate = (e) => setCurrentUser(e.detail);
    window.addEventListener('wallet_wait_user_updated', handleUserUpdate);
    return () => window.removeEventListener('wallet_wait_user_updated', handleUserUpdate);
  }, []);

  // 监听全网云端数据更新事件
  useEffect(() => {
    const handleDataUpdate = (e) => {
      if (e.detail) {
        if (e.detail.approvals) setApprovals(e.detail.approvals);
        if (e.detail.votes) setVotes(e.detail.votes);
      }
    };
    window.addEventListener('sengsidai_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sengsidai_data_updated', handleDataUpdate);
  }, []);

  // 初始化与刷新数据
  const fetchData = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const data = await syncFromCloud();
      if (data) {
        if (data.approvals) setApprovals(data.approvals);
        if (data.votes) setVotes(data.votes);

        // 后台检查并触发自动结算
        (data.approvals || []).forEach(app => {
          if (app.status === 'pending') {
            const relatedVotes = (data.votes || []).filter(v => v.approval_id === app.id);
            autoSettleApproval(app, relatedVotes);
          }
        });
      }
    } catch (e) {
      console.warn('Sync cloud data failed:', e);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 每 8 秒后台轻量静默轮询一次云端，保持全网数据同步
    const timer = setInterval(() => {
      fetchData(false);
    }, 8000);

    // 开启 Supabase Realtime 实时订阅（若已配置）
    const client = getSupabase();
    let channel = null;
    if (client) {
      channel = client
        .channel('square_realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'approvals' },
          (payload) => {
            setApprovals((prev) => [payload.new, ...prev.filter(a => a.id !== payload.new.id)]);
            setNewIncomingCount(c => c + 1);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'approvals' },
          (payload) => {
            setApprovals((prev) =>
              prev.map(app => (app.id === payload.new.id ? payload.new : app))
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'votes' },
          (payload) => {
            setVotes((prev) => {
              const exists = prev.some(v => v.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      if (client && channel) client.removeChannel(channel);
    };
  }, []);

  // 个人累计拦截金额计算：只统计当前用户自己发布的、最终结果为“不买”（rejected）的单子
  const mySavedMoney = useMemo(() => {
    return approvals
      .filter(a => a.creator_id === currentUser.id && a.status === 'rejected')
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [approvals, currentUser.id]);

  // 分类与排序过滤
  const filteredApprovals = useMemo(() => {
    return approvals
      .filter(app => {
        if (selectedCategory !== 'all' && app.category !== selectedCategory) return false;
        if (statusFilter === 'pending' && app.status !== 'pending') return false;
        if (statusFilter === 'finished' && app.status === 'pending') return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'hottest') {
          const aCount = votes.filter(v => v.approval_id === a.id).length;
          const bCount = votes.filter(v => v.approval_id === b.id).length;
          return bCount - aCount;
        }
        if (sortBy === 'urgent') {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return 0;
      });
  }, [approvals, votes, selectedCategory, statusFilter, sortBy]);

  return (
    <div className="space-y-6 pb-28 md:pb-16 animate-fadeIn">
      {/* 顶部醒目 Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-amber text-left">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span>省思袋 · 冷静期克制冲动</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
            买前省思，听听网友与 AI 建议 ✋
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm font-medium mb-4 leading-relaxed">
            给每笔冲动消费设置冷静期。AI建议与清醒网友共同把关，不买立省 100%！
          </p>

          <div className="inline-flex items-center gap-3 bg-black/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex-wrap">
            <div className="text-left">
              <div className="text-[11px] text-yellow-100 font-medium">为你累计拦截冲动消费：</div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                ¥{mySavedMoney.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20 hidden sm:block"></div>
            <Link
              href="/create"
              className="px-4 py-2 bg-white text-amber-900 hover:bg-amber-50 font-black text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>我也发一单</span>
            </Link>
          </div>
        </div>

        {/* 装饰大Emoji背景 */}
        <div className="absolute -right-4 -bottom-6 text-8xl sm:text-9xl opacity-20 select-none pointer-events-none">
          👛
        </div>
      </div>

      {/* 新审批推送轻提示 */}
      {newIncomingCount > 0 && (
        <div 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setNewIncomingCount(0);
          }}
          className="cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg mx-auto w-fit flex items-center gap-2 animate-bounce"
        >
          <Sparkles className="w-4 h-4" />
          <span>刚刚有 {newIncomingCount} 笔新消费审批发起！点击置顶查看</span>
        </div>
      )}

      {/* 筛选与分类导航 */}
      <div className="space-y-3">
        {/* 分类滑块（保证最后一项完全可见，内边距充足） */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-4 -mx-4 sm:mx-0 sm:px-0 no-scrollbar scroll-smooth">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition active:scale-95 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-xs glow-amber'
                  : 'bg-white text-slate-600 hover:bg-amber-50 border border-amber-100'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
          {/* 保证在手机端滑动到最右边时有充足边距，不被边缘切断 */}
          <div className="w-3 shrink-0 sm:hidden" aria-hidden="true"></div>
        </div>

        {/* 状态与排序条 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-amber-100 shadow-2xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'pending' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🕒 冷静中
            </button>
            <button
              onClick={() => setStatusFilter('finished')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                statusFilter === 'finished' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ✨ 已结算
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortBy('newest')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                sortBy === 'newest' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>最新</span>
            </button>
            <button
              onClick={() => setSortBy('hottest')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                sortBy === 'hottest' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>最热</span>
            </button>
          </div>
        </div>
      </div>

      {/* 审批单列表 */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 animate-fadeIn">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-medium">正在拉取全网实时审批单...</p>
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-amber-100 text-center p-8 space-y-3 animate-fadeIn">
          <div className="text-5xl">🍃</div>
          <h3 className="text-base font-bold text-slate-800">暂无该分类的审批单</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            大家都在理智克制！或者你心里正有一件纠结想买的东西？快来发第一单让大家帮你把关吧。
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>发起消费审批</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApprovals.map(app => (
            <ApprovalCard
              key={app.id}
              approval={app}
              votes={votes.filter(v => v.approval_id === app.id)}
              onShare={(a) => setSharingApproval(a)}
              isOwner={app.creator_id === currentUser.id}
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
