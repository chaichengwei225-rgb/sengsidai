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
