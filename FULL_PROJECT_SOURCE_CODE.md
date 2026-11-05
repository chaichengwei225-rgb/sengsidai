# 省思袋 (Wallet-Wait) 完整项目转录源代码

本项目为冲动消费集体审批平台的前后端一体化完整源码。

## package.json

```json
{
  "name": "wallet-wait",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@netlify/blobs": "^11.1.7",
    "@supabase/supabase-js": "^2.118.0",
    "@tailwindcss/vite": "^4.3.3",
    "canvas-confetti": "^1.9.4",
    "lucide-react": "^1.61.0",
    "qrcode": "^1.5.4",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "tailwindcss": "^4.3.3",
    "wouter": "^3.13.0"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.2",
    "oxlint": "^1.88.0",
    "vite": "^8.3.4"
  }
}
```

---

## vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    proxy: {
      // 只代理 AI 推理接口，不代理 /api/sync-data：
      // 避免本地开发时的写操作污染线上 Netlify Blob 真实数据。
      // npm run dev 会复用已部署的线上 Function；若要调试本地 netlify/functions，
      // 请改用 `npx netlify dev`（默认 8888 端口），并把 target 改成 http://localhost:8888。
      '/api/ai-recommend': {
        target: 'https://sengsidai.netlify.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

---

## index.html

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👝</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>省思袋 👝 - 消费冷静期审批平台</title>
    <meta name="description" content="省思袋：帮年轻人对抗冲动消费的网站。用户把想买的东西提交为一笔消费审批，由网友或朋友投票决定买还是不买，核心是给冲动消费加一个 24 小时冷静期。" />
    <style>
      /* 强制彻底隐藏 Netlify HUD 与第三方注入徽章，避免遮挡移动端底部导航 */
      #nl-badge-frame,
      #nl-hud-frame,
      iframe[id^="nl-"],
      iframe[src*="netlify"],
      iframe[srcdoc*="Powered by"],
      [data-netlify-site-id],
      .netlify-badge,
      #netlify-badge {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        z-index: -9999 !important;
      }
    </style>
    <script>
      (function() {
        function removeBadge() {
          var frames = document.querySelectorAll('#nl-badge-frame, #nl-hud-frame, iframe[id^="nl-"]');
          for (var i = 0; i < frames.length; i++) {
            frames[i].remove();
          }
          var hudScript = document.querySelector('script[src*="hud"], script[data-nf-variant]');
          if (hudScript) {
            delete hudScript.dataset.nfVariant;
            hudScript.remove();
          }
        }
        removeBadge();
        if (typeof MutationObserver !== 'undefined') {
          var obs = new MutationObserver(removeBadge);
          obs.observe(document.documentElement, { childList: true, subtree: true });
        }
        window.addEventListener('DOMContentLoaded', removeBadge);
        window.addEventListener('load', removeBadge);
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## src/main.jsx

```javascript
import React, { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('wallet_wait_user_profile');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#faf8f5] font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-amber-200 text-center">
            <div className="text-4xl mb-3">👝</div>
            <h2 className="text-lg font-black text-slate-800 mb-2">省思袋页面加载遇到了一点小问题</h2>
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-4 font-mono break-all text-left">
              {this.state.error?.message || '运行时遇到未知错误'}
            </p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                刷新页面
              </button>
              <button 
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition cursor-pointer"
              >
                清空本地用户缓存并刷新
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

---

## src/App.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
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
```

---

## src/index.css

```css
@import "tailwindcss";

@layer base {
  body {
    @apply bg-[#faf8f5] text-slate-800 antialiased font-sans selection:bg-amber-200 selection:text-amber-900;
    min-height: 100vh;
  }
}

/* 动效过渡时长与 GPU 硬件加速类 */
.gpu-transition {
  transition-property: transform, opacity;
  transition-duration: 250ms;
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
  will-change: transform, opacity;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 250ms cubic-bezier(0, 0, 0.2, 1) forwards;
}

/* 进度条平滑增长（CSS transform/width 硬件加速） */
.progress-bar-transition {
  transition: width 300ms cubic-bezier(0, 0, 0.2, 1);
}

/* 柔光阴影 */
.glow-amber {
  box-shadow: 0 4px 20px -2px rgba(245, 158, 11, 0.25);
}

.glow-emerald {
  box-shadow: 0 4px 20px -2px rgba(16, 185, 129, 0.25);
}

.glow-rose {
  box-shadow: 0 4px 20px -2px rgba(244, 63, 94, 0.25);
}

/* 遵循 prefers-reduced-motion: 减动效用户关闭非必要动画 */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 隐藏移动端滚动条 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 彻底隐藏 Netlify HUD 与第三方平台侵占徽章，确保右下角底部导航永远可点击 */
#nl-badge-frame,
#nl-hud-frame,
iframe[id^="nl-"],
iframe[src*="netlify"],
iframe[srcdoc*="Powered by"],
[data-netlify-site-id],
.netlify-badge,
#netlify-badge {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  z-index: -9999 !important;
}
```

---

## src/lib/constants.js

```javascript
// 分类列表
export const CATEGORIES = [
  { id: 'all', name: '全部', icon: '✨' },
  { id: '穿搭', name: '穿搭', icon: '👗' },
  { id: '数码', name: '数码', icon: '💻' },
  { id: '游戏', name: '游戏', icon: '🎮' },
  { id: '运动', name: '运动', icon: '🏃' },
  { id: '美妆', name: '美妆', icon: '💄' },
  { id: '家居', name: '家居', icon: '🛋️' },
  { id: '其他', name: '其他', icon: '📦' },
];

// 性别选项
export const GENDER_OPTIONS = ['男', '女', '其他 / 保密'];

// MBTI 16型人格选项与四大族群
export const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

export const MBTI_GROUPS = [
  { label: '全部', types: MBTI_OPTIONS },
  { label: '分析家 (NT)', types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  { label: '外交家 (NF)', types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  { label: '守护者 (SJ)', types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  { label: '探险家 (SP)', types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
];

// 十二星座选项
export const ZODIAC_OPTIONS = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座'
];

// 预计使用时长选项
export const EXPECTED_DURATIONS = [
  '不到1个月',
  '1-3个月',
  '3-6个月',
  '6-12个月',
  '1年以上',
];

// 随机昵称形容词与名词
export const NICKNAME_ADJECTIVES = [
  '清醒的', '极度克制的', '月光急救员', '理性理财', '反消费主义', 
  '冷静观望', '断舍离狂魔', '省钱专家', '清心寡欲', '精打细算',
  '捂紧钱包', '拔草达人', '拒绝内耗', '等等党胜利', '冷静24小时'
];

export const NICKNAME_NOUNS = [
  '打工人', '脆皮大学生', '野生哲学家', '仓鼠党', '存钱罐', 
  '干饭人', '冲浪选手', '理财喵', '冷静汪', '星际旅人'
];

// 扎心但治愈的省钱文案
export const ROAST_MESSAGES = [
  "不买立省 100%！这笔钱拿去吃大餐不香吗？",
  "网友的眼睛是雪亮的，冲动是魔鬼，成功守住钱包！",
  "少买一件吃灰闲置，距离财务自由又近了一步！",
  "冷静期战胜消费主义！你的钱包对你发出了感激的微笑 😊",
  "别让明天的你为今天的冲动买单，省下就是赚到！",
  "恭喜！成功避开智商税，又少打工了三天！",
  "买前生产力，买后爱奇艺。感谢各位网友无情打醒！"
];

// 快捷投票劝退理由
export const QUICK_REASONS = {
  reject: [
    "家里明明有替代品，买回来肯定吃灰！",
    "不买立省100%，这钱留着存起来吃火锅香多了！",
    "消费主义陷阱！别被商家营销话术洗脑了！",
    "溢价太严重了，等两个月闲鱼半价收一个！",
    "买前生产力，买后吃灰，听劝，别买！"
  ],
  approve: [
    "确实是生产力刚需，能带来实际价值，支持冲！",
    "千金难买心头好，价格合理，值得奖励自己！",
    "替代方案成本更高，算过账来这个最划算，准了！",
    "早买早享受，人生苦短，支持合理悦己消费！"
  ],
  spectate: [
    "吃瓜看戏，先看前面的课代表怎么说",
    "价格略微纠结，蹲一个后续体验分享",
    "这题超纲了，把决定权交给更有经验的网友"
  ]
};
```

---

## src/lib/user.js

```javascript
import { NICKNAME_ADJECTIVES, NICKNAME_NOUNS } from './constants';

const USER_STORAGE_KEY = 'wallet_wait_user_profile';

// 生成随机匿名昵称
export function generateRandomNickname() {
  const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}_${num}`;
}

// 生成随机用户唯一 ID
export function generateUserId() {
  return 'u_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// 检查用户是否已完成首次性别、MBTI、星座设置
export function isProfileOnboarded(user) {
  return Boolean(user && user.gender && user.mbti && user.zodiac);
}

// 获取或初始化当前用户身份
export function getCurrentUser() {
  try {
    const cached = localStorage.getItem(USER_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id && parsed.nickname) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse user profile from localStorage', e);
  }

  // 首次生成
  const newUser = {
    id: generateUserId(),
    nickname: generateRandomNickname(),
    gender: '',
    mbti: '',
    zodiac: '',
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  } catch (e) {
    console.error('Failed to save user profile', e);
  }

  return newUser;
}

// 更新当前用户资料（昵称、性别、MBTI、星座）
export function updateUserProfile(updates) {
  const current = getCurrentUser();
  const updated = {
    ...current,
    ...updates,
    nickname: updates.nickname !== undefined 
      ? ((updates.nickname || '').trim() || current.nickname || generateRandomNickname()) 
      : current.nickname,
  };
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('wallet_wait_user_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to update user profile', e);
  }
  return updated;
}

// 更新当前用户昵称（兼容旧调用）
export function updateNickname(newNickname) {
  return updateUserProfile({ nickname: newNickname });
}

// 重置用户身份画像
export function resetUserProfile() {
  const newUser = {
    id: generateUserId(),
    nickname: generateRandomNickname(),
    gender: '保密',
    mbti: 'INTJ',
    zodiac: '天蝎座',
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    window.dispatchEvent(new CustomEvent('wallet_wait_user_updated', { detail: newUser }));
  } catch (e) {
    console.error('Failed to reset user profile', e);
  }
  return newUser;
}
```

---

## src/lib/settle.js

```javascript
import { getSupabase } from './supabase';

/**
 * 计算审批单的票数分解与折算
 * @param {Object} approval 审批单
 * @param {Array} votes 投票列表
 * @returns {Object} 票数详细统计
 */
export function calculateApprovalTally(approval, votes = []) {
  if (!approval) {
    return {
      humanApprove: 0,
      humanReject: 0,
      humanSpectate: 0,
      aiWeight: 0,
      aiVotes: 0,
      aiApprove: 0,
      aiReject: 0,
      finalApprove: 0,
      finalReject: 0,
      requiredVotes: 15,
      summaryText: '',
    };
  }

  // 1. 人类有效票
  const humanApprove = votes.filter(v => v.type === 'approve').length;
  const humanReject = votes.filter(v => v.type === 'reject').length;
  const humanSpectate = votes.filter(v => v.type === 'spectate').length;

  // 2. 需要表态人数（兼容 required_votes 与 max_voters）
  const requiredVotes = approval.required_votes || approval.max_voters || 15;

  // 3. AI 权重与折算票数
  const aiWeight = typeof approval.ai_weight === 'number' ? approval.ai_weight : 20;
  
  // AI 票数 = 四舍五入（权重% × 需要表态人数）
  const rawAiVotes = Math.round((aiWeight / 100) * requiredVotes);
  const aiVotes = aiWeight > 0 ? rawAiVotes : 0;

  // 4. AI 票计入规则：AI权重直接算入总票数，绝无弃权
  let aiApprove = 0;
  let aiReject = 0;

  if (aiVotes > 0) {
    if (approval.ai_verdict === 'buy') {
      aiApprove = aiVotes;
    } else {
      // 凡是 skip 或未决，AI 均坚定站在省思袋反冲动立场投反对票
      aiReject = aiVotes;
    }
  }

  // 5. 最终总票数（人类有效票 + AI 折算票）
  const finalApprove = humanApprove + aiApprove;
  const finalReject = humanReject + aiReject;

  // 6. 生成明细构成文本
  // 例如：“人类支持 3:反对 2 + AI反对 2票 → 综合支持 3:综合反对 4”
  let aiPart = '';
  if (aiVotes > 0) {
    if (approval.ai_verdict === 'buy') {
      aiPart = ` + AI支持 ${aiVotes} 票`;
    } else {
      aiPart = ` + AI反对 ${aiVotes} 票`;
    }
  } else {
    aiPart = ' (AI 权重 0%)';
  }

  const summaryText = `人类支持 ${humanApprove} : 反对 ${humanReject}${aiPart} → 综合支持 ${finalApprove} : 综合反对 ${finalReject}`;

  return {
    humanApprove,
    humanReject,
    humanSpectate,
    aiWeight,
    aiVotes,
    aiApprove,
    aiReject,
    finalApprove,
    finalReject,
    requiredVotes,
    summaryText,
  };
}

/**
 * 检查审批单是否满足结算条件
 * @param {Object} approval 审批单
 * @param {Array} votes 投票列表
 * @returns {{ shouldSettle: boolean, result: 'approved' | 'rejected' | null, tally: Object }}
 */
export function checkSettlement(approval, votes = []) {
  if (!approval || approval.status !== 'pending') {
    const tally = calculateApprovalTally(approval, votes);
    return { shouldSettle: false, result: approval ? approval.status : null, tally };
  }

  const tally = calculateApprovalTally(approval, votes);
  const humanDecisiveCount = tally.humanApprove + tally.humanReject;

  // 条件1：人类有效投票达到设定人数
  const isReachVotersLimit = humanDecisiveCount >= tally.requiredVotes;

  // 条件2：冷静期到期
  const isExpired = new Date(approval.deadline).getTime() <= Date.now();

  if (isReachVotersLimit || isExpired) {
    // 判定：得票多者胜，平票判不买（驳回）
    const result = tally.finalApprove > tally.finalReject ? 'approved' : 'rejected';
    return { shouldSettle: true, result, tally };
  }

  return { shouldSettle: false, result: null, tally };
}

/**
 * 如果需要结算，则更新数据库状态并广播
 * @param {Object} approval 审批单
 * @param {Array} votes 投票列表
 */
export async function autoSettleApproval(approval, votes = []) {
  const { shouldSettle, result } = checkSettlement(approval, votes);
  if (!shouldSettle || !result) return null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .update({ status: result })
        .eq('id', approval.id)
        .select()
        .single();

      if (error) {
        console.error('Error auto-settling approval in supabase:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Failed to trigger auto settle:', e);
    }
  }

  return { ...approval, status: result };
}
```

---

## src/lib/cloudStore.js

```javascript
import { getSupabase, isSupabaseConfigured } from './supabase';
import { INITIAL_SEED_APPROVALS, INITIAL_SEED_VOTES } from './seedFallback';
import { INITIAL_GOOD_ITEMS } from './goodItemsFallback';

const STORAGE_KEYS = {
  APPROVALS: 'sengsidai_cloud_approvals',
  VOTES: 'sengsidai_cloud_votes',
  COMMENTS: 'sengsidai_cloud_comments',
  GOOD_ITEMS: 'sengsidai_cloud_good_items',
};

const DELETED_KEY = 'sengsidai_deleted_ids';

// 删除墓碑：云端同步偶尔失败时，防止已删内容被下一次全量拉取「复活」
function getDeletedIds() {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}

function markDeleted(id) {
  try {
    if (typeof localStorage === 'undefined' || !id) return;
    const ids = getDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify([...ids].slice(-500)));
  } catch (e) {
    console.warn('[CloudStore] mark deleted failed:', e);
  }
}

function filterDeleted(list, deleted, parentKey) {
  if (!Array.isArray(list)) return list;
  return list.filter(item =>
    !deleted.has(item.id) && (!parentKey || !deleted.has(item[parentKey]))
  );
}

// 内存单例缓存
let localCache = {
  approvals: null,
  votes: null,
  comments: null,
  goodItems: null,
};

function getLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[CloudStore] parse local failed:', e);
  }
  return fallback;
}

function setLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[CloudStore] set local failed:', e);
  }
}

