import React, { useState } from 'react';
import { X, Upload, Sparkles, Image, Check, Heart } from 'lucide-react';
import { getCurrentUser } from '../lib/user';
import { createGoodItem } from '../lib/goodItems';

export default function ShareGoodItemModal({ isOpen, onClose, onCreated }) {
  const currentUser = getCurrentUser();

  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [price, setPrice] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('图片大小请控制在 8MB 以内');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImagePreview(uploadEvent.target?.result || '');
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('请填写好物名称');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('请填写推荐理由（为什么觉得真香？）');
      return;
    }

    setSubmitting(true);

    const newItem = {
      id: 'g_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      title: title.trim(),
      reason: reason.trim(),
      price: price ? parseFloat(price) : null,
      image_url: imagePreview || null,
      creator_id: currentUser.id,
      creator_nickname: currentUser.nickname,
      creator_gender: currentUser.gender || '保密',
      creator_mbti: currentUser.mbti || 'INTJ',
      creator_zodiac: currentUser.zodiac || '天蝎座',
      created_at: new Date().toISOString(),
    };

    const res = await createGoodItem(newItem);
    setSubmitting(false);

    if (res.success) {
      if (onCreated) {
        onCreated(res.data || newItem);
      }
      onClose();
    } else {
      setErrorMsg('发布失败，请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-100 my-auto text-left max-h-[92vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
            🎁
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              分享我的宝藏好物
            </h3>
            <p className="text-xs text-slate-500">
              真金白银用出来的真香推荐 · 反向种草理性好货
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 好物名称 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              好物名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：人体工学电脑椅、陶瓷手冲保温杯、真无线降噪耳机..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          {/* 推荐理由 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              推荐理由（为什么真香？带来了什么实际价值？） <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="真诚聊聊它的实际使用体验，比如用了多久、帮自己省了什么或提升了什么效率..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition resize-none"
            />
          </div>

          {/* 参考价格 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              参考价格 (¥) <span className="text-slate-400 font-normal">(选填)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">¥</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="例如：199"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-7 pr-4 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* 图片上传与预览 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              好物实拍图片 <span className="text-slate-400 font-normal">(选填)</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-amber-200/80 bg-slate-50 max-h-56 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="好物实拍预览"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                  title="移除图片"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/40 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition">
                <Upload className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold text-slate-700">点击上传好物实拍图</span>
                <span className="text-[10px] text-slate-400">支持 JPG / PNG / WebP 格式</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          {/* 分享者标签提示 */}
          <div className="text-[11px] text-slate-500 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 flex items-center gap-1.5">
            <span>👤 将以你的身份</span>
            <span className="font-bold text-amber-900">@{currentUser.nickname}</span>
            <span>({currentUser.gender || '保密'} · {currentUser.mbti || '未选'} · {currentUser.zodiac || '未选'}) 发布</span>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-black text-xs rounded-2xl shadow-md glow-amber transition active:scale-98 disabled:opacity-50"
          >
            {submitting ? '正在发布好物...' : '立即分享到好物区 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
