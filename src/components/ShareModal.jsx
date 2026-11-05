import React, { useState } from 'react';
import { X, Copy, Check, Share2, Users } from 'lucide-react';

export default function ShareModal({ approval, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!approval) return null;

  const origin = window.location.origin;
  const shareUrl = `${origin}/approval/${approval.id}`;

  const shareCardText = `【🚨省思袋 · 消费冷静期求劝退】
我想买：${approval.title}（¥${approval.price}）
分类：${approval.category}
我的理由：${approval.reason}
${approval.expected_duration ? `预计使用时间：${approval.expected_duration}\n` : ''}${approval.alternative ? `替代方案：${approval.alternative}\n` : ''}快来帮我投票把关，别让我冲动败家！
👉 点击链接立即投票（免注册）：${shareUrl}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('请手动复制链接');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareCardText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (e) {
      alert('请手动复制文案');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-amber-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">邀请好友密友团投票</h3>
            <p className="text-xs text-slate-500">免注册，点开即投，冷静期到期自动结算</p>
          </div>
        </div>

        {/* 预览卡片 */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 rounded-2xl border border-amber-200/60 mb-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 px-2 py-0.5 bg-amber-200/70 rounded-md">
              {approval.mode === 'group' ? '🔒 密友审批模式' : '🌐 广场公开模式'}
            </span>
            <span className="text-sm font-black text-amber-600 font-mono">¥{approval.price}</span>
          </div>
          <div className="font-bold text-slate-900 mb-1 line-clamp-1">{approval.title}</div>
          <div className="text-xs text-slate-600 line-clamp-2 mb-2 italic">“{approval.reason}”</div>
          {approval.expected_duration && (
            <div className="text-[11px] text-amber-800 font-medium mb-1">
              ⏳ 预计使用时间：{approval.expected_duration}
            </div>
          )}
          <div className="text-[11px] text-amber-700/80 bg-white/80 p-2 rounded-xl border border-amber-100">
            🤝 转发到微信群、宿舍群或发给对象，让他们一键帮你拔草！
          </div>
        </div>

        {/* 链接复制 */}
        <div className="mb-4 text-left">
          <label className="text-xs font-medium text-slate-600 mb-1 block">专属审批链接：</label>
          <div className="flex items-center gap-2">
            <input 
              readOnly 
              value={shareUrl} 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-hidden"
            />
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
          </div>
        </div>

        {/* 一键复制社交口令 */}
        <button
          onClick={handleCopyText}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-2xl shadow-md glow-amber flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {copiedText ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          <span>{copiedText ? '已复制完整劝退口令到剪贴板！' : '复制群聊劝退口令（带商品与理由）'}</span>
        </button>
      </div>
    </div>
  );
}