// 初始化本地缓存
function initCache() {
  if (!localCache.approvals) {
    localCache.approvals = getLocal(STORAGE_KEYS.APPROVALS, INITIAL_SEED_APPROVALS);
  }
  if (!localCache.votes) {
    localCache.votes = getLocal(STORAGE_KEYS.VOTES, INITIAL_SEED_VOTES);
  }
  if (!localCache.comments) {
    localCache.comments = getLocal(STORAGE_KEYS.COMMENTS, []);
  }
  if (!localCache.goodItems) {
    localCache.goodItems = getLocal(STORAGE_KEYS.GOOD_ITEMS, INITIAL_GOOD_ITEMS);
  }
}

// 分发数据变动事件通知页面重绘
function notifyUpdate() {
  window.dispatchEvent(new CustomEvent('sengsidai_data_updated', {
    detail: { ...localCache }
  }));
}

/**
 * 从云端拉取最新数据（全网同步）
 */
export async function syncFromCloud() {
  initCache();
  const deleted = getDeletedIds();

  // 如果配置了 Supabase，走 Supabase 流程
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        const [{ data: apps }, { data: vts }, { data: cmts }, { data: gds }] = await Promise.all([
          client.from('approvals').select('*').order('created_at', { ascending: false }),
          client.from('votes').select('*'),
          client.from('comments').select('*').order('created_at', { ascending: true }),
          client.from('good_items').select('*').order('created_at', { ascending: false }),
        ]);
        if (apps) {
          localCache.approvals = filterDeleted(apps, deleted);
          setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
        }
        if (vts) {
          localCache.votes = filterDeleted(vts, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.VOTES, localCache.votes);
        }
        if (cmts) {
          localCache.comments = filterDeleted(cmts, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
        }
        if (gds && gds.length > 0) {
          localCache.goodItems = filterDeleted(gds, deleted);
          setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
        }
        notifyUpdate();
        return localCache;
      } catch (e) {
        console.warn('[CloudStore] Supabase fetch error, fallback to cloud API:', e);
      }
    }
  }

  // 走无需配置的云端共享数据池 (/api/sync-data)
  try {
    const res = await fetch('/api/sync-data', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const result = await res.json();
      if (result && result.success && result.data) {
        const { approvals, votes, comments, goodItems } = result.data;
        if (Array.isArray(approvals)) {
          localCache.approvals = filterDeleted(approvals, deleted);
          setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
        }
        if (Array.isArray(votes)) {
          localCache.votes = filterDeleted(votes, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.VOTES, localCache.votes);
        }
        if (Array.isArray(comments)) {
          localCache.comments = filterDeleted(comments, deleted, 'approval_id');
          setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
        }
        if (Array.isArray(goodItems)) {
          localCache.goodItems = filterDeleted(goodItems, deleted);
          setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
        }
        notifyUpdate();
        return localCache;
      }
    }
  } catch (err) {
    console.warn('[CloudStore] fetch /api/sync-data failed, using local cache:', err);
  }

  return localCache;
}

/**
 * 创建新审批
 */
export async function createApproval(approvalData) {
  initCache();
  const newApp = {
    ...approvalData,
    id: approvalData.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: approvalData.created_at || new Date().toISOString(),
    status: approvalData.status || 'pending',
  };

  // 立即写入本地缓存，确保当前用户体验极速顺畅
  localCache.approvals = [newApp, ...localCache.approvals.filter(a => a.id !== newApp.id)];
  setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  notifyUpdate();

  // 尝试同步到 Supabase
  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        const { data, error } = await client.from('approvals').insert([newApp]).select().single();
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('[CloudStore] Supabase insert failed, fallback to cloud API:', e);
      }
    }
  }

  // 同步到公共云端共享存储 (/api/sync-data)
  try {
    const res = await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_approval', payload: newApp })
    });
    if (res.ok) {
      const resJson = await res.json();
      if (resJson && resJson.approval) {
        return resJson.approval;
      }
    }
  } catch (err) {
    console.warn('[CloudStore] Sync to /api/sync-data error:', err);
  }

  return newApp;
}

/**
 * 更新审批状态
 */
export async function updateApproval(approvalData) {
  initCache();
  localCache.approvals = localCache.approvals.map(a => a.id === approvalData.id ? { ...a, ...approvalData } : a);
  setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('approvals').update(approvalData).eq('id', approvalData.id);
      } catch (e) {
        console.warn('[CloudStore] Supabase update failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_approval', payload: approvalData })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync update failed:', e);
  }
}

/**
 * 提交投票
 */
export async function submitVote(voteData, settleApproval = null) {
  initCache();
  const newVote = {
    ...voteData,
    id: voteData.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: voteData.created_at || new Date().toISOString(),
  };

  localCache.votes = [
    newVote,
    ...localCache.votes.filter(v => !(v.approval_id === newVote.approval_id && v.voter_id === newVote.voter_id))
  ];
  setLocal(STORAGE_KEYS.VOTES, localCache.votes);

  if (settleApproval) {
    localCache.approvals = localCache.approvals.map(a => a.id === settleApproval.id ? { ...a, ...settleApproval } : a);
    setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  }
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('votes').upsert([newVote]);
        if (settleApproval) {
          await client.from('approvals').update(settleApproval).eq('id', settleApproval.id);
        }
      } catch (e) {
        console.warn('[CloudStore] Supabase vote upsert failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_vote', payload: { ...newVote, _settleApproval: settleApproval } })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync vote error:', e);
  }

  return newVote;
}

/**
 * 提交评论
 */
export async function submitComment(commentData) {
  initCache();
  const newComment = {
    ...commentData,
    id: commentData.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: commentData.created_at || new Date().toISOString(),
  };

  localCache.comments = [...localCache.comments, newComment];
  setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('comments').insert([newComment]);
      } catch (e) {
        console.warn('[CloudStore] Supabase comment insert failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_comment', payload: newComment })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync comment error:', e);
  }

  return newComment;
}

/**
 * 创建好物分享
 */
export async function createGoodItem(itemData) {
  initCache();
  const newItem = {
    ...itemData,
    id: itemData.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: itemData.created_at || new Date().toISOString(),
  };

  localCache.goodItems = [newItem, ...localCache.goodItems.filter(g => g.id !== newItem.id)];
  setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('good_items').insert([newItem]);
      } catch (e) {
        console.warn('[CloudStore] Supabase good_item insert failed:', e);
      }
    }
  }

  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_good_item', payload: newItem })
    });
  } catch (e) {
    console.warn('[CloudStore] Sync good item error:', e);
  }

  return newItem;
}

/**
 * 同步获取当前缓存（供组件初始渲染）
 */
export function getCachedApprovals() {
  initCache();
  return localCache.approvals;
}

export function getCachedVotes() {
  initCache();
  return localCache.votes;
}

export function getCachedComments(approvalId) {
  initCache();
  if (!approvalId) return localCache.comments;
  return localCache.comments.filter(c => c.approval_id === approvalId);
}

export function getCachedGoodItems() {
  initCache();
  return localCache.goodItems;
}

/**
 * 向云端共享池发起删除请求，区分「成功 / 后端拒绝 / 网络失败」三种结果。
 * 只看 res.ok 会把 403 无权限误报成网络故障，所以解析响应体里的 error。
 */
async function postDelete(action, payload) {
  try {
    const res = await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      // 非 JSON 响应（代理错误页等）按 HTTP 状态兜底
    }
    if (res.ok && body?.success !== false) {
      return { cloudSynced: true, warning: '' };
    }
    return {
      cloudSynced: false,
      warning: body?.error
        ? `本机已删除，但云端拒绝了该请求：${body.error}。其他设备可能仍能看到，请稍后重试。`
        : `本机已删除，但云端同步未生效（HTTP ${res.status}），其他设备可能仍能看到，请稍后重试。`,
    };
  } catch (e) {
    console.warn('[CloudStore] Sync delete error:', e);
    return {
      cloudSynced: false,
      warning: '本机已删除，但云端同步暂时失败，其他设备可能仍能看到，请稍后重试。',
    };
  }
}

/**
 * 删除本人发布的审批单（级联清理该单的投票与讨论）
 * 三层同步删除：本地缓存 + Supabase（若配置）+ 云端共享 Blob
 */
export async function deleteApproval(approvalId, userId) {
  initCache();
  const target = localCache.approvals.find(a => a.id === approvalId);
  if (!target) return { success: false, error: '内容不存在或已被删除' };
  if (!userId || target.creator_id !== userId) {
    return { success: false, error: '只能删除自己发布的内容' };
  }

  markDeleted(approvalId);
  localCache.approvals = localCache.approvals.filter(a => a.id !== approvalId);
  localCache.votes = localCache.votes.filter(v => v.approval_id !== approvalId);
  localCache.comments = localCache.comments.filter(c => c.approval_id !== approvalId);
  setLocal(STORAGE_KEYS.APPROVALS, localCache.approvals);
  setLocal(STORAGE_KEYS.VOTES, localCache.votes);
  setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        // votes / comments 由数据库外键 ON DELETE CASCADE 自动级联清理
        await client.from('approvals').delete().eq('id', approvalId).eq('creator_id', userId);
      } catch (e) {
        console.warn('[CloudStore] Supabase delete approval failed:', e);
      }
    }
  }

  const { cloudSynced, warning } = await postDelete('delete_approval', { id: approvalId, userId });
  return { success: true, cloudSynced, warning };
}

/**
 * 删除本人发布的好物分享
 */
export async function deleteGoodItem(itemId, userId) {
  initCache();
  const target = localCache.goodItems.find(g => g.id === itemId);
  if (!target) return { success: false, error: '内容不存在或已被删除' };
  if (!userId || target.creator_id !== userId) {
    return { success: false, error: '只能删除自己发布的内容' };
  }

  markDeleted(itemId);
  localCache.goodItems = localCache.goodItems.filter(g => g.id !== itemId);
  setLocal(STORAGE_KEYS.GOOD_ITEMS, localCache.goodItems);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('good_items').delete().eq('id', itemId).eq('creator_id', userId);
      } catch (e) {
        console.warn('[CloudStore] Supabase delete good item failed:', e);
      }
    }
  }

  const { cloudSynced, warning } = await postDelete('delete_good_item', { id: itemId, userId });
  return { success: true, cloudSynced, warning };
}

/**
 * 删除本人发布的讨论留言
 */
export async function deleteComment(commentId, userId) {
  initCache();
  const target = localCache.comments.find(c => c.id === commentId);
  if (!target) return { success: false, error: '留言不存在或已被删除' };
  if (!userId || target.user_id !== userId) {
    return { success: false, error: '只能删除自己发布的留言' };
  }

  markDeleted(commentId);
  localCache.comments = localCache.comments.filter(c => c.id !== commentId);
  setLocal(STORAGE_KEYS.COMMENTS, localCache.comments);
  notifyUpdate();

  if (isSupabaseConfigured()) {
    const client = getSupabase();
    if (client) {
      try {
        await client.from('comments').delete().eq('id', commentId).eq('user_id', userId);
      } catch (e) {
        console.warn('[CloudStore] Supabase delete comment failed:', e);
      }
    }
  }

  const { cloudSynced, warning } = await postDelete('delete_comment', { id: commentId, userId });
  return { success: true, cloudSynced, warning };
}
```

---

## src/lib/goodItems.js

```javascript
import { 
  syncFromCloud, 
  getCachedGoodItems, 
  createGoodItem as createCloudGoodItem,
  deleteGoodItem as deleteCloudGoodItem
} from './cloudStore';
import { INITIAL_GOOD_ITEMS } from './goodItemsFallback';

export function getLocalGoodItems() {
  return getCachedGoodItems() || INITIAL_GOOD_ITEMS;
}

export function saveLocalGoodItem(item) {
  return createCloudGoodItem(item);
}

/**
 * 获取好物分享列表（全网云端同步）
 */
export async function fetchGoodItems() {
  try {
    const data = await syncFromCloud();
    if (data && data.goodItems && data.goodItems.length > 0) {
      return data.goodItems;
    }
  } catch (err) {
    console.warn('[GoodItems] fetch failed, using cached:', err);
  }
  return getCachedGoodItems() || INITIAL_GOOD_ITEMS;
}

/**
 * 发布一笔好物分享（全网云端同步）
 */
export async function createGoodItem(item) {
  try {
    const created = await createCloudGoodItem(item);
    return { success: true, data: created };
  } catch (e) {
    console.warn('[GoodItems] create failed:', e);
    return { success: true, data: item };
  }
}

/**
 * 删除本人发布的好物分享（全网同步）
 */
export async function removeGoodItem(itemId, userId) {
  return deleteCloudGoodItem(itemId, userId);
}
```

---

## src/lib/goodItemsFallback.js

```javascript
// 初始好物分享种子数据
export const INITIAL_GOOD_ITEMS = [
  {
    id: 'g-001',
    title: '人体工学网布办公椅（带自适应腰托）',
    price: 699,
    reason: '程序员久坐腰酸救星！换了这个椅子之后连续敲代码 4 小时不腰疼，腰托支撑非常到位，千元内无敌！',
    image_url: '/office-chair.jpg',
    creator_id: 'u_seed_good_1',
    creator_nickname: '不腰疼的打工人',
    creator_gender: '男',
    creator_mbti: 'INTJ',
    creator_zodiac: '天秤座',
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-002',
    title: '手冲咖啡便携保温杯 (450ml)',
    price: 89,
    reason: '保温效果极其强悍，放了一整天下午喝还是烫的。双层陶瓷内胆不串味，天天自己带咖啡，一个月省下600奶茶钱！',
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_2',
    creator_nickname: '手冲拿铁患者',
    creator_gender: '女',
    creator_mbti: 'ENFP',
    creator_zodiac: '双鱼座',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-003',
    title: '真无线骨传导运动耳机',
    price: 329,
    reason: '跑步安全感拉满，完全不堵耳道，流汗也不容易滋生细菌。音质虽然比不上头戴式，但夜跑听歌和听播客完全够用！',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_3',
    creator_nickname: '夜跑阿哲',
    creator_gender: '男',
    creator_mbti: 'ISTP',
    creator_zodiac: '白羊座',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-004',
    title: '极简磁吸多功能台灯（无线充底座）',
    price: 159,
    reason: '租房小书桌的神器，底座还能当手机无线充，光线不刺眼无频闪，睡前看书非常舒服，颜值也高。',
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_4',
    creator_nickname: '温暖窝居',
    creator_gender: '女',
    creator_mbti: 'ISFJ',
    creator_zodiac: '巨蟹座',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  }
];
```

---

## src/lib/seedFallback.js

```javascript
// 离线/未连接数据库时的初始种子数据备份
export const INITIAL_SEED_APPROVALS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '复古腋下法棍包',
    price: 139,
    category: '穿搭',
    reason: '刷小红书被种草了，配秋天的大衣感觉超级复古好看，只要一百多块！',
    alternative: '家里已经有三个黑色腋下包了，只是五金颜色不太一样',
    mode: 'public',
    cooling_hours: 24,
    required_votes: 10,
    max_voters: 10,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '家里有3个同色包还买，典型的同质化冲动消费！',
      '百元假皮背两月容易脱皮吃灰，不买立省100%。'
    ],
    ai_generated_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    status: 'rejected',
    creator_id: 'seed_user_1',
    creator_nickname: '秋天想喝奶茶',
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: '二手索尼 A7M3 全画幅微单 (快门2000)',
    price: 8000,
    category: '数码',
    reason: '准备接拍毕业照和客单接单摄影，算过账拍4场就能回本，二手价格比原价省了4000！',
    alternative: '目前用手机拍，弱光和长焦虚化完全达不到商用要求',
    mode: 'public',
    cooling_hours: 24,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 20,
    ai_verdict: 'buy',
    ai_reasons: [
      '属于生产力投资而非纯消费，有明确接单回本测算！',
      '二手残值保值率极高，快门2000成色优异，支持搞钱。'
    ],
    ai_generated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'approved',
    creator_id: 'seed_user_2',
    creator_nickname: '快门工匠阿伟',
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: '七分甜超大杯杨枝甘露 (加多份啵啵)',
    price: 15,
    category: '其他',
    reason: '今天周五加班到八点半，心理防线崩溃，极度需要高糖多巴胺救命！！',
    alternative: '工位抽屉里有免费的立顿茶包和白开水……',
    mode: 'public',
    cooling_hours: 12,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '高糖高热量易发胖，心理慰藉只能维持十分钟，AI坚定投反对票劝退！'
    ],
    ai_generated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_3',
    creator_nickname: '周五只想下班',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: '林俊杰 JJ20 巡演内场前排票',
    price: 1300,
    category: '其他',
    reason: '青春只有一次，喜欢的歌手可能过几年就不开巡演了！想去现场听生米大合唱',
    alternative: '买看台票只要 380 元，或者在场馆外面听漏音',
    mode: 'public',
    cooling_hours: 48,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 30,
    ai_verdict: 'buy',
    ai_reasons: [
      '情绪价值拉满的体验型消费，不可复现的青春回忆！',
      '若预算不伤筋动骨，现场大合唱的震撼终身难忘。'
    ],
    ai_generated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_4',
    creator_nickname: '江南夜游人',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 43 * 3600 * 1000).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    title: '运动心率智能手表 Watch GT',
    price: 699,
    category: '运动',
    reason: '打算下周开始每天跑步打卡，需要一个能测心率和 GPS 配速的专业手表',
    alternative: '用手机 Keep 也能记录跑步，但是手机揣兜里晃荡难受',
    mode: 'public',
    cooling_hours: 24,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '典型‘装备先于行动’的借口陷阱，建议先坚持跑步一个月再买！',
      '手机手臂包20块钱就能解决晃荡问题，别把懒归咎于设备。'
    ],
    ai_generated_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_5',
    creator_nickname: '下周一定跑步',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    title: 'RTX 4070 SUPER 12G 独立显卡',
    price: 4999,
    category: '游戏',
    reason: '手头的 1060 玩黑神话悟空卡成幻灯片，为了全高画质畅玩必须换显卡！',
    alternative: '在网吧或者租云电脑玩通关，成本大概 150 元',
    mode: 'public',
    cooling_hours: 72,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 40,
    ai_verdict: 'skip',
    ai_reasons: [
      '为了通关单个游戏花5000块极不划算，云电脑150元即通关！',
      '当前显卡溢价周期，打完游戏大概率高位吃灰。'
    ],
    ai_generated_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_6',
    creator_nickname: '齐天大圣预备役',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 60 * 3600 * 1000).toISOString(),
  },
];

