import React, { useState, useEffect, useCallback } from 'react';
import { Router, Route, Switch } from 'wouter';

// GitHub Pages 部署在 /<repo>/ 子路径时，浏览器 location 会带上这个前缀，
// 而路由表是按 /approval/:id 这种根路径写的。
// 注意：wouter v3 的 <Router base> 只影响链接生成，不会剥离 useLocation 的路径，
// 所以这里自己实现 location hook 显式做剥离。
const ROUTER_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const useBaseLocation = () => {
  const [path, setPath] = useState(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname
  );
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to, opts = {}) => {
    const full = ROUTER_BASE + to;
    if (opts.replace) window.history.replaceState(null, '', full);
    else window.history.pushState(null, '', full);
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
  }, []);
  const stripped =
    ROUTER_BASE && path.startsWith(ROUTER_BASE)
      ? path.slice(ROUTER_BASE.length) || '/'
      : path;
  return [stripped, navigate];
};
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import ConfigModal from './components/ConfigModal';
import OnboardingModal from './components/OnboardingModal';
import SquarePage from './pages/SquarePage';
import CreatePage from './pages/CreatePage';
import DetailPage from './pages/DetailPage';
import MyPage from './pages/MyPage';
import RecordsPage from './pages/RecordsPage';
import GoodItemsPage from './pages/GoodItemsPage';
import { getCurrentUser, isProfileOnboarded } from './lib/user';

export default function App() {
  const [showConfig, setShowConfig] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [showOnboarding, setShowOnboarding] = useState(() => !isProfileOnboarded(getCurrentUser()));

  useEffect(() => {
    const handleUserUpdate = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
        if (isProfileOnboarded(e.detail)) {
          setShowOnboarding(false);
        }
      }
    };
    window.addEventListener('wallet_wait_user_updated', handleUserUpdate);
    return () => window.removeEventListener('wallet_wait_user_updated', handleUserUpdate);
  }, []);

  const handleOnboardingComplete = (updatedUser) => {
    setCurrentUser(updatedUser);
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col font-sans selection:bg-amber-200 selection:text-amber-900 text-slate-800">
      {/* 顶部导航 */}
      <Navbar onOpenConfig={() => setShowConfig(true)} />

      {/* 主体内容 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Router hook={useBaseLocation}>
        <Switch>
          <Route path="/">
            <SquarePage onOpenConfig={() => setShowConfig(true)} />
          </Route>
          <Route path="/create">
            <CreatePage />
          </Route>
          <Route path="/good-items">
            <GoodItemsPage />
          </Route>
          <Route path="/approval/:id">
            <DetailPage />
          </Route>
          <Route path="/records">
            <RecordsPage />
          </Route>
          <Route path="/my">
            <MyPage onOpenConfig={() => setShowConfig(true)} />
          </Route>
          <Route>
            <SquarePage onOpenConfig={() => setShowConfig(true)} />
          </Route>
        </Switch>
        </Router>
      </main>

      {/* 移动端底部悬浮 Dock */}
      <BottomNav />

      {/* 页脚说明 */}
      <footer className="border-t border-amber-100/60 py-6 text-center text-xs text-slate-400 bg-white/50 mb-16 md:mb-0">
        <div className="max-w-4xl mx-auto px-4 space-y-1.5">
          <p className="font-medium text-slate-500">
            省思袋 👝 · 专为年轻人打造的冲动消费审批平台
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
            <span>在线模式 · 实时数据同步</span>
            <span>•</span>
            <button 
              onClick={() => setShowConfig(true)}
              className="text-slate-400 hover:text-amber-700 underline transition cursor-pointer"
            >
              ⚙️ 数据库配置与 SQL
            </button>
          </div>
        </div>
      </footer>

      {/* 首次访问强制资料完善弹窗（性别、MBTI、星座） */}
      {showOnboarding && (
        <OnboardingModal user={currentUser} onComplete={handleOnboardingComplete} />
      )}

      {/* 数据库配置弹窗 */}
      {showConfig && (
        <ConfigModal onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
