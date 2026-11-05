import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

/**
 * 通用删除确认弹窗
 * 删除是不可逆操作，统一用二次确认拦一道，避免误触。
 */
export default function ConfirmDeleteModal({
  title = '确定要删除吗？',
  message = '删除后将立即从你和所有人的页面上消失，且无法恢复。',
  detail = '',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">此操作不可撤销</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-2">{message}</p>
        {detail && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-4 text-xs text-slate-700 break-words">
            {detail}
          </div>
        )}

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer"
          >
            再想想
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? '删除中...' : '确认删除'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
