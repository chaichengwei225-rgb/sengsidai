import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { PlusCircle, User, Dices, Edit2, Check, Sparkles, PiggyBank } from 'lucide-react';
import { getCurrentUser, updateNickname, generateRandomNickname } from '../lib/user';

export default function Navbar({ onOpenConfig }) {
  const [location] = useLocation();
  const [user, setUser] = useState(getCurrentUser());
  const [editingNick, setEditingNick] = useState(false);
  const [tempNick, setTempNick] = useState(user.nickname);

  useEffect(() => {
    const handleUserUpdate = (e) => {
      setUser(e.detail);
      setTempNick(e.detail.nickname);
    };
    window.addEventListener('wallet_wait_user_updated', handleUserUpdate);
    return () => window.removeEventListener('wallet_wait_user_updated', handleUserUpdate);
  }, []);

  const handleSaveNickname = () => {
    if (tempNick.trim()) {
      const updated = updateNickname(tempNick);
      setUser(updated);
      setEditingNick(false);
    }
  };

  const handleDiceRandom = () => {
    const random = generateRandomNickname();
    setTempNick(random);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-2xs">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 overflow-hidden">
        {/* Logo 与品牌名 */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform shrink-0">
            👝
          </div>
          <div className="text-left shrink-0">
            <div className="font-black text-slate-900 tracking-tight flex items-center gap-1.5 text-base sm:text-lg whitespace-nowrap">
              <span>省思袋</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0 truncate max-w-[70px] sm:max-w-none">
                AI + 冷静期
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:block whitespace-nowrap">
              冲动消费集体审批平台
            </p>
          </div>
        </Link>

        {/* 桌面端导航（广场、好物、发起、战绩、我的 互不冲突） */}
        <nav className="hidden md:flex items-center gap-1 bg-amber-50/80 p-1 rounded-2xl border border-amber-200/60 shrink-0">
          <Link 
            href="/" 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              location === '/' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            广场审批流
          </Link>
          <Link 
            href="/good-items" 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              location === '/good-items' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            好物分享
          </Link>
          <Link 
            href="/create" 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              location === '/create' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
            发起审批
          </Link>
          <Link 
            href="/records" 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              location === '/records' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5 text-amber-600" />
            冷静战绩
          </Link>
          <Link 
            href="/my" 
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              location === '/my' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            我的画像
          </Link>
        </nav>

        {/* 右侧：匿名身份修改胶囊（去除非必要的状态标签，统一以页脚实时在线为准） */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative shrink-0">
            {!editingNick ? (
              <button
                onClick={() => setEditingNick(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium transition cursor-pointer max-w-[120px] sm:max-w-[160px]"
                title="点击快速修改匿名昵称"
              >
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate block font-semibold">{user.nickname}</span>
                <Edit2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-full p-0.5 shadow-md">
                <input
                  type="text"
                  value={tempNick}
                  onChange={(e) => setTempNick(e.target.value)}
                  placeholder="输入昵称"
                  className="w-20 sm:w-24 px-2 py-0.5 text-xs text-slate-800 focus:outline-hidden"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                />
                <button
                  onClick={handleDiceRandom}
                  className="p-1 hover:bg-amber-100 text-amber-600 rounded-full"
                  title="随机趣味昵称"
                >
                  <Dices className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSaveNickname}
                  className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full"
                  title="保存"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
