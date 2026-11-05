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
                    ? `✅ GLM 已接通（${glmResult.model || 'glm-4.7-flash'}）`
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
