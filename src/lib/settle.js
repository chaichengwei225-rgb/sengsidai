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
