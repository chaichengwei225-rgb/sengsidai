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
