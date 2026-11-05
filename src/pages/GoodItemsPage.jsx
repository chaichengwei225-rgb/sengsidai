import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Image as ImageIcon, Search, Tag, User, Clock, Heart, Trash2 } from 'lucide-react';
import ShareGoodItemModal from '../components/ShareGoodItemModal';
import { fetchGoodItems, getLocalGoodItems, removeGoodItem } from '../lib/goodItems';
import { getCurrentUser } from '../lib/user';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

// 好物卡片图片组件（固定比例，真实图片优先，样式统一）
function GoodItemImage({ src, alt }) {
  const [hasError, setHasError] = useState(false);

  // 针对办公椅的真实图片保障
  const isChair = alt && alt.includes('办公椅');
  let finalSrc = src;
  if (isChair && (!src || src.includes('1580481077197') || hasError)) {
    finalSrc = '/office-chair.jpg';
  }

  if (hasError && !isChair) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 mb-3.5 select-none">
        <ImageIcon className="w-8 h-8 mb-1.5 opacity-50 text-slate-400" />
        <span className="text-xs font-bold text-slate-600">{alt || '好物实拍'}</span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-3.5 relative">
      <img
        src={finalSrc}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
        loading="lazy"
      />
    </div>
  );
}

export default function GoodItemsPage() {
  // 采用 SWR 模式：初始直接从本地缓存秒开渲染，绝不阻塞用户 25 秒
  const [items, setItems] = useState(() => {
    const local = getLocalGoodItems();
    return local && local.length > 0 ? local : [];
  });
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser] = useState(() => getCurrentUser());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 删除本人发布的好物分享（二次确认后执行）
  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const id = pendingDelete.id;
    setDeleting(true);
    const res = await removeGoodItem(id, currentUser.id);
    setDeleting(false);
    setPendingDelete(null);
    if (!res.success) {
      window.alert(res.error);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    if (!res.cloudSynced) {
      window.alert(res.warning || '已从本机删除，但云端同步暂时失败，其他设备可能仍能看到，请稍后重试。');
    }
  };

  const loadData = async () => {
    try {
      // 3.5 秒超时熔断，后台静默拉取云端最新数据
      const fetchPromise = fetchGoodItems();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (data && data.length > 0) {
        setItems(data);
      }
    } catch (e) {
      console.warn('GoodItems load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDataUpdate = (e) => {
      if (e.detail && e.detail.goodItems && e.detail.goodItems.length > 0) {
        setItems(e.detail.goodItems);
      }
    };
    window.addEventListener('sengsidai_data_updated', handleDataUpdate);

    const timer = setInterval(() => {
      loadData();
    }, 12000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('sengsidai_data_updated', handleDataUpdate);
    };
  }, []);

  const handleCreated = (newItem) => {
    setItems((prev) => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.reason && item.reason.toLowerCase().includes(term)) ||
      (item.creator_nickname && item.creator_nickname.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 pb-28 md:pb-16 text-left animate-fadeIn">
      {/* 顶部醒目 Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-emerald text-left">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span>省思袋 · 宝藏好物专区</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
            真金白银用过的真香好物 🎁
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-4 leading-relaxed">
            对抗冲动消费不是不花钱，而是把钱花在刀刃上。看看同频网友亲测不踩雷、高使用率的宝藏！
          </p>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2.5 bg-white text-teal-900 hover:bg-emerald-50 font-black text-xs rounded-xl shadow-xs transition active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>分享我的宝藏好物</span>
          </button>
        </div>

        {/* 装饰水印 */}
        <div className="absolute -right-4 -bottom-6 text-8xl sm:text-9xl opacity-20 select-none pointer-events-none">
          🎁
        </div>
      </div>

      {/* 搜索与工具条 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索好物名称、推荐理由、分享者..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-amber-100 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-teal-300 shadow-2xs"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          {loading && items.length === 0 ? (
            <span className="text-amber-600 animate-pulse">正在同步好物库...</span>
          ) : (
            `共收录 ${filteredItems.length} 件好物`
          )}
        </div>
      </div>

      {/* 好物卡片列表 */}
      {loading && items.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-medium">正在拉取好物库...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-amber-100 text-center p-8 space-y-3">
          <div className="text-5xl">🛍️</div>
          <h3 className="text-base font-bold text-slate-800">暂无相关好物</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            还没有人分享类似的好物。你手头有什么买了绝对不后悔的宝藏吗？快来分享第一件！
          </p>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>分享好物</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-amber-100/80 shadow-xs hover:shadow-md transition flex flex-col justify-between text-left group"
            >
              <div>
                {/* 图片固定比例展示，加载失败自动优雅降级，绝不出现破图问号框 */}
                <GoodItemImage src={item.image_url} alt={item.title} />

                {/* 标题与价格 */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition break-words line-clamp-2 leading-snug flex-1">
                    {item.title}
                  </h3>
                  {item.price !== null && item.price !== undefined && (
                    <span className="shrink-0 text-sm font-black text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 whitespace-nowrap ml-1">
                      ¥{item.price}
                    </span>
                  )}
                </div>

                {/* 推荐理由 */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed mb-3">
                  <span className="font-bold text-teal-800">“真香理由”：</span>
                  <p className="mt-0.5 italic">{item.reason}</p>
                </div>
              </div>

              {/* 分享者与标签 */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-700">@{item.creator_nickname}</span>
                  {(item.creator_mbti || item.creator_zodiac) && (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[10px] font-semibold border border-amber-200/60">
                      {item.creator_gender ? `${item.creator_gender} · ` : ''}
                      {item.creator_mbti || ''} {item.creator_zodiac || ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(item.created_at).toLocaleDateString('zh-CN')}
                  </span>
                  {item.creator_id === currentUser.id && (
                    <button
                      onClick={() => setPendingDelete(item)}
                      className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded-lg transition cursor-pointer"
                      title="删除我分享的好物"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分享弹窗 */}
      <ShareGoodItemModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onCreated={handleCreated}
      />

      {/* 删除确认 */}
      {pendingDelete && (
        <ConfirmDeleteModal
          title="删除这件好物分享？"
          message="删除后将立即从好物库和所有人的页面消失，且无法恢复。"
          detail={pendingDelete.title || ''}
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