export const INITIAL_SEED_VOTES = [
  // 1. 包包: 7 驳回 1 通过
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_01', voter_nickname: '理性穿搭博主', type: 'reject', owns_item: true, reason: '你不是写了家里有三个了吗！一百多的假皮背两次就脱皮吃灰！', created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_02', voter_nickname: '断舍离大队长', type: 'reject', owns_item: true, reason: '不买立省100%，别给家里制造塑料垃圾了。', created_at: new Date(Date.now() - 23 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_03', voter_nickname: '存钱买房中', type: 'reject', owns_item: false, reason: '快醒醒，秋天的大衣随便配哪个黑色包都好看，没人盯着你五金看！', created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_04', voter_nickname: '拔草小能手', type: 'reject', owns_item: true, reason: '廉价感严重，相信我，买回来一次都不会背出门。', created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_05', voter_nickname: '钱包守护者', type: 'reject', owns_item: false, reason: '139 块去吃顿好吃的羊肉火锅不香吗？', created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_06', voter_nickname: '极简生活家', type: 'reject', owns_item: true, reason: '衣柜都要爆炸了还买，驳回！', created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_07', voter_nickname: '清醒打工人', type: 'reject', owns_item: false, reason: '冲动消费鉴定完毕，狠狠省下！', created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString() },
  { approval_id: '11111111-1111-1111-1111-111111111111', voter_id: 'v_08', voter_nickname: '好看就冲', type: 'approve', owns_item: false, reason: '一百多块千金难买心头好，买来搭衣服也行', created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },

  // 2. 相机: 7 通过 2 驳回
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_11', voter_nickname: '自由摄影师', type: 'approve', owns_item: true, reason: '生产力工具能接单变现，快门才2000非常香，支持搞钱！', created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_12', voter_nickname: '投资型选手', type: 'approve', owns_item: false, reason: '能产生现金流的消费不叫消费叫投资，只要肯勤奋接单稳赚！', created_at: new Date(Date.now() - 23 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_13', voter_nickname: '数码老玩家', type: 'approve', owns_item: true, reason: 'A7M3保值率高，就算不拍了卖掉也亏不了多少，批准！', created_at: new Date(Date.now() - 21 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_14', voter_nickname: '打工搞钱人', type: 'approve', owns_item: false, reason: '支持有技术追求的年轻人搞副业！', created_at: new Date(Date.now() - 19 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_15', voter_nickname: '器材党退烧', type: 'approve', owns_item: true, reason: '价格划算，成色好的话赶紧入。', created_at: new Date(Date.now() - 17 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_16', voter_nickname: '学长阿健', type: 'approve', owns_item: false, reason: '拍毕业照需求很大，提前在学校大群宣传，绝对能挣回来。', created_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_17', voter_nickname: '支持买单侠', type: 'approve', owns_item: false, reason: '批准！年轻人就是要敢想敢干！', created_at: new Date(Date.now() - 13 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_18', voter_nickname: '谨慎观望者', type: 'reject', owns_item: true, reason: '二手相机暗病多，CMOS坏点你看得懂吗？容易被坑。', created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
  { approval_id: '22222222-2222-2222-2222-222222222222', voter_id: 'v_19', voter_nickname: '理性保守派', type: 'reject', owns_item: false, reason: '万一接不到单子直接砸手里8000块，风险太大。', created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },

  // 3. 杨枝甘露: 5 票
  { approval_id: '33333333-3333-3333-3333-333333333333', voter_id: 'v_21', voter_nickname: '控糖达人', type: 'reject', owns_item: false, reason: '15块钱买一杯糖水，喝完血糖飙升晚上失眠长痘！', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { approval_id: '33333333-3333-3333-3333-333333333333', voter_id: 'v_22', voter_nickname: '省钱小能手', type: 'reject', owns_item: false, reason: '下班赶紧回家睡觉，睡着了就不想吃了！', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { approval_id: '33333333-3333-3333-3333-333333333333', voter_id: 'v_23', voter_nickname: '健康守护员', type: 'reject', owns_item: false, reason: '波霸热量炸弹，喝完跑五公里都消耗不掉！', created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() },
  { approval_id: '33333333-3333-3333-3333-333333333333', voter_id: 'v_24', voter_nickname: '开心最重要', type: 'approve', owns_item: false, reason: '周五都加班到这个点了，喝杯奶茶怎么了！对自己好点！', created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() },
  { approval_id: '33333333-3333-3333-3333-333333333333', voter_id: 'v_25', voter_nickname: '同病相怜同事', type: 'approve', owns_item: true, reason: '加份啵啵咬一咬发泄一下，准了！', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
];
```

---

## src/lib/supabase.js

```javascript
import { createClient } from '@supabase/supabase-js';

// 获取配置：优先环境变量，其次 localStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem('WALLET_WAIT_SUPABASE_URL');
  const localKey = localStorage.getItem('WALLET_WAIT_SUPABASE_KEY');

  const url = (envUrl && envUrl.trim() && !envUrl.includes('your-project-id')) ? envUrl.trim() : (localUrl || '').trim();
  const key = (envKey && envKey.trim() && !envKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) ? envKey.trim() : (localKey || '').trim();

  return { url, key, isCustom: Boolean(!envUrl && localUrl) };
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function saveSupabaseCredentials(url, key) {
  if (url && key) {
    localStorage.setItem('WALLET_WAIT_SUPABASE_URL', url.trim());
    localStorage.setItem('WALLET_WAIT_SUPABASE_KEY', key.trim());
  } else {
    localStorage.removeItem('WALLET_WAIT_SUPABASE_URL');
    localStorage.removeItem('WALLET_WAIT_SUPABASE_KEY');
  }
  supabaseInstance = null;
  window.dispatchEvent(new CustomEvent('supabase_config_changed'));
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http'));
}
```

---

## src/lib/ai.js

```javascript
import { getSupabase } from './supabase';
import { updateApproval } from './cloudStore';

const COOLDOWN_SECONDS = 60;
const LAST_RETRY_PREFIX = 'wallet_wait_ai_retry_';
const CUSTOM_AI_KEY_STORAGE = 'wallet_wait_custom_ai_key';
const AI_SOURCE_PREFIX = 'wallet_wait_ai_source_';
const AI_GLM_DONE_PREFIX = 'wallet_wait_ai_glm_done_';
const AI_AUTO_PREFIX = 'wallet_wait_ai_auto_';

// 统一走 /api/*：线上由 netlify.toml 重定向到 Function，本地由 vite.config.js 代理。
// 旧版按 hostname 判断并改走 /.netlify/functions/*，导致本地 dev 永远拿不到后端结果。
const AI_ENDPOINT = '/api/ai-recommend';

// 同一个审批单的并发请求去重，避免详情页 6 秒轮询把 GLM 打爆
const inflight = new Map();

export function getCustomAiKey() {
  return localStorage.getItem(CUSTOM_AI_KEY_STORAGE) || '';
}

export function setCustomAiKey(key) {
  if (key) {
    localStorage.setItem(CUSTOM_AI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(CUSTOM_AI_KEY_STORAGE);
  }
  // 换了 Key 之后，本会话内已经判过「没接上」的审批单应当允许重新自动尝试
  resetAiAutoFlag();
}

/** 读取该审批单当前展示的 AI 结果来源：'glm' | 'fallback' | 'local' | '' */
export function getAiSource(approvalId) {
  if (!approvalId) return '';
  try {
    return localStorage.getItem(`${AI_SOURCE_PREFIX}${approvalId}`) || '';
  } catch (e) {
    return '';
  }
}

function setAiSource(approvalId, source) {
  if (!approvalId) return;
  try {
    localStorage.setItem(`${AI_SOURCE_PREFIX}${approvalId}`, source || '');
  } catch (e) {
    // 隐私模式下 localStorage 可能不可写，忽略即可
  }
}

/** 该审批单是否已经成功拿到过一次真实 GLM 结果 */
export function hasRealGlmResult(approvalId) {
  if (!approvalId) return false;
  try {
    return localStorage.getItem(`${AI_GLM_DONE_PREFIX}${approvalId}`) === '1';
  } catch (e) {
    return false;
  }
}

function markRealGlmResult(approvalId) {
  try {
    localStorage.setItem(`${AI_GLM_DONE_PREFIX}${approvalId}`, '1');
  } catch (e) {
    // ignore
  }
}

/** 本会话是否已经自动尝试过补刷（用 sessionStorage，配好 Key 后刷新页面即可重试） */
export function hasAutoTriedGlm(approvalId) {
  if (hasRealGlmResult(approvalId)) return true;
  try {
    return sessionStorage.getItem(`${AI_AUTO_PREFIX}${approvalId}`) === '1';
  } catch (e) {
    return false;
  }
}

export function markAutoTriedGlm(approvalId) {
  try {
    sessionStorage.setItem(`${AI_AUTO_PREFIX}${approvalId}`, '1');
  } catch (e) {
    // ignore
  }
}

/** 清除所有「本次会话已自动尝试」标记，供用户重新配置 Key 后立即生效 */
export function resetAiAutoFlag() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(AI_AUTO_PREFIX)) keys.push(k);
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

/**
 * 检查当前用户是否处于重试冷却中
 * @param {string} approvalId 
 * @returns {{ inCooldown: boolean, remainingSeconds: number }}
 */
export function getAiRetryCooldown(approvalId) {
  try {
    const key = `${LAST_RETRY_PREFIX}${approvalId}`;
    const timestampStr = localStorage.getItem(key);
    if (!timestampStr) return { inCooldown: false, remainingSeconds: 0 };

    const lastTime = parseInt(timestampStr, 10);
    const elapsed = Math.floor((Date.now() - lastTime) / 1000);
    if (elapsed < COOLDOWN_SECONDS) {
      return { inCooldown: true, remainingSeconds: COOLDOWN_SECONDS - elapsed };
    }
  } catch (e) {
    // ignore
  }
  return { inCooldown: false, remainingSeconds: 0 };
}

/**
 * 记录用户触发重新调用的时间戳
 */
export function recordAiRetryTimestamp(approvalId) {
  try {
    localStorage.setItem(`${LAST_RETRY_PREFIX}${approvalId}`, String(Date.now()));
  } catch (e) {
    // ignore
  }
}

function normalizeReasons(reasons) {
  if (Array.isArray(reasons)) return reasons;
  if (typeof reasons === 'string') {
    try {
      const parsed = JSON.parse(reasons);
      return Array.isArray(parsed) ? parsed : [reasons];
    } catch (e) {
      return [reasons];
    }
  }
  return [];
}

/**
 * 请求 AI 购买建议点评（优先真实 GLM，失败无损回退规则引擎）
 *
 * 修复要点：旧版只要 approval.ai_verdict 有值就直接返回缓存，而 CreatePage 在发布时
 * 用前端规则引擎把这个字段写死了 —— 结果详情页永远不请求后端，GLM 形同虚设。
 * 现在只有「已经是真 GLM 结果」或「本会话已自动尝试过」才走缓存。
 *
 * @param {Object} approval 审批单
 * @param {Array} votes 投票列表
 * @param {boolean} forceRefresh 是否强制重新生成（手动「换个角度再评一次」）
 * @returns {Promise<{ configured: boolean, source: string, verdict: 'buy'|'skip'|null, reasons: string[], fallback_reason?: string }>}
 */
export async function fetchAiRecommendation(approval, votes = [], forceRefresh = false) {
  if (!approval) return { configured: false, source: 'local', verdict: null, reasons: [] };

  const cachedSource = getAiSource(approval.id);
  const reasonsFromCache = normalizeReasons(approval.ai_reasons);

  // 缓存短路：必须是真 GLM 结果、或本会话已经自动补刷过一次，才允许直接返回
  if (!forceRefresh && approval.ai_verdict && reasonsFromCache.length &&
      (cachedSource === 'glm' || hasAutoTriedGlm(approval.id))) {
    return {
      configured: true,
      source: cachedSource || 'unknown',
      verdict: approval.ai_verdict,
      reasons: reasonsFromCache,
      generated_at: approval.ai_generated_at,
    };
  }

  // 6 秒轮询可能并发触发，合并成同一个请求
  if (inflight.has(approval.id)) return inflight.get(approval.id);

  const task = (async () => {
    // 2. 统计当前投票与“已拥有”比例
    const approveCount = votes.filter(v => v.type === 'approve').length;
    const rejectCount = votes.filter(v => v.type === 'reject').length;
    const spectateCount = votes.filter(v => v.type === 'spectate').length;

    const totalAnsweredOwns = votes.filter(v => v.owns_item !== undefined && v.owns_item !== null).length;
    const ownedCount = votes.filter(v => v.owns_item === true || v.owns_item === 'owned').length;
    const ownedRatio = totalAnsweredOwns > 0 ? (ownedCount / totalAnsweredOwns) : 0;

    const payload = {
      approval_id: approval.id,
      title: approval.title,
      price: approval.price,
      category: approval.category,
      reason: approval.reason,
      alternative: approval.alternative,
      creator_mbti: approval.creator_mbti || '',
      target_mbtis: approval.target_mbtis || [],
      approve_count: approveCount,
      reject_count: rejectCount,
      spectate_count: spectateCount,
      owned_ratio: ownedRatio,
      custom_api_key: getCustomAiKey(),
    };

    let aiResult = null;

    // 3. 请求后端 AI 函数（线上经 netlify.toml redirect，本地经 vite proxy）
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.verdict) {
          aiResult = data;
        }
      }
    } catch (netErr) {
      console.warn('[ai] 后端 AI 函数不可达，使用本地规则引擎：', netErr);
    }

    // 4. 后端不可用时，前端内置引擎保底
    if (!aiResult) {
      aiResult = clientSmartAiEngine(payload);
      aiResult.source = 'local';
      aiResult.fallback_reason = '后端 AI 函数不可达（本地开发请确认 /api 代理已配置）';
    }

    const source = aiResult.source || (aiResult.configured ? 'fallback' : 'local');
    if (source === 'glm') {
      markRealGlmResult(approval.id);
    } else if (!forceRefresh) {
      markAutoTriedGlm(approval.id);
    }
    setAiSource(approval.id, source);

    // 5. 持久化缓存：只写数据库已有的 4 个字段，不引入新列以免 Supabase update 报未知字段
    const generatedAt = aiResult.generated_at || new Date().toISOString();
    if (approval.id) {
      try {
        updateApproval({
          id: approval.id,
          ai_verdict: aiResult.verdict,
          ai_reasons: aiResult.reasons,
          ai_generated_at: generatedAt,
        });
      } catch (e) {
        console.warn('Failed to sync AI verdict to cloud store:', e);
      }
    }

    const client = getSupabase();
    if (client && approval.id) {
      try {
        await client
          .from('approvals')
          .update({
            ai_verdict: aiResult.verdict,
            ai_reasons: aiResult.reasons,
            ai_generated_at: generatedAt,
          })
          .eq('id', approval.id);
      } catch (dbErr) {
        console.warn('Failed to cache AI verdict to DB:', dbErr);
      }
    }

    return {
      configured: true,
      source,
      model: aiResult.model || '',
      fallback_reason: aiResult.fallback_reason || '',
      verdict: aiResult.verdict,
      reasons: aiResult.reasons || [],
      generated_at: generatedAt,
    };
  })();

  inflight.set(approval.id, task);
  try {
    return await task;
  } finally {
    inflight.delete(approval.id);
  }
}

/**
 * 配置弹窗用：直接打一次后端，判断 GLM 是否真的接通
 * 不写任何审批单数据，也不读缓存。
 */
export async function testGlmConnection() {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'GLM 连通性测试',
        price: 1,
        category: '其他',
        reason: '接口自检',
        alternative: '',
        custom_api_key: getCustomAiKey(),
      }),
    });
    if (!res.ok) {
      return { ok: false, source: 'local', reason: `后端返回 HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: data.source === 'glm',
      source: data.source || 'unknown',
      model: data.model || data.diagnostics?.model || '',
      reason: data.fallback_reason || '',
      diagnostics: data.diagnostics || null,
    };
  } catch (e) {
    return { ok: false, source: 'local', reason: `无法连接后端：${e?.message || e}` };
  }
}

/**
 * 客户端内置智能决策引擎（立场鲜明，必须明确投出支持票 buy 或反对票 skip）
 */
export function clientSmartAiEngine({ title, price, reason, alternative, approve_count = 0, reject_count = 0, owned_ratio = 0 }) {
  const numPrice = Number(price) || 0;
  const reasonText = (reason || '').toLowerCase();
  const altText = (alternative || '').toLowerCase();

  const isImpulse = /冲动|头脑一热|上头|好看|刷到|被种草|颜值|限量|降价|秒杀|打折/.test(reasonText);
  const isEmotional = /心情不好|压力大|犒劳|解压|郁闷|加班|好累|奖励自己/.test(reasonText);
  const isUtility = /生产力|效率|工作|学习|考研|降噪|运动|健康|颈椎|腰酸|刚需|坏了/.test(reasonText);
  const hasAlternative = altText.length > 3 && !/没有|暂无|无|买不起|借不到/.test(altText);

  let verdict = 'skip';
  const reasons = [];

  // 1. 劝退反对逻辑 (skip)
  if ((isImpulse || isEmotional) && !isUtility && numPrice > 100) {
    verdict = 'skip';
    reasons.push(`典型的情绪补偿型消费。当前价格 ¥${numPrice} 不低，情绪褪去后大概率沦为闲置吃灰。`);
    if (hasAlternative) {
      reasons.push(`既然已有现有替代品（${alternative}），先物尽其用，不要为了短暂的新鲜感重复添置。`);
    } else {
      reasons.push(`不如先放进冷静期满 24 小时，这笔钱留着吃几顿大餐或存起来更有确定感。`);
    }
    if (reject_count > approve_count) {
      reasons.push(`现场网友劝退率偏高，群众的眼睛是雪亮的，AI投反对票带头劝退！`);
    }
  } 
  // 2. 支持放行逻辑 (buy)：明确生产力、高频刚需，且替代品不足
  else if (isUtility && (!hasAlternative || numPrice < 300)) {
    verdict = 'buy';
    reasons.push(`属于能提升日常效率或身心健康的实用型投入，对日常生活的正面改善明确。`);
    if (numPrice <= 300) {
      reasons.push(`预算在合理区间内，只要能坚持使用哪怕三个月，折算单次使用成本也微乎其微。`);
    } else {
      reasons.push(`核心痛点明确，只要确认购买后能立即投入日常主力使用，AI投支持票！`);
    }
    if (approve_count >= reject_count) {
      reasons.push(`网友多数也认为值得一试，理智放行，买完记得物尽其用别闲置！`);
    }
  } 
  // 3. 其他非刚需场景一律投反对票（AI省思袋的核心职责就是防冲动劝退）
  else {
    verdict = 'skip';
    if (hasAlternative) {
      reasons.push(`现有替代方案尚能应对，升级带来的边际体验提升可能远小于 ¥${numPrice} 的实际支出。`);
    } else {
      reasons.push(`这件物品的新鲜感期通常较短，AI坚定投反对票劝退，省下就是赚到。`);
    }
    reasons.push(`建议至少等到设定的冷静期倒计时走完，如果那时仍觉得非它不可再买也不迟。`);
  }

  const finalReasons = reasons.slice(0, 3);
  if (finalReasons.length < 2) {
    finalReasons.push('冷静期内多听听同频网友的真实避坑体验，让理性跑赢冲动！');
  }

  return {
    verdict,
    reasons: finalReasons,
    generated_at: new Date().toISOString(),
  };
}

/**
 * 发布时立即生成初始 AI 建议，保证帖子一经发布即带 AI 判定，绝不闪烁丢失。
 * 注意：这里用的是本地规则引擎（离线秒出、不依赖网络），详情页首次打开时
 * AiVerdictCard 会自动向后端补刷一次真实 GLM 结果并覆盖。
 */
export function generateInitialAiAdvice(approval) {
  return clientSmartAiEngine({
    title: approval.title,
    price: approval.price,
    reason: approval.reason,
    alternative: approval.alternative,
    creator_mbti: approval.creator_mbti,
  });
}
```

---

## src/components/Navbar.jsx

```javascript
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
```

---

## src/components/BottomNav.jsx

```javascript
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
```

---

## src/components/ApprovalCard.jsx

```javascript
import React from 'react';
import { Link } from 'wouter';
import { ThumbsUp, ThumbsDown, Share2, Sparkles, Bot, ArrowRight, Trash2 } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { ROAST_MESSAGES } from '../lib/constants';
import { calculateApprovalTally } from '../lib/settle';

export default function ApprovalCard({ approval, votes = [], onShare, isOwner = false, onDelete }) {
  // 计算综合票数分解
  const tally = calculateApprovalTally(approval, votes);
  const totalDecisive = tally.humanApprove + tally.humanReject;

  // 综合百分比
  const finalTotal = tally.finalApprove + tally.finalReject;
  const approvePct = finalTotal === 0 ? 50 : Math.round((tally.finalApprove / finalTotal) * 100);
  const rejectPct = 100 - approvePct;

  // 扎心文案
  const roastIndex = Math.abs(approval.title.length + Math.round(approval.price)) % ROAST_MESSAGES.length;
  const roastMsg = ROAST_MESSAGES[roastIndex];

  return (
    <div className="group relative bg-white rounded-3xl p-5 border border-amber-100 shadow-xs hover:shadow-md transition-all duration-250 text-left flex flex-col justify-between animate-fadeIn">
      <div>
        {/* 顶部标签行 */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {approval.category}
            </span>
            {approval.mode === 'group' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                🔒 密友群审
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span>@{approval.creator_nickname}</span>
              {approval.creator_mbti && (
                <span className="px-1 py-0.2 bg-slate-100 rounded text-[10px] text-slate-600 font-mono">
                  {approval.creator_mbti}
                </span>
              )}
              {isOwner && <span className="ml-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded-md">(我)</span>}
            </span>
          </div>

          {/* 状态徽章 */}
          {approval.status === 'approved' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              ✅ 已批准购买
            </span>
          )}
          {approval.status === 'rejected' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
              🛑 已驳回劝退
            </span>
          )}
          {approval.status === 'pending' && (
            <CountdownTimer deadline={approval.deadline} status={approval.status} compact />
          )}
        </div>

        {/* 标题与价格（标题换行自适应，价格固定单行不被挤压截断） */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link href={`/approval/${approval.id}`} className="hover:text-amber-600 transition flex-1 min-w-0 mr-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-600 transition break-words line-clamp-2 leading-snug">
              {approval.title}
            </h3>
          </Link>
          <div className="shrink-0 text-right whitespace-nowrap pl-1">
            <span className="text-xs text-slate-400">预算 </span>
            <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">¥{approval.price}</span>
          </div>
        </div>

        {/* 预计使用时长标签（若无该数据则整行完全不显示，绝不显示“未注明”） */}
        {approval.expected_duration && (
          <div className="mb-2 text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-0.5 rounded-lg border border-amber-200/50 w-fit">
            ⏳ 预计使用：{approval.expected_duration}
          </div>
        )}

        {/* 购买理由 */}
        <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100/60 mb-3 text-xs text-slate-700 leading-relaxed">
          <span className="font-bold text-amber-900">“心动理由”：</span>
          <span className="italic">{approval.reason}</span>
        </div>

        {/* AI 建议小胶囊（若已生成，排版整洁，态度鲜明） */}
        {approval.ai_verdict && (
          <div className="mb-3 flex items-center justify-between text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70 gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 font-bold shrink-0">
              <Bot className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="shrink-0">AI表态：</span>
              <span className={
                approval.ai_verdict === 'buy' ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'
              }>
                {approval.ai_verdict === 'buy' ? '支持买' : '反对买'}
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[10px] shrink-0 whitespace-nowrap">
              {tally.aiVotes > 0 
                ? `占 ${approval.ai_weight ?? 20}% (已投${approval.ai_verdict === 'buy' ? '支持' : '反对'} ${tally.aiVotes}票)`
                : '仅供参考 (0票)'}
            </span>
          </div>
        )}

        {/* 替代方案（若有） */}
        {approval.alternative && (
          <div className="text-[11px] text-slate-500 mb-3 flex items-start gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-600 shrink-0">平替现状:</span>
            <span className="line-clamp-1">{approval.alternative}</span>
          </div>
        )}

        {/* 驳回特别提示 */}
        {approval.status === 'rejected' && (
          <div className="mb-3 p-3 bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/80 rounded-2xl">
            <div className="flex items-center gap-1 text-xs font-bold text-rose-700 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>为TA省下 ¥{approval.price}！</span>
            </div>
            <p className="text-[11px] text-rose-600/90 italic font-medium">“{roastMsg}”</p>
          </div>
        )}
      </div>

      {/* 底部投票进度条与操作 */}
      <div>
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-700 flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> 买 ({tally.finalApprove})
            </span>
            <span className="text-slate-400 text-[11px] font-mono">
              {approval.status === 'pending' 
                ? `目标 ${tally.requiredVotes} 人 (人类已投 ${totalDecisive})` 
                : '表态已结算'}
            </span>
            <span className="text-rose-700 flex items-center gap-1">
              不买 ({tally.finalReject}) <ThumbsDown className="w-3 h-3" />
            </span>
          </div>

          {/* 进度对比条 */}
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${approvePct}%` }} 
              className="bg-emerald-500 transition-all duration-500"
            />
            <div 
              style={{ width: `${rejectPct}%` }} 
              className="bg-rose-500 transition-all duration-500"
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>支持率 {approvePct}%</span>
            <span>劝退率 {rejectPct}%</span>
          </div>
        </div>

        {/* 卡片底栏操作按钮 */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onShare && onShare(approval)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-800 py-1.5 px-3 rounded-xl hover:bg-amber-50 transition cursor-pointer"
            title="分享本单"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>求劝退</span>
          </button>

          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(approval)}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 py-1.5 px-2.5 rounded-xl hover:bg-rose-50 transition cursor-pointer shrink-0"
              title="删除我发布的这条审批"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          )}

          <Link
            href={`/approval/${approval.id}`}
            className="flex-1 py-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
          >
            <span>{approval.status === 'pending' ? '立即表态 / 看AI' : '查看结算'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## src/components/AiVerdictCard.jsx

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { Bot, RefreshCw, Sparkles, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { fetchAiRecommendation, getAiRetryCooldown, recordAiRetryTimestamp, getAiSource, hasAutoTriedGlm } from '../lib/ai';

export default function AiVerdictCard({ approval, votes = [], onUpdateApproval }) {
  const [loading, setLoading] = useState(false);
  const [engineHint, setEngineHint] = useState('');
  const [glmModel, setGlmModel] = useState('');

  // 自动补刷的 effect 只按 approval.id 触发一次（防止 6 秒轮询反复打模型），
  // 但要读到最新的 votes / approval 快照，否则 GLM prompt 里的票数会是旧值。
  const latestRef = useRef({ approval, votes, onUpdateApproval });
  latestRef.current = { approval, votes, onUpdateApproval };

  const [aiData, setAiData] = useState({
    configured: true,
    source: getAiSource(approval?.id),
    verdict: approval?.ai_verdict || null,
    reasons: approval?.ai_reasons || [],
    message: '',
  });

  // 防刷 60s 倒计时
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!approval?.id) return;
    const { inCooldown, remainingSeconds } = getAiRetryCooldown(approval.id);
    if (inCooldown) {
      setCooldown(remainingSeconds);
    }
  }, [approval?.id]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 如果审批单已有缓存
  useEffect(() => {
    if (approval) {
      let reasons = approval.ai_reasons || [];
      if (typeof reasons === 'string') {
        try {
          reasons = JSON.parse(reasons);
        } catch (e) {
          reasons = [reasons];
        }
      }
      setAiData({
        configured: true,
        source: getAiSource(approval.id),
        verdict: approval.ai_verdict || null,
        reasons: Array.isArray(reasons) ? reasons : [reasons],
        message: '',
      });
    }
  }, [approval]);

  // 计算权重与折算票数
  const weight = typeof approval?.ai_weight === 'number' ? approval.ai_weight : 20;
  const targetVotes = approval?.required_votes || approval?.max_voters || 15;
  const calculatedVotes = Math.round((weight / 100) * targetVotes);

  // 换个角度再评一次
  const handleRegenerate = async () => {
    if (cooldown > 0 || loading || !approval) return;

    setLoading(true);
    recordAiRetryTimestamp(approval.id);
    setCooldown(60);

    const res = await fetchAiRecommendation(approval, votes, true);
    setAiData(res);
    setEngineHint(res.fallback_reason || '');
    setGlmModel(res.model || '');
    setLoading(false);

    if (res.configured && res.verdict && onUpdateApproval) {
      onUpdateApproval({
        ...approval,
        ai_verdict: res.verdict,
        ai_reasons: res.reasons,
        ai_generated_at: new Date().toISOString(),
      });
    }
  };

  // 自动补刷：CreatePage 发布时写的是本地规则引擎结果，这里在详情页首次打开时
  // 后台向 /api/ai-recommend 再取一次真实 GLM 结论并静默覆盖（不闪烁、不转圈）。
  // 去重由 ai.js 的 sessionStorage / localStorage 标记负责，6 秒轮询不会反复打模型。
  useEffect(() => {
    if (!approval?.id) return;
    const needsFirstGeneration = !approval.ai_verdict && !approval.ai_generated_at;
    const needsGlmUpgrade = !hasAutoTriedGlm(approval.id);
    if (!needsFirstGeneration && !needsGlmUpgrade) return;

    let cancelled = false;
    const refresh = async () => {
      // 数据可能异步到位，等一拍再取快照，避免把空票数喂给模型
      const snapshot = latestRef.current;
      const curApproval = snapshot.approval || approval;
      const curVotes = snapshot.votes || votes;
      if (needsFirstGeneration) setLoading(true);
      const res = await fetchAiRecommendation(curApproval, curVotes, false);
      if (cancelled) return;
      setAiData(res);
      setEngineHint(res.fallback_reason || '');
      setGlmModel(res.model || '');
      if (needsFirstGeneration) setLoading(false);
      if (res.configured && res.verdict && snapshot.onUpdateApproval) {
        snapshot.onUpdateApproval({
          ...curApproval,
          ai_verdict: res.verdict,
          ai_reasons: res.reasons,
          ai_generated_at: res.generated_at || new Date().toISOString(),
        });
      }
    };
    refresh();
    return () => { cancelled = true; };
  }, [approval?.id]);

  // 结论视觉配置：鲜明亮明态度，明确显示投支持还是反对
  const verdictConfig = {
    buy: {
      label: '支持购买',
      badgeLabel: weight > 0 ? `已投支持票 · 计入 ${calculatedVotes} 票` : '建议支持购买 (0票)',
      badgeClass: 'bg-emerald-500 text-white',
      cardClass: 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      textColor: 'text-emerald-700',
    },
    skip: {
      label: '反对驳回',
      badgeLabel: weight > 0 ? `已投反对票 · 计入 ${calculatedVotes} 票` : '建议反对驳回 (0票)',
      badgeClass: 'bg-rose-500 text-white',
      cardClass: 'bg-gradient-to-br from-rose-50/80 to-orange-50/40 border-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      textColor: 'text-rose-700',
    },
    think: {
      label: '反对驳回 (防冲动)',
      badgeLabel: weight > 0 ? `已投反对票 · 计入 ${calculatedVotes} 票` : '建议不买 (0票)',
      badgeClass: 'bg-rose-500 text-white',
      cardClass: 'bg-gradient-to-br from-rose-50/80 to-orange-50/40 border-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      textColor: 'text-rose-700',
    },
  };

  const currentCfg = aiData.verdict ? (verdictConfig[aiData.verdict] || verdictConfig.skip) : null;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-100 shadow-sm animate-fadeIn text-left">
      {/* 头部标题与权重徽章 */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI建议</h3>
            <p className="text-[11px] text-slate-400">客观多维度分析 · 协助理性防冲动</p>
          </div>
        </div>

        {/* 右上角权重标识 */}
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            weight > 50 
              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
              : weight === 0
              ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : 'bg-amber-100 text-amber-900 border border-amber-200'
          }`}>
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>
              {weight === 0 
                ? 'AI建议，仅供参考' 
                : `AI建议 · 占比 ${weight}% (折算 ${calculatedVotes} 票)`}
            </span>
          </div>
          {weight > 50 && (
            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
              ⚠️ 权重超过 50%，AI建议将占主导！
            </div>
          )}
        </div>
      </div>

      {/* AI 引擎来源标识：让「真 GLM」和「本地规则引擎」一眼可分 */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
          aiData.source === 'glm'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          {aiData.source === 'glm' ? <Sparkles className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
          {aiData.source === 'glm'
            ? `GLM 实时推理 · ${glmModel || 'glm-4-flash-250414'}`
            : '本地规则引擎 · 尚未接入大模型'}
        </span>
        {engineHint && (
          <span className="text-[10px] text-slate-400 truncate max-w-full" title={engineHint}>
            {engineHint}
          </span>
        )}
      </div>

      {/* 主体点评内容 */}
      {loading ? (
        <div className="py-8 bg-amber-50/50 rounded-2xl border border-amber-100 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
          <div className="text-xs font-bold text-amber-900">AI正在琢磨中，拆解购买理由与网友反馈...</div>
          <p className="text-[11px] text-amber-700/80">测算刚需程度与吃灰概率，稍候片刻</p>
        </div>
      ) : !aiData.configured || (!aiData.verdict && aiData.message) ? (
        /* 没配 Key 或报错友好降级展示 */
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">
              {aiData.message || '站长还没接 AI，投票先顶上'}
            </div>
            <p className="text-[11px] text-slate-500">
              当前尚未连接 AI 接口服务，不影响正常人类投票表态，本次判定仅按人类真实票数计算。
            </p>
          </div>
        </div>
      ) : currentCfg ? (
        <div className={`p-4 sm:p-5 rounded-2xl border ${currentCfg.cardClass} space-y-3.5`}>
          {/* 大字结论 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {currentCfg.icon}
              <span className={`text-lg sm:text-xl font-black tracking-tight ${currentCfg.textColor}`}>
                【AI表态：{currentCfg.label}】
              </span>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${currentCfg.badgeClass}`}>
              {currentCfg.badgeLabel}
            </span>
          </div>

          {/* 理由列表 */}
          <div className="space-y-1.5 text-xs text-slate-800">
            {aiData.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/75 backdrop-blur-2xs p-2.5 rounded-xl border border-white/60">
                <span className="font-bold text-amber-600 font-mono shrink-0">{idx + 1}.</span>
                <span className="leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>

          {/* 底部换个角度再评一次按钮 */}
          <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <span className="text-slate-400">
              {approval.ai_generated_at ? `已缓存 · 生成于 ${new Date(approval.ai_generated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>

            <button
              onClick={handleRegenerate}
              disabled={cooldown > 0 || loading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition active:scale-95 ${
                cooldown > 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `换个角度 (${cooldown}s)` : '换个角度再评一次'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

---

## src/components/CountdownTimer.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ deadline, status, onExpire, compact = false }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (status !== 'pending') {
      setTimeLeft(prev => ({ ...prev, isExpired: true }));
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) {
          onExpire();
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadline, status, onExpire]);

  if (status === 'approved') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-emerald-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>已通过冷静期审定</span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-rose-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
        <span>已成功劝退驳回</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-amber-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Clock className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span>冷静期已结束·正在计算</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono font-medium text-amber-700 bg-amber-100/70 border border-amber-200/80 rounded-full px-2.5 py-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
      <Clock className={`animate-spin-slow ${compact ? "w-3.5 h-3.5" : "w-4 h-4"} text-amber-600`} />
      <span>冷静期还剩 {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
    </div>
  );
}
```

---

## src/components/ShareModal.jsx

```javascript
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
```

---

## src/components/ShareGoodItemModal.jsx

```javascript
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
```

---

## src/components/ConfigModal.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, ExternalLink, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, getSupabase } from '../lib/supabase';
import { getCustomAiKey, setCustomAiKey, testGlmConnection } from '../lib/ai';

export default function ConfigModal({ onClose }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [aiKey, setAiKeyState] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [glmTesting, setGlmTesting] = useState(false);
  const [glmResult, setGlmResult] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    setAiKeyState(getCustomAiKey());
  }, []);

  const handleSave = async () => {
    saveSupabaseCredentials(url, key);
    setCustomAiKey(aiKey);
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const client = getSupabase();
    if (!client) {
      setTestResult({ success: false, message: '请先填写有效的 URL 和 Anon Key' });
      setTesting(false);
      return;
    }

    try {
      const { data, error } = await client.from('approvals').select('id').limit(1);
      if (error) {
        setTestResult({ 
          success: false, 
          message: `连接到 Supabase 失败: ${error.message} (是否已在 Supabase 执行建表 SQL？)` 
        });
      } else {
        setTestResult({ 
          success: true, 
          message: `🎉 连接成功！Supabase Realtime 实时联机已就绪，当前可正常读写！` 
        });
      }
    } catch (e) {
      setTestResult({ success: false, message: `连接异常: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  // 直接打一次后端 AI 函数，明确告诉用户走的是真 GLM 还是规则引擎
  const handleTestGlm = async () => {
    setCustomAiKey(aiKey);
    setGlmTesting(true);
    setGlmResult(null);
    try {
      setGlmResult(await testGlmConnection());
    } catch (e) {
      setGlmResult({ ok: false, reason: `测试异常：${e?.message || e}` });
    } finally {
      setGlmTesting(false);
    }
  };

  const copySqlText = async () => {
    try {
      const resp = await fetch('/supabase-schema.sql');
      const text = await resp.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch (e) {
      // 容错：如果未部署到静态目录，直接提示
      alert('已在项目根目录提供 supabase-schema.sql 文件，可直接打开复制！');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-amber-100 max-h-[90vh] overflow-y-auto text-left">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Supabase 数据库与实时联机配置</h3>
            <p className="text-xs text-slate-500">真联网多人版 · 所有人看同一份实时数据</p>
          </div>
        </div>

        {/* 步骤1：SQL建表 */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">1</span>
              第一步：在 Supabase 执行一键建表与种子数据 SQL
            </span>
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noreferrer"
              className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 underline font-medium"
            >
              打开控制台 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-amber-800/80 mb-2">
            包含 approvals 表、votes 表、comments 表、good_items 好物表、RLS 安全策略、Realtime 开启及种子数据。
          </p>
          <button
            onClick={copySqlText}
            className="w-full py-2 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-800 font-medium text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? '已复制 supabase-schema.sql 完整内容！' : '一键复制建表 SQL（直接粘贴到 SQL Editor 运行）'}</span>
          </button>
        </div>

        {/* 步骤2：填入配置 */}
        <div className="space-y-3 mb-4">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">2</span>
            第二步：填写或覆盖 Supabase API 凭据
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Project URL (网址)：</label>
            <input 
              type="text" 
              placeholder="https://xxxxxxxx.supabase.co" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Anon Public Key (公共密钥)：</label>
            <textarea 
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-amber-400 focus:bg-white transition resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              智谱 GLM API Key（选填，仅保存在本机浏览器）：
            </label>
            <input 
              type="password" 
              placeholder="填入 bigmodel.cn 控制台的 API Key" 
              value={aiKey}
              onChange={(e) => setAiKeyState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              留空时读取 Netlify 后台的 <code className="font-mono">GLM_API_KEY</code> 环境变量；两者都没有就回退到本地规则引擎。正式上线建议只配服务端环境变量。
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleTestGlm}
                disabled={glmTesting}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] rounded-xl transition flex items-center gap-1.5 disabled:opacity-60"
              >
                <Sparkles className={`w-3.5 h-3.5 ${glmTesting ? 'animate-spin' : ''}`} />
                <span>{glmTesting ? '正在请求 GLM…' : '测试 GLM 是否接通'}</span>
              </button>
              <a
                href="https://bigmodel.cn/usercenter/proj-mgmt/apikeys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-slate-500 hover:text-slate-700 underline flex items-center gap-1"
              >
                获取免费 Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {glmResult && (
              <div className={`mt-2 p-2.5 rounded-xl border text-[11px] ${
                glmResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="font-bold">
                  {glmResult.ok
                    ? `✅ GLM 已接通（${glmResult.model || 'glm-4-flash-250414'}）`
                    : '⚠️ 当前仍在用规则引擎，GLM 未生效'}
                </div>
                {glmResult.reason && (
                  <div className="mt-1 opacity-80 break-all">{glmResult.reason}</div>
                )}
                {glmResult.diagnostics && (
                  <div className="mt-1 opacity-70">
                    Key 来源：{glmResult.diagnostics.keySource} · 端点：{glmResult.diagnostics.endpointHost}
                  </div>
                )}
                {!glmResult.ok && (
                  <div className="mt-1 opacity-70">
                    配好 Key 后刷新页面，详情页会自动补刷一次真实 AI 结论。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className={`p-3 rounded-2xl mb-4 text-xs flex items-start gap-2 ${
            testResult.success 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {testResult.success ? <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            <div>{testResult.message}</div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <span>保存并建立连接</span>
          </button>
          <button
            disabled={testing}
            onClick={handleTestConnection}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>测试联机</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## src/components/OnboardingModal.jsx

```javascript
import React, { useState } from 'react';
import { Sparkles, Check, User, Dices } from 'lucide-react';
import { GENDER_OPTIONS, MBTI_OPTIONS, ZODIAC_OPTIONS } from '../lib/constants';
import { updateUserProfile, generateRandomNickname } from '../lib/user';

export default function OnboardingModal({ user, onComplete }) {
  const activeUser = user || {};
  const [nickname, setNickname] = useState(activeUser.nickname || generateRandomNickname());
  const [gender, setGender] = useState(activeUser.gender || '');
  const [mbti, setMbti] = useState(activeUser.mbti || '');
  const [zodiac, setZodiac] = useState(activeUser.zodiac || '');
  const [errorMsg, setErrorMsg] = useState('');

  const isReady = Boolean(gender && mbti && zodiac);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gender || !mbti || !zodiac) {
      setErrorMsg('请完整选择性别、MBTI 和星座，以便生成您的省思档案！');
      return;
    }

    const updated = updateUserProfile({
      nickname: nickname.trim(),
      gender,
      mbti,
      zodiac,
    });

    if (onComplete) {
      onComplete(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-100 my-auto text-left max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* 头部标题 */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-3xl shadow-md mb-2">
            👛
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            欢迎来到省思袋 ✋
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            建立您的专属匿名档案。让懂你的同频网友和 AI 在冷静期里为你把关每一笔开销！
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 昵称 */}
          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>您的匿名昵称</span>
              </label>
              <button
                type="button"
                onClick={() => setNickname(generateRandomNickname())}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Dices className="w-3 h-3" />
                <span>换一个</span>
              </button>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
              placeholder="请输入您的昵称"
            />
          </div>

          {/* 1. 性别 */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              1. 您的性别 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    gender === g
                      ? 'bg-amber-500 text-white shadow-xs glow-amber ring-2 ring-amber-300'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-amber-50/60'
                  }`}
                >
                  {gender === g && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. MBTI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                2. 您的 MBTI 人格类型 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-700">
                {mbti ? `已选: ${mbti}` : '请点击选择'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              {MBTI_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMbti(type)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                    mbti === type
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-white text-slate-700 border border-slate-200/70 hover:bg-amber-100/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 星座 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                3. 您的星座 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700">
                {zodiac ? `已选: ${zodiac}` : '请点击选择'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              {ZODIAC_OPTIONS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZodiac(z)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    zodiac === z
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-white text-slate-700 border border-slate-200/70 hover:bg-amber-100/60'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* 底部确认按钮 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isReady}
              className={`w-full py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition flex items-center justify-center gap-1.5 ${
                isReady
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 glow-amber cursor-pointer active:scale-98'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isReady ? '完成设置，进入省思袋' : '请先选齐性别、MBTI与星座'}</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              选好的资料将保存在您的本机，后续可随时在“我的”页面修改。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## src/pages/SquarePage.jsx

```javascript
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
```

---

## src/pages/CreatePage.jsx

```javascript
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Sparkles, Globe, Lock, ArrowLeft, Send, Bot, 
  AlertTriangle, Upload, X, Film, Image as ImageIcon, Tag, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { 
  CATEGORIES, GENDER_OPTIONS, MBTI_OPTIONS, MBTI_GROUPS, 
  ZODIAC_OPTIONS, EXPECTED_DURATIONS 
} from '../lib/constants';
import { getCurrentUser } from '../lib/user';
import { getSupabase } from '../lib/supabase';
import { createApproval } from '../lib/cloudStore';
import { generateInitialAiAdvice } from '../lib/ai';
import confetti from 'canvas-confetti';

export default function CreatePage() {
  const [, setLocation] = useLocation();
  const currentUser = getCurrentUser();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('数码');
  const [reason, setReason] = useState('');
  const [alternative, setAlternative] = useState('');
  const [mode, setMode] = useState('public'); // 'public' | 'group'

  // 媒体上传与预览（支持图片或视频）
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'

  // 预计使用多长时间（界面内直选，严禁弹窗）
  const [expectedDuration, setExpectedDuration] = useState('');
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  // 发起人当次身份设定（默认带上自己的性别、MBTI、星座）
  const [creatorGender, setCreatorGender] = useState(currentUser.gender || '保密');
  const [creatorMbti, setCreatorMbti] = useState(currentUser.mbti || 'INTJ');
  const [creatorZodiac, setCreatorZodiac] = useState(currentUser.zodiac || '天蝎座');

  // 希望哪些 MBTI 的人来给建议（默认不全选，支持分组收起与一键全部）
  const [targetMbtis, setTargetMbtis] = useState([]);
  const [openMbtiGroup, setOpenMbtiGroup] = useState('分析家 (NT)');

  // 冷静期时长（小时）：12, 24, 48, 72 或自定义 1-168
  const [coolingHours, setCoolingHours] = useState(24);
  const [customCooling, setCustomCooling] = useState(false);
  const [customCoolingInput, setCustomCoolingInput] = useState('');

  // 需要表态人数：5, 10, 15, 20, 30 或自定义 3-50
  const [requiredVotes, setRequiredVotes] = useState(15);
  const [customVotes, setCustomVotes] = useState(false);
  const [customVotesInput, setCustomVotesInput] = useState('');

  // AI 建议权重：0% - 100%，默认 20%
  const [aiWeight, setAiWeight] = useState(20);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 媒体文件选取处理
  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('上传文件过大，请控制在 20MB 以内');
      return;
    }

    const isVideo = file.type.startsWith('video');
    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaUrl(event.target?.result || '');
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaUrl('');
  };

  // 快速填入示范
  const fillSample = () => {
    setTitle('降噪头戴式蓝牙耳机 WH-1000XM5');
    setPrice('1899');
    setCategory('数码');
    setReason('办公室同事敲机械键盘太吵，急需物理降噪与白噪音隔绝，拯救注意力。');
    setAlternative('目前有一副入耳式AirPods，但戴超过两小时耳朵发胀疼。');
    setMode('public');
    setExpectedDuration('1年以上');
    setIsCustomDuration(false);
    setCoolingHours(24);
    setCustomCooling(false);
    setRequiredVotes(15);
    setCustomVotes(false);
    setAiWeight(20);
    setCreatorGender(currentUser.gender || '男');
    setCreatorMbti(currentUser.mbti || 'INTP');
    setCreatorZodiac(currentUser.zodiac || '天蝎座');
    setTargetMbtis(['INTJ', 'INTP', 'ENTJ', 'ENTP']);
  };

  const calculatedAiVotes = Math.round((aiWeight / 100) * requiredVotes);

  // 表单直接提交（无弹窗）
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('请填写想买的商品名称');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('请填写正确的商品价格（不能为负数）');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('请写下购买理由，让网友或朋友帮审');
      return;
    }

    // 预计使用时间校验（必选）
    let finalDuration = expectedDuration;
    if (isCustomDuration) {
      if (!customDurationInput.trim()) {
        setErrorMsg('请填写自定义的预计使用时间（例如：2年、6个月、500次）');
        return;
      }
      finalDuration = customDurationInput.trim();
    }
    if (!finalDuration) {
      setErrorMsg('请选择或输入这件商品的预计使用时间');
      return;
    }

    setSubmitting(true);

    const finalHours = customCooling 
      ? Math.max(1, Math.min(168, parseInt(customCoolingInput, 10) || 24))
      : coolingHours;

    const finalVotes = customVotes
      ? Math.max(3, Math.min(50, parseInt(customVotesInput, 10) || 15))
      : requiredVotes;

    const now = new Date();
    const deadline = new Date(now.getTime() + finalHours * 3600 * 1000).toISOString();

    const initialAi = generateInitialAiAdvice({
      title: title.trim(),
      price: parseFloat(price),
      reason: reason.trim(),
      alternative: alternative.trim(),
      creator_mbti: creatorMbti,
    });

    const newApproval = {
      title: title.trim(),
      price: parseFloat(price),
      category,
      reason: reason.trim(),
      alternative: alternative.trim(),
      mode,
      media_url: mediaUrl || null,
      media_type: mediaType || 'image',
      expected_duration: finalDuration,
      creator_gender: creatorGender,
      creator_mbti: creatorMbti,
      creator_zodiac: creatorZodiac,
      target_mbtis: targetMbtis.length > 0 ? targetMbtis : [],
      cooling_hours: finalHours,
      required_votes: finalVotes,
      max_voters: finalVotes,
      ai_weight: Math.max(0, Math.min(100, parseInt(aiWeight, 10) || 0)),
      ai_verdict: initialAi.verdict,
      ai_reasons: initialAi.reasons,
      ai_generated_at: initialAi.generated_at,
      status: 'pending',
      creator_id: currentUser.id,
      creator_nickname: currentUser.nickname,
      created_at: now.toISOString(),
      deadline,
    };

    try {
      const created = await createApproval(newApproval);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setLocation(`/approval/${created.id}?created=1`);
    } catch (err) {
      console.error('Failed to create approval:', err);
      setErrorMsg(`提交失败: ${err.message || '网络连接异常'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // MBTI 多选辅助函数
  const toggleMbti = (type) => {
    if (targetMbtis.includes(type)) {
      setTargetMbtis(targetMbtis.filter(t => t !== type));
    } else {
      setTargetMbtis([...targetMbtis, type]);
    }
  };

  const toggleAllMbti = () => {
    if (targetMbtis.length === MBTI_OPTIONS.length) {
      setTargetMbtis([]);
    } else {
      setTargetMbtis([...MBTI_OPTIONS]);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-32 md:pb-16 text-left animate-fadeIn">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2.5 rounded-xl hover:bg-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回</span>
        </button>
        <button
          onClick={fillSample}
          className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200/80 px-3 py-1 rounded-full transition flex items-center gap-1 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>一键填入示范</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-amber-100 shadow-md">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📝</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">发起一笔消费审批</h1>
          </div>
          <p className="text-xs text-slate-500">
            给自己定制冷静期。AI建议与清醒网友共同把关，对抗冲动消费！
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 商品名称 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              想买什么？ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：索尼头戴耳机、秋款复古大衣、RTX 4070显卡..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          {/* 价格与分类 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                预算金额 (¥) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">¥</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-mono text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                商品分类 <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
              >
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 核心必选：预计使用多长时间（无弹窗，界面内直接选择） */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>预计使用多长时间？</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-xs font-black text-amber-800 font-mono">
                {isCustomDuration ? (customDurationInput || '自定义填写') : (expectedDuration || '未选')}
              </span>
            </div>

            {/* 预设选项 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPECTED_DURATIONS.map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => {
                    setExpectedDuration(dur);
                    setIsCustomDuration(false);
                    setErrorMsg('');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    !isCustomDuration && expectedDuration === dur
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-amber-200/80 hover:bg-amber-100/60'
                  }`}
                >
                  {dur}
                </button>
              ))}

              {/* 自定义选项按钮 */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomDuration(true);
                  setErrorMsg('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                  isCustomDuration
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-amber-200/80 hover:bg-amber-100/60'
                }`}
              >
                ✏️ 自定义时间
              </button>
            </div>

            {/* 自定义输入框 */}
            {isCustomDuration && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="输入数字与单位，例如：2年、8个月、500次..."
                    value={customDurationInput}
                    onChange={(e) => setCustomDurationInput(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-amber-700">
                  支持任意数字与单位，如“3年”、“半年”、“使用300次以上”等。
                </p>
              </div>
            )}
          </div>

          {/* 图片 / 视频上传与预览 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              上传商品实拍、截图或视频 <span className="text-slate-400 font-normal">(选填，支持预览)</span>
            </label>

            {mediaUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-amber-200/80 bg-slate-50 p-2">
                {mediaType === 'video' ? (
                  <video src={mediaUrl} controls className="w-full max-h-56 rounded-xl object-contain bg-black" />
                ) : (
                  <img src={mediaUrl} alt="预览图片" className="w-full max-h-56 object-contain rounded-xl" />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                  title="移除媒体"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/40 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition">
                <div className="flex items-center gap-2 text-amber-600">
                  <ImageIcon className="w-5 h-5" />
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">点击上传截图、照片或视频</span>
                <span className="text-[10px] text-slate-400">发布前可实时预览，详情页中完整展示</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaChange}
                />
              </label>
            )}
          </div>

          {/* 购买理由 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              购买理由（为什么想买？能解决什么核心问题？） <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="请真诚剖析你的心动原因。如果是情绪上头，也请如实坦白，让 AI 与网友帮你灭火！"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition resize-none"
            />
          </div>

          {/* 替代方案 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                现有替代方案 / 平替现状 <span className="text-slate-400 font-normal">(选填)</span>
              </label>
              <span className="text-[11px] text-amber-700">家里有没有类似闲置？</span>
            </div>
            <input
              type="text"
              placeholder="例如：家里已有旧款可用、租借、或者二手能省多少..."
              value={alternative}
              onChange={(e) => setAlternative(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          {/* 发起人画像设置（性别、MBTI、星座）—— 优化手机排版，不再三列拥挤 */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold text-slate-800">
                👤 发起人画像 <span className="text-[11px] text-slate-400 font-normal">(默认使用个人资料，可当次微调)</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-800">
                {creatorGender} · {creatorMbti} · {creatorZodiac}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between sm:block bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-amber-200/50 sm:border-0">
                <span className="text-xs font-medium text-slate-600 sm:text-[10px] sm:text-slate-500 sm:mb-1 block whitespace-nowrap">
                  性别
                </span>
                <select
                  value={creatorGender}
                  onChange={(e) => setCreatorGender(e.target.value)}
                  className="w-36 sm:w-full bg-slate-50 sm:bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between sm:block bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-amber-200/50 sm:border-0">
                <span className="text-xs font-medium text-slate-600 sm:text-[10px] sm:text-slate-500 sm:mb-1 block whitespace-nowrap">
                  MBTI
                </span>
                <select
                  value={creatorMbti}
                  onChange={(e) => setCreatorMbti(e.target.value)}
                  className="w-36 sm:w-full bg-slate-50 sm:bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                >
                  {MBTI_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between sm:block bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-amber-200/50 sm:border-0">
                <span className="text-xs font-medium text-slate-600 sm:text-[10px] sm:text-slate-500 sm:mb-1 block whitespace-nowrap">
                  星座
                </span>
                <select
                  value={creatorZodiac}
                  onChange={(e) => setCreatorZodiac(e.target.value)}
                  className="w-36 sm:w-full bg-slate-50 sm:bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {ZODIAC_OPTIONS.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 希望哪些 MBTI 的人来给建议（默认不全选，分组折叠，不占半屏） */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>希望哪些 MBTI 的人来给建议？</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllMbti}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                    targetMbtis.length === MBTI_OPTIONS.length
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {targetMbtis.length === MBTI_OPTIONS.length ? '已选全部' : '全选 / 不限'}
                </button>
                <span className="text-[11px] text-amber-700 font-mono font-bold">
                  {targetMbtis.length === 0 ? '不限' : `已选 ${targetMbtis.length} 个`}
                </span>
              </div>
            </div>

            {/* 4 大族群分组折叠选择器 */}
            <div className="space-y-1.5 pt-1">
              {MBTI_GROUPS.filter(g => g.label !== '全部').map((grp) => {
                const isOpen = openMbtiGroup === grp.label;
                const selectedInGroup = grp.types.filter(t => targetMbtis.includes(t)).length;
                return (
                  <div key={grp.label} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenMbtiGroup(isOpen ? '' : grp.label)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{grp.label}</span>
                        {selectedInGroup > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-mono">
                            {selectedInGroup}/{grp.types.length}
                          </span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <div className="p-2.5 pt-1 bg-slate-50/50 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                        {grp.types.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleMbti(type)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                              targetMbtis.includes(type)
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 自定义冷静期时长 */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                冷静期时长：
              </label>
              <span className="text-xs font-black text-amber-700 font-mono">
                {customCooling ? `${customCoolingInput || 24} 小时 (自定义)` : `${coolingHours} 小时`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {[12, 24, 48, 72].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setCoolingHours(h);
                    setCustomCooling(false);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !customCooling && coolingHours === h
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                  }`}
                >
                  {h}小时{h === 24 ? ' (推荐)' : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomCooling(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  customCooling
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                }`}
              >
                自定义
              </button>
            </div>
            {customCooling && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="1"
                  max="168"
                  placeholder="输入 1-168 小时"
                  value={customCoolingInput}
                  onChange={(e) => setCustomCoolingInput(e.target.value)}
                  className="w-36 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500">小时 (最长可达 7 天)</span>
              </div>
            )}
          </div>

          {/* 自定义需要表态人数 */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                需要几人表态：
              </label>
              <span className="text-xs font-black text-amber-700 font-mono">
                {customVotes ? `${customVotesInput || 15} 人 (自定义)` : `${requiredVotes} 人`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {[5, 10, 15, 20, 30].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setRequiredVotes(n);
                    setCustomVotes(false);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !customVotes && requiredVotes === n
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                  }`}
                >
                  {n}人{n === 15 ? ' (默认)' : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomVotes(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  customVotes
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                }`}
              >
                自定义
              </button>
            </div>
            {customVotes && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="3"
                  max="50"
                  placeholder="输入 3-50 人"
                  value={customVotesInput}
                  onChange={(e) => setCustomVotesInput(e.target.value)}
                  className="w-36 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500">人 (3 到 50 人均可)</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              💡 注：达到设定人数或冷静期到期后将按当时票数定结果，无需死等凑够全部人数。
            </p>
          </div>

          {/* AI 建议权重滑块（分行说明，清晰不重叠） */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-amber-600" />
                <label className="text-xs font-bold text-slate-800">AI建议权重</label>
              </div>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                aiWeight > 50 
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-200 text-amber-900'
              }`}>
                {aiWeight}% {aiWeight === 0 ? '(仅供参考)' : `(折算 ${calculatedAiVotes} 票)`}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={aiWeight}
              onChange={(e) => setAiWeight(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* 说明文字独立分行排开，手机上清晰易读 */}
            <div className="space-y-1 pt-1 text-[11px] text-slate-500">
              <div className="flex items-center justify-between py-0.5 border-b border-amber-100/50">
                <span className="font-mono font-bold text-slate-700 shrink-0">0%</span>
                <span className="text-slate-500 text-right">仅展示 AI 建议与分析，不折算票数</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-amber-100/50 text-amber-800 font-medium">
                <span className="font-mono font-bold text-amber-900 shrink-0">20% (推荐)</span>
                <span className="text-right">折算部分权重票，与清醒网友共同把关</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="font-mono font-bold text-slate-700 shrink-0">100%</span>
                <span className="text-slate-500 text-right">完全由 AI 裁决主导</span>
              </div>
            </div>

            {aiWeight > 50 && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>⚠️ AI建议权重超过 50%，AI建议将占主导！</span>
              </div>
            )}
          </div>

          {/* 审批公开模式 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              审批公开模式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('public')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  mode === 'public'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'public' ? 'text-amber-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">全网广场公开</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    展示在广场，全网清醒网友与AI建议共同把关
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('group')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  mode === 'group'
                    ? 'border-purple-500 bg-purple-50/70 text-purple-950 ring-2 ring-purple-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Lock className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'group' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">专属密友审批群</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    仅通过专属链接/口令查看与投票
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 匿名身份提示 */}
          <div className="text-[11px] text-slate-400 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/60 leading-relaxed">
            💡 将以您的当前匿名身份 <span className="font-bold text-amber-900">@{currentUser.nickname}</span> 发布。发起后不可给自己的审批单投票。
          </div>

          {/* 提交按钮（居中、适度留白、宽度适中、绝不拉满贴边） */}
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full max-w-xs sm:max-w-sm py-3.5 px-6 mx-auto bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-black text-sm rounded-2xl shadow-lg glow-amber flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>正在发起审批并开启冷静期...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>立即发布审批 · 开启冷静期</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## src/pages/DetailPage.jsx

```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { 
  ArrowLeft, Clock, ThumbsUp, ThumbsDown, Eye, Share2, 
  MessageSquare, Sparkles, AlertCircle, CheckCircle2, XCircle, Send, UserCheck, ShieldAlert,
  Bot, Tag, Trash2
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
  getCachedComments, submitVote, submitComment, updateApproval,
  deleteApproval, deleteComment 
} from '../lib/cloudStore';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import confetti from 'canvas-confetti';

export default function DetailPage() {
  const [, params] = useRoute('/approval/:id');
  const approvalId = params?.id;

  const currentUser = getCurrentUser();
  const [, setLocation] = useLocation();

  const [approval, setApproval] = useState(null);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  // 删除本人发布的内容（审批单 / 讨论留言）
  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    setDeleting(true);
    const res = target.type === 'approval'
      ? await deleteApproval(target.id, currentUser.id)
      : await deleteComment(target.id, currentUser.id);
    setDeleting(false);
    setPendingDelete(null);
    if (!res.success) {
      window.alert(res.error);
      return;
    }
    if (!res.cloudSynced) {
      window.alert(res.warning || '已从本机删除，但云端同步暂时失败，其他设备可能仍能看到，请稍后重试。');
    }
    if (target.type === 'approval') {
      setLocation('/');
    } else {
      setComments(prev => prev.filter(c => c.id !== target.id));
    }
  };

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

        <div className="flex items-center gap-2">
          {isCreator && (
            <button
              onClick={() => setPendingDelete({ type: 'approval', id: approval.id, title: approval.title })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer"
              title="删除我发布的这条审批"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          )}
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px]">
                      {new Date(c.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {c.user_id === currentUser.id && (
                      <button
                        onClick={() => setPendingDelete({ type: 'comment', id: c.id, title: c.content })}
                        className="text-rose-400 hover:text-rose-600 transition cursor-pointer"
                        title="删除我的留言"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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

      {/* 删除确认 */}
      {pendingDelete && (
        <ConfirmDeleteModal
          title={pendingDelete.type === 'approval' ? '删除这条消费审批？' : '删除这条留言？'}
          message={pendingDelete.type === 'approval'
            ? '删除后整条审批、所有投票与讨论都会从全网消失，且无法恢复。'
            : '删除后这条留言会从讨论区消失，且无法恢复。'}
          detail={pendingDelete.title || ''}
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
```

---

## src/pages/RecordsPage.jsx

```javascript
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
```

---

## src/pages/MyPage.jsx

```javascript
import React, { useState } from 'react';
import { User, Edit2, Dices, Check, Sparkles, Database, Shield, RefreshCw } from 'lucide-react';
import { getCurrentUser, updateUserProfile, generateRandomNickname, resetUserProfile } from '../lib/user';
import { GENDER_OPTIONS, MBTI_OPTIONS, ZODIAC_OPTIONS } from '../lib/constants';

export default function MyPage({ onOpenConfig }) {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // 个人资料编辑表单状态
  const [editNick, setEditNick] = useState(currentUser.nickname);
  const [editGender, setEditGender] = useState(currentUser.gender || '保密');
  const [editMbti, setEditMbti] = useState(currentUser.mbti || 'INTJ');
  const [editZodiac, setEditZodiac] = useState(currentUser.zodiac || '天蝎座');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 保存个人资料
  const handleSaveProfile = (e) => {
    e?.preventDefault();
    if (!editNick.trim()) return;

    const updated = updateUserProfile({
      nickname: editNick.trim(),
      gender: editGender,
      mbti: editMbti,
      zodiac: editZodiac,
    });
    setCurrentUser(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRandomNick = () => {
    const random = generateRandomNickname();
    setEditNick(random);
  };

  const handleReset = () => {
    if (window.confirm('确定要重置当前匿名身份画像吗？将为您重新生成全新随机昵称与身份。')) {
      const reset = resetUserProfile();
      setCurrentUser(reset);
      setEditNick(reset.nickname);
      setEditGender(reset.gender || '保密');
      setEditMbti(reset.mbti || 'INTJ');
      setEditZodiac(reset.zodiac || '天蝎座');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-28 text-left max-w-2xl mx-auto animate-fadeIn">
      {/* 顶部个人身份名片 */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-amber relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl sm:text-2xl text-white">
                  @{currentUser.nickname}
                </h1>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  匿名极简ID
                </span>
              </div>
              <p className="text-xs text-amber-100 font-mono mt-0.5 opacity-90">
                用户标识：{currentUser.id.slice(0, 16)}...
              </p>

              {/* 画像徽章标签 */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-bold text-white">
                  {currentUser.gender || '保密'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-mono font-bold text-white">
                  {currentUser.mbti || 'INTJ'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-bold text-white">
                  {currentUser.zodiac || '天蝎座'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 装饰水印 */}
        <div className="absolute -right-4 -bottom-6 text-9xl opacity-15 pointer-events-none select-none">
          👝
        </div>
      </div>

      {/* 核心板块：个人资料与画像编辑 */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-100 shadow-sm text-left space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-amber-600" />
              <span>编辑个人画像与资料</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              修改您在省思袋广场发表审批、参与表态时的展示昵称与个性画像
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 animate-fadeIn flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 已保存
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* 昵称 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">展示昵称</label>
              <button
                type="button"
                onClick={handleRandomNick}
                className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1 font-bold cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>随机趣味昵称</span>
              </button>
            </div>
            <input
              type="text"
              value={editNick}
              onChange={(e) => setEditNick(e.target.value)}
              placeholder="请输入您的昵称"
              maxLength={20}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* 性别单选 */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">性别偏好</label>
            <div className="grid grid-cols-3 gap-2.5">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setEditGender(g)}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    editGender === g
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* MBTI 与 星座 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">MBTI 人格画像</label>
              <select
                value={editMbti}
                onChange={(e) => setEditMbti(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
              >
                {MBTI_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">所属星座</label>
              <select
                value={editZodiac}
                onChange={(e) => setEditZodiac(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
              >
                {ZODIAC_OPTIONS.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer mt-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>保存资料更新</span>
          </button>
        </form>
      </div>

      {/* 偏好与系统设置 */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm text-left space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-slate-600" />
          <span>系统与设置</span>
        </h2>

        <div className="space-y-3 text-xs">
          {/* 数据库配置入口 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div>
              <div className="font-bold text-slate-800">自定义数据库连接 (Supabase)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                可接入您自己的私有 Supabase 实例与 Realtime 实时订阅频道
              </div>
            </div>
            <button
              onClick={() => onOpenConfig && onOpenConfig()}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-amber-400 text-slate-700 font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0 ml-2"
            >
              配置数据库
            </button>
          </div>

          {/* 重置匿名身份 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div>
              <div className="font-bold text-slate-800">重置身份画像标识</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                清除本地当前身份缓存，重新初始化随机昵称
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0 ml-2"
            >
              重置身份
            </button>
          </div>
        </div>

        {/* 隐私与存储说明 */}
        <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100 text-[11px] text-amber-900/80 leading-relaxed flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">匿名与数据说明：</span>
            本站采用极简匿名机制，无需注册手机号或密码。您的画像与本地操作均保存在当前浏览器，并已全网自动联网同步！
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## src/pages/GoodItemsPage.jsx

```javascript
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
```

---

## netlify/functions/sync-data.js

```javascript
import { getStore } from '@netlify/blobs';

// 初始预置种子审批列表
const DEFAULT_APPROVALS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '复古腋下法棍包',
    price: 139,
    category: '穿搭',
    reason: '刷小红书被种草了，配秋天的大衣感觉超级复古好看，只要一百多块！',
    alternative: '家里已经有三个黑色腋下包了，只是五金颜色不太一样',
    mode: 'public',
    expected_duration: '6-12个月',
    cooling_hours: 24,
    required_votes: 10,
    max_voters: 10,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '家里有3个同色包还买，典型的同质化冲动消费！',
      '百元假皮背两月容易脱皮吃灰，不买立省100%。'
    ],
    ai_generated_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    status: 'rejected',
    creator_id: 'seed_user_1',
    creator_nickname: '秋天想喝奶茶',
    creator_gender: '女',
    creator_mbti: 'INFP',
    creator_zodiac: '天秤座',
    target_mbtis: ['INTJ', 'ENTJ', 'INFJ'],
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: '二手索尼 A7M3 全画幅微单 (快门2000)',
    price: 8000,
    category: '数码',
    reason: '准备接拍毕业照和客单接单摄影，算过账拍4场就能回本，二手价格比原价省了4000！',
    alternative: '目前用手机拍，弱光和长焦虚化完全达不到商用要求',
    mode: 'public',
    expected_duration: '1年以上',
    cooling_hours: 24,
    required_votes: 15,
    max_voters: 15,
    ai_weight: 20,
    ai_verdict: 'buy',
    ai_reasons: [
      '属于生产力投资而非纯消费，有明确接单回本测算！',
      '二手残值保值率极高，快门2000成色优异，支持搞钱。'
    ],
    ai_generated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'approved',
    creator_id: 'seed_user_2',
    creator_nickname: '快门工匠阿伟',
    creator_gender: '男',
    creator_mbti: 'ISTP',
    creator_zodiac: '狮子座',
    target_mbtis: [],
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: '三模热插拔客制化机械键盘',
    price: 399,
    category: '数码',
    reason: '现在的键盘声音太吵了，这个是静音麻将音，办公室用很舒服，还有RGB旋钮！',
    alternative: '原来的薄膜键盘虽然手感一般，但没坏还能正常用',
    mode: 'public',
    expected_duration: '1年以上',
    cooling_hours: 12,
    required_votes: 8,
    max_voters: 8,
    ai_weight: 20,
    ai_verdict: 'buy',
    ai_reasons: [
      '静音麻将音确实能显著提升每天上班工位打字幸福感，长远实用，AI投支持票。'
    ],
    ai_generated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_3',
    creator_nickname: '工位摸鱼冠军',
    creator_gender: '男',
    creator_mbti: 'INTP',
    creator_zodiac: '水瓶座',
    target_mbtis: ['INTJ', 'ENTP'],
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: '七分甜超大杯杨枝甘露 (加多份啵啵)',
    price: 15,
    category: '其他',
    reason: '今天周五加班到八点半，心理防线崩溃，极度需要高糖多巴胺救命！！',
    alternative: '喝工位的免费白开水加茶包，但毫无心理慰藉作用',
    mode: 'public',
    expected_duration: '不到1个月',
    cooling_hours: 1,
    required_votes: 5,
    max_voters: 5,
    ai_weight: 20,
    ai_verdict: 'skip',
    ai_reasons: [
      '高糖高热量易发胖，心理慰藉只能维持十分钟，AI坚定投反对票劝退！'
    ],
    ai_generated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: 'pending',
    creator_id: 'seed_user_4',
    creator_nickname: '周五只想下班',
    creator_gender: '女',
    creator_mbti: 'ENFP',
    creator_zodiac: '巨蟹座',
    target_mbtis: [],
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_VOTES = [
  {
    id: 'v_seed_1',
    approval_id: '11111111-1111-1111-1111-111111111111',
    voter_id: 'voter_seed_1',
    voter_nickname: '断舍离大师',
    choice: 'skip',
    reason: '同质化太严重了，黑色包有一个就够用三年，快跑！',
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
  },
  {
    id: 'v_seed_2',
    approval_id: '22222222-2222-2222-2222-222222222222',
    voter_id: 'voter_seed_2',
    voter_nickname: '创业老哥',
    choice: 'buy',
    reason: '生产力工具买就完了，算清楚投资回报比就大胆冲！',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_COMMENTS = [
  {
    id: 'c_seed_1',
    approval_id: '33333333-3333-3333-3333-333333333333',
    user_id: 'user_seed_commenter',
    user_nickname: '外设发烧友',
    content: '手感不错，不过如果不急的话可以等等双十一再凑单。',
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_GOOD_ITEMS = [
  {
    id: 'g-001',
    title: '人体工学网布办公椅（带自适应腰托）',
    price: 699,
    reason: '程序员久坐腰酸救星！换了这个椅子之后连续敲代码 4 小时不腰疼，腰托支撑非常到位，千元内无敌！',
    image_url: '/office-chair.jpg',
    creator_id: 'u_seed_good_1',
    creator_nickname: '不腰疼的打工人',
    creator_gender: '男',
    creator_mbti: 'INTJ',
    creator_zodiac: '天秤座',
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-002',
    title: '手冲咖啡便携保温杯 (450ml)',
    price: 89,
    reason: '保温效果极其强悍，放了一整天下午喝还是烫的。双层陶瓷内胆不串味，天天自己带咖啡，一个月省下600奶茶钱！',
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_2',
    creator_nickname: '手冲拿铁患者',
    creator_gender: '女',
    creator_mbti: 'ENFP',
    creator_zodiac: '双鱼座',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'g-003',
    title: '真无线骨传导运动耳机',
    price: 329,
    reason: '跑步安全感拉满，完全不堵耳道，流汗也不容易滋生细菌。音质虽然比不上头戴式，但夜跑听歌和听播客完全够用！',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    creator_id: 'u_seed_good_3',
    creator_nickname: '夜跑阿哲',
    creator_gender: '男',
    creator_mbti: 'ISTP',
    creator_zodiac: '白羊座',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  }
];

// 本地内存回退（在本地开发无 Netlify Blobs 环境下工作）
let memoryState = {
  approvals: [...DEFAULT_APPROVALS],
  votes: [...DEFAULT_VOTES],
  comments: [...DEFAULT_COMMENTS],
  goodItems: [...DEFAULT_GOOD_ITEMS],
  deletedIds: [],
};

// 云端删除墓碑上限，避免 Blob 无限膨胀
const MAX_DELETED_IDS = 500;

/**
 * 归一化历史数据。
 * 早期版本写入的 Blob 可能缺少 goodItems / comments / votes / deletedIds，
 * 若不补全，删除与 ?limit= 分支会对 undefined 调用 find / slice 而返回 500。
 */
function normalizeData(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  return {
    ...safe,
    approvals: Array.isArray(safe.approvals) ? safe.approvals : [...DEFAULT_APPROVALS],
    votes: Array.isArray(safe.votes) ? safe.votes : [...DEFAULT_VOTES],
    comments: Array.isArray(safe.comments) ? safe.comments : [...DEFAULT_COMMENTS],
    goodItems: Array.isArray(safe.goodItems) ? safe.goodItems : [...DEFAULT_GOOD_ITEMS],
    deletedIds: Array.isArray(safe.deletedIds) ? safe.deletedIds : [],
  };
}

function isDeleted(data, id) {
  return Boolean(id) && data.deletedIds.includes(id);
}

function markDeleted(data, id) {
  if (!id) return;
  data.deletedIds = [...data.deletedIds.filter(x => x !== id), id].slice(-MAX_DELETED_IDS);
}

function getBlobStore() {
  try {
    return getStore({ name: 'sengsidai-store', consistency: 'strong' });
  } catch (e) {
    return null;
  }
}

async function loadAllData() {
  const store = getBlobStore();
  if (!store) return normalizeData(memoryState);

  try {
    const raw = await store.get('all_data', { type: 'json' });
    if (raw && typeof raw === 'object' && Array.isArray(raw.approvals)) {
      const data = normalizeData(raw);
      // 自动修复旧的好物图片链接
      data.goodItems = data.goodItems.map(item => {
        if (item.id === 'g-001' || (item.title && item.title.includes('办公椅'))) {
          if (!item.image_url || item.image_url.includes('1580481077197') || item.image_url.includes('unsplash.com')) {
            return { ...item, image_url: '/office-chair.jpg' };
          }
        }
        return item;
      });
      return data;
    }
    // 初次使用，写入初始数据
    const initData = normalizeData({
      approvals: DEFAULT_APPROVALS,
      votes: DEFAULT_VOTES,
      comments: DEFAULT_COMMENTS,
      goodItems: DEFAULT_GOOD_ITEMS,
    });
    await store.setJSON('all_data', initData);
    return initData;
  } catch (err) {
    console.warn('[SyncData] Netlify Blob read error, fallback to memory:', err);
    return normalizeData(memoryState);
  }
}

async function saveAllData(data) {
  memoryState = data;
  const store = getBlobStore();
  if (store) {
    try {
      await store.setJSON('all_data', data);
    } catch (err) {
      console.warn('[SyncData] Netlify Blob save error:', err);
    }
  }
}

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === 'GET') {
      const data = await loadAllData();

      // 可选参数 ?limit=N：供 Coze 等第三方插件限制响应体大小。
      // 不传时保持全量返回，前端广场 / 战绩 / 详情页行为完全不变。
      let limit = null;
      try {
        const raw = new URL(req.url).searchParams.get('limit');
        if (raw !== null) {
          const n = parseInt(raw, 10);
          if (Number.isFinite(n) && n > 0) limit = Math.min(200, n);
        }
      } catch {
        // req.url 异常时退化为全量，不影响原有调用方
      }

      // deletedIds 是服务端内部墓碑，不暴露给前端 / Coze，避免无谓增大响应体
      const publicData = { ...data };
      delete publicData.deletedIds;

      const payload = limit
        ? {
            approvals: publicData.approvals.slice(0, limit),
            votes: publicData.votes.slice(0, limit * 20),
            comments: publicData.comments.slice(0, limit * 20),
            goodItems: publicData.goodItems.slice(0, limit),
          }
        : publicData;

      return new Response(JSON.stringify({ success: true, data: payload }), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, payload } = body;
      const data = await loadAllData();

      if (action === 'create_approval') {
        // 新增审批帖子
        const newApproval = {
          ...payload,
          id: payload.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
          status: payload.status || 'pending',
        };
        if (isDeleted(data, newApproval.id)) {
          return new Response(JSON.stringify({ success: true, approval: newApproval, skipped: true }), { status: 200, headers });
        }
        data.approvals = [newApproval, ...data.approvals.filter(a => a.id !== newApproval.id)];
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, approval: newApproval }), { status: 200, headers });
      }

      if (action === 'update_approval') {
        data.approvals = data.approvals.map(a => a.id === payload.id ? { ...a, ...payload } : a);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === 'create_vote') {
        const newVote = {
          ...payload,
          id: payload.id || `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
        };
        // 同一人对同一帖子改票，先过滤旧票
        // 已删除的投票、或已删除审批单下迟到的投票，都不再写回
        if (isDeleted(data, newVote.id) || isDeleted(data, newVote.approval_id)) {
          return new Response(JSON.stringify({ success: true, vote: newVote, skipped: true }), { status: 200, headers });
        }
        data.votes = [
          newVote,
          ...data.votes.filter(v => !(v.approval_id === newVote.approval_id && v.voter_id === newVote.voter_id))
        ];
        // 如果投票附带了单子状态更新
        if (payload._settleApproval) {
          data.approvals = data.approvals.map(a => 
            a.id === payload._settleApproval.id ? { ...a, ...payload._settleApproval } : a
          );
        }
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, vote: newVote }), { status: 200, headers });
      }

      if (action === 'create_comment') {
        const newComment = {
          ...payload,
          id: payload.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
        };
        // 已删除的留言、或已删除审批单下迟到的留言，都不再写回
        if (isDeleted(data, newComment.id) || isDeleted(data, newComment.approval_id)) {
          return new Response(JSON.stringify({ success: true, comment: newComment, skipped: true }), { status: 200, headers });
        }
        data.comments = [...data.comments, newComment];
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, comment: newComment }), { status: 200, headers });
      }

      if (action === 'create_good_item') {
        const newGoodItem = {
          ...payload,
          id: payload.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: payload.created_at || new Date().toISOString(),
        };
        if (isDeleted(data, newGoodItem.id)) {
          return new Response(JSON.stringify({ success: true, goodItem: newGoodItem, skipped: true }), { status: 200, headers });
        }
        data.goodItems = [newGoodItem, ...data.goodItems.filter(g => g.id !== newGoodItem.id)];
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, goodItem: newGoodItem }), { status: 200, headers });
      }

      // 删除本人发布的审批单：级联清理该单的投票与讨论，避免留下孤儿数据
      if (action === 'delete_approval') {
        const id = payload?.id;
        const userId = payload?.userId;
        const target = data.approvals.find(a => a.id === id);
        if (!target) {
          // 幂等：云端已无此条（创建请求迟到 / 其他设备已删），仍登记墓碑防止被复活
          markDeleted(data, id);
          await saveAllData(data);
          return new Response(JSON.stringify({ success: true, deleted: id, alreadyGone: true }), { status: 200, headers });
        }
        if (!userId || target.creator_id !== userId) {
          return new Response(JSON.stringify({ success: false, error: '只能删除自己发布的内容' }), { status: 403, headers });
        }
        markDeleted(data, id);
        data.approvals = data.approvals.filter(a => a.id !== id);
        data.votes = data.votes.filter(v => v.approval_id !== id);
        data.comments = data.comments.filter(c => c.approval_id !== id);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, deleted: id }), { status: 200, headers });
      }

      // 删除本人发布的好物分享
      if (action === 'delete_good_item') {
        const id = payload?.id;
        const userId = payload?.userId;
        const target = data.goodItems.find(g => g.id === id);
        if (!target) {
          markDeleted(data, id);
          await saveAllData(data);
          return new Response(JSON.stringify({ success: true, deleted: id, alreadyGone: true }), { status: 200, headers });
        }
        if (!userId || target.creator_id !== userId) {
          return new Response(JSON.stringify({ success: false, error: '只能删除自己发布的内容' }), { status: 403, headers });
        }
        markDeleted(data, id);
        data.goodItems = data.goodItems.filter(g => g.id !== id);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, deleted: id }), { status: 200, headers });
      }

      // 删除本人发布的讨论留言
      if (action === 'delete_comment') {
        const id = payload?.id;
        const userId = payload?.userId;
        const target = data.comments.find(c => c.id === id);
        if (!target) {
          markDeleted(data, id);
          await saveAllData(data);
          return new Response(JSON.stringify({ success: true, deleted: id, alreadyGone: true }), { status: 200, headers });
        }
        if (!userId || target.user_id !== userId) {
          return new Response(JSON.stringify({ success: false, error: '只能删除自己发布的留言' }), { status: 403, headers });
        }
        markDeleted(data, id);
        data.comments = data.comments.filter(c => c.id !== id);
        await saveAllData(data);
        return new Response(JSON.stringify({ success: true, deleted: id }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    console.error('[SyncData Function Error]', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Server error' }), { status: 500, headers });
  }
};
```

---

## netlify/functions/ai-recommend.js

```javascript
// Netlify Serverless Function: ai-recommend
// 真实 GLM 大模型推理 + 无 Key / 调用失败时的规则引擎保底
//
// 设计要点：
// 1. 无论走哪条路径都返回 source 字段（"glm" / "fallback"），前端能明确区分真模型与本地规则；
// 2. configured 恒为 true 表示「AI 建议可用」，保持对旧前端的向后兼容，不要用它判断有没有接 Key；
// 3. 所有失败原因经 safeError 脱敏后才返回，绝不回显 API Key；
// 4. GLM 调用带 AbortController 超时，避免上游挂住拖垮 Netlify Function（也避免白烧额度）；
// 5. API Key 只从服务端环境变量或请求体里的自定义 Key 读取，绝不能放进 VITE_ 前端变量。

const DEFAULT_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
// 模型选型（2026-11-05 实测）：glm-4.7-flash 虽是较新的免费模型，但免费通道频繁返回
// 429「该模型当前访问量过大」，且它带思维链，token 可能被 reasoning_content 吃光导致
// content 为空、JSON 解析失败。glm-4-flash-250414 同为官方免费文本模型，无思维链、
// 响应干净、连续调用稳定，故设为默认。需要更强模型可在 Netlify 后台用 AI_MODEL 覆盖。
const DEFAULT_MODEL = "glm-4-flash-250414";
const LLM_TIMEOUT_MS = 7000; // Netlify 同步 Function 默认超时约 10s，留出重试余量
const RETRY_DELAY_MS = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  };
}

// 脱敏：截断 + 抹掉任何形似密钥 / Bearer 串，防止把 Key 回显到浏览器。
// 上游（例如 401 Invalid API Key）常会把收到的 Key 原样回显，所以除了通用正则，
// 还要拿当前实际使用的 Key 做精确替换，并覆盖「只回显前/后 8 位」的情况。
function safeError(message, apiKey = "") {
  let out = String(message || "").slice(0, 260);
  const key = String(apiKey || "").trim();
  if (key) {
    out = out.split(key).join("***");
    if (key.length >= 12) {
      out = out.split(key.slice(0, 8)).join("***").split(key.slice(-8)).join("***");
    }
  }
  return out
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/sk-[\w-]{6,}/gi, "sk-***")
    .replace(/[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{6,}/g, "***");
}

// 模型偶尔会带 markdown 围栏或前后废话，这里只取最外层 JSON 对象
function extractJson(text) {
  let s = String(text || "").trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

async function callGlm({ apiKey, endpoint, model, prompt }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: "你是一个精打细算、反冲动消费但支持合理悦己的清醒朋友。严格输出合法 JSON 格式，不要输出任何解释性文字。",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      let detail = "";
      try {
        detail = (await resp.text()).slice(0, 240);
      } catch (e) {
        detail = "";
      }
      return {
        ok: false,
        retryable: resp.status === 429 || resp.status >= 500,
        reason: `上游返回 HTTP ${resp.status}${detail ? "：" + safeError(detail, apiKey) : ""}`,
      };
    }

    const raw = await resp.json();
    const content = raw?.choices?.[0]?.message?.content || "";
    if (!content) {
      return { ok: false, reason: "上游响应缺少 choices[0].message.content" };
    }

    let parsed;
    try {
      parsed = extractJson(content);
    } catch (e) {
      return { ok: false, reason: `模型返回不是合法 JSON：${safeError(content, apiKey)}` };
    }

    // 站内有 think 历史数据，统一归一到 skip（AI 不弃权）
    const verdict =
      parsed.verdict === "buy"
        ? "buy"
        : parsed.verdict === "skip" || parsed.verdict === "think"
          ? "skip"
          : null;
    if (!verdict) {
      return { ok: false, reason: `模型 verdict 非法：${safeError(parsed.verdict, apiKey)}` };
    }

    const reasons = (Array.isArray(parsed.reasons) ? parsed.reasons : [parsed.reasons])
      .filter((r) => typeof r === "string" && r.trim())
      .map((r) => r.trim().slice(0, 120))
      .slice(0, 3);
    if (reasons.length < 2) {
      return { ok: false, reason: "模型给出的理由少于 2 条" };
    }

    return { ok: true, verdict, reasons, model: raw?.model || model };
  } catch (e) {
    const isTimeout = e?.name === "AbortError";
    return {
      ok: false,
      retryable: true,
      reason: isTimeout
        ? `GLM 请求超时（超过 ${LLM_TIMEOUT_MS / 1000} 秒）`
        : `GLM 调用异常：${safeError(e?.message, apiKey)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "ok" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    body = {};
  }

  const {
    title = "",
    price = 0,
    category = "数码",
    reason = "",
    alternative = "",
    approve_count = 0,
    reject_count = 0,
    spectate_count = 0,
    owned_ratio = 0,
    creator_mbti = "",
  } = body;

  // Key 优先级：智谱专用 > 通用 > 其他兼容 provider > 浏览器里用户自填的 Key
  const envKey =
    process.env.GLM_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY;
  const customKey = typeof body.custom_api_key === "string" ? body.custom_api_key : "";
  const apiKey = envKey || customKey;
  const keySource = envKey
    ? process.env.GLM_API_KEY
      ? "server:GLM_API_KEY"
      : process.env.AI_API_KEY
        ? "server:AI_API_KEY"
        : "server:other"
    : customKey
      ? "browser:custom_api_key"
      : "none";

  const endpoint = process.env.AI_BASE_URL || DEFAULT_ENDPOINT;
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  let endpointHost = endpoint;
  try {
    endpointHost = new URL(endpoint).host;
  } catch (e) {
    endpointHost = "invalid-url";
  }

  const diagnostics = {
    hasKey: Boolean(apiKey && apiKey.trim()),
    keySource,
    provider: endpointHost.includes("bigmodel.cn") ? "zhipu-glm" : "openai-compatible",
    endpointHost,
    model,
    timeoutMs: LLM_TIMEOUT_MS,
  };

  let fallbackReason = "";

  if (apiKey && apiKey.trim()) {
    const prompt = `你是一个帮年轻人理性消费、对抗冲动剁手的“人间清醒”好朋友。
请针对这笔消费审批进行把关点评：
【商品名称】：${title || "未命名商品"}
【预算价格】：¥${price || 0}
【商品分类】：${category || "其他"}
【心动理由】：${reason || "无"}
【平替/现状】：${alternative || "无平替"}
【发起人MBTI】：${creator_mbti || "未知"}
【当前投票】：${approve_count}人支持买，${reject_count}人劝退驳回，${spectate_count}人围观
【投票网友中已有类似商品的比例】：${Math.round(Number(owned_ratio) * 100)}%

请根据上述信息，综合评估“这是真实刚需/具备实际价值，还是纯粹情绪消费/跟风/吃灰预定”。
你必须明确给出你的立场，支持还是反对，严禁弃权或模棱两可：
请严格输出合法的 JSON 格式，不要包含任何 markdown 代码块或解释说明：
{
  "verdict": "buy" | "skip",
  "reasons": [
    "第1条理由（口语化、接地气、幽默、像朋友当面吐槽或鼓励）",
    "第2条理由",
    "第3条理由"
  ]
}
注意：
1. verdict 必须是 "buy"（支持购买，AI将投支持票）或 "skip"（反对购买，AI将投反对票）二者之一，不可为其他值！
2. reasons 为 2 到 3 条简明精辟的理由（每条40字以内），切中要害。`;

    try {
      let llm = await callGlm({ apiKey, endpoint, model, prompt });
      // 429 / 5xx / 超时是偶发故障，短等后重试一次；401/400 这类确定性错误直接回退，不浪费时间
      if (!llm.ok && llm.retryable) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        llm = await callGlm({ apiKey, endpoint, model, prompt });
      }
      if (llm.ok) {
        return json(200, {
          configured: true,
          source: "glm",
          model: llm.model,
          verdict: llm.verdict,
          reasons: llm.reasons,
          generated_at: new Date().toISOString(),
          diagnostics: { ...diagnostics, upstreamStatus: "ok" },
        });
      }
      fallbackReason = llm.reason;
    } catch (e) {
      fallbackReason =
        e?.name === "AbortError"
          ? `GLM 请求超时（超过 ${LLM_TIMEOUT_MS / 1000} 秒）`
          : `GLM 调用异常：${safeError(e?.message, apiKey)}`;
    }
    console.warn("[ai-recommend] 真实模型未生效，回落规则引擎：", fallbackReason);
  } else {
    fallbackReason = "未配置 GLM_API_KEY（Netlify 环境变量与站内自定义 Key 均为空）";
  }

  // 规则引擎保底：永远秒级返回，保证演示不出现空白卡片
  const generated = generateSmartRecommendation({
    title,
    price: Number(price) || 0,
    category,
    reason,
    alternative,
    approve_count,
    reject_count,
    spectate_count,
    owned_ratio,
    creator_mbti,
  });

  return json(200, {
    configured: true,
    source: "fallback",
    verdict: generated.verdict,
    reasons: generated.reasons,
    generated_at: new Date().toISOString(),
    fallback_reason: fallbackReason,
    diagnostics: { ...diagnostics, upstreamStatus: "fallback" },
  });
};

function generateSmartRecommendation({ title, price, category, reason, alternative, approve_count, reject_count, owned_ratio, creator_mbti }) {
  const numPrice = Number(price) || 0;
  const reasonText = (reason || "").toLowerCase();
  const altText = (alternative || "").toLowerCase();

  const isImpulse = /冲动|头脑一热|上头|好看|刷到|被种草|颜值|限量|降价|秒杀|打折/.test(reasonText);
  const isEmotional = /心情不好|压力大|犒劳|解压|郁闷|加班|好累|奖励自己/.test(reasonText);
  const isUtility = /生产力|效率|工作|学习|考研|降噪|运动|健康|颈椎|腰酸|刚需|坏了/.test(reasonText);
  const hasAlternative = altText.length > 3 && !/没有|暂无|无|买不起|借不到/.test(altText);

  let verdict = "skip";
  const reasons = [];

  // 1. 劝退反对逻辑 (skip)
  if ((isImpulse || isEmotional) && !isUtility && numPrice > 100) {
    verdict = "skip";
    reasons.push(`典型的情绪补偿型消费。当前价格 ¥${numPrice} 不低，情绪褪去后大概率沦为闲置吃灰。`);
    if (hasAlternative) {
      reasons.push(`既然已有现有替代品（${alternative}），先物尽其用，不要为了短暂的新鲜感重复添置。`);
    } else {
      reasons.push(`不如先放进冷静期满 24 小时，这笔钱留着吃几顿大餐或存起来更有确定感。`);
    }
    if (reject_count > approve_count) {
      reasons.push(`现场网友劝退率偏高，群众的眼睛是雪亮的，AI投反对票带头劝退！`);
    }
  }
  // 2. 支持放行逻辑 (buy)：明确生产力、高频刚需，且替代品不足
  else if (isUtility && (!hasAlternative || numPrice < 300)) {
    verdict = "buy";
    reasons.push(`属于能提升日常效率或身心健康的实用型投入，对日常生活的正面改善明确。`);
    if (numPrice <= 300) {
      reasons.push(`预算在合理区间内，只要能坚持使用哪怕三个月，折算单次使用成本也微乎其微。`);
    } else {
      reasons.push(`核心痛点明确，只要确认购买后能立即投入日常主力使用，AI投支持票！`);
    }
    if (approve_count >= reject_count) {
      reasons.push(`网友多数也认为值得一试，理智放行，买完记得物尽其用别闲置！`);
    }
  }
  // 3. 其他非刚需场景一律投反对票（AI省思袋的核心职责就是防冲动劝退）
  else {
    verdict = "skip";
    if (hasAlternative) {
      reasons.push(`现有替代方案尚能应对，升级带来的边际体验提升可能远小于 ¥${numPrice} 的实际支出。`);
    } else {
      reasons.push(`这件物品的新鲜感期通常较短，AI坚定投反对票劝退，省下就是赚到。`);
    }
    reasons.push(`建议至少等到设定的冷静期倒计时走完，如果那时仍觉得非它不可再买也不迟。`);
  }

  // 限制 2~3 条理由
  const finalReasons = reasons.slice(0, 3);
  if (finalReasons.length < 2) {
    finalReasons.push("冷静期内多听听同频网友的真实避坑体验，让理性跑赢冲动！");
  }

  return { verdict, reasons: finalReasons };
}
```

---


---

## src/components/ConfirmDeleteModal.jsx

```jsx
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
```

---

## .env.example

```ini
# Supabase 配置（从 Supabase 项目控制台 Settings -> API 获取）
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ------------------------------------------------------------
# 智谱 GLM 大模型（服务端专用）
# 配置位置：Netlify 后台 -> Site configuration -> Environment variables
# 重要：这些变量故意不加 VITE_ 前缀！加了会被 Vite 打进前端产物，导致 Key 公开泄露。
#      它们只在 netlify/functions/ai-recommend.js 里通过 process.env 读取。
# 默认模型 glm-4-flash-250414（官方免费、无思维链、实测稳定）。
# glm-4.7-flash 免费通道常返 429「该模型当前访问量过大」，需要时再用 AI_MODEL 切回。
# Key 申请：https://bigmodel.cn/usercenter/proj-mgmt/apikeys
GLM_API_KEY=

# 可选：切换到其他 OpenAI 兼容端点 / 模型（例如 GLM Coding Plan 专属端点）
# AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
# AI_MODEL=glm-4-flash-250414

# 兼容别名（优先级低于 GLM_API_KEY，一般不用填）
# AI_API_KEY=
# DEEPSEEK_API_KEY=
# OPENAI_API_KEY=
```
