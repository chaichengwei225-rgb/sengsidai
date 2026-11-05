import React from 'react';
import { Link, useLocation } from 'wouter';
import { Compass, Plus, Sparkles, PiggyBank, User } from 'lucide-react';

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999999] pointer-events-auto bg-white/95 backdrop-blur-md border-t border-amber-100 shadow-lg px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* 1. 广场 */}
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center gap-0.5 transition py-1 ${
            location === '/' ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap">广场</span>
        </Link>

        {/* 2. 好物 */}
        <Link 
          href="/good-items" 
          className={`flex flex-col items-center justify-center gap-0.5 transition py-1 ${
            location === '/good-items' ? 'text-teal-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap">好物</span>
        </Link>

        {/* 3. 核心发起大按钮 —— 严格位于第 3 列中心 (50% 完美对称) */}
        <div className="flex items-center justify-center">
          <Link 
            href="/create" 
            aria-label="发起消费审批"
            className="relative -top-3.5 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-lg glow-amber transform active:scale-95 transition"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </Link>
        </div>

        {/* 4. 战绩（独立路由 /records） */}
        <Link 
          href="/records" 
          className={`flex flex-col items-center justify-center gap-0.5 transition py-1 ${
            location === '/records' ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <PiggyBank className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap">战绩</span>
        </Link>

        {/* 5. 我的 */}
        <Link 
          href="/my" 
          className={`flex flex-col items-center justify-center gap-0.5 transition py-1 ${
            location === '/my' ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap">我的</span>
        </Link>
      </div>
    </div>
  );
}
