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
            ? `GLM 实时推理 · ${glmModel || 'glm-4.7-flash'}`
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
