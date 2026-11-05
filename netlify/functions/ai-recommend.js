// Netlify Serverless Function: ai-recommend
// 统一 AI 建议推理端点：支持多模型 API Key，也具备无 Key 智能语义推演保底

exports.handler = async function (event, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "ok",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
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

  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GLM_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    body.custom_api_key;

  // 如果配置了大模型 API Key，尝试在线请求大模型
  if (apiKey && apiKey.trim()) {
    try {
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

      // 默认优先请求 GLM 或 OpenAI 兼容格式
      const endpoint = process.env.AI_BASE_URL || "https://open.bigmodel.cn/api/paas/v4/chat/completions";
      const model = process.env.AI_MODEL || "glm-4.7-flash";

      const apiResp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "你是一个精打细算、反冲动消费但支持合理悦己的清醒朋友。严格输出合法 JSON 格式。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (apiResp.ok) {
        const rawJson = await apiResp.json();
        const content = rawJson.choices?.[0]?.message?.content || "";
        const cleanJson = content.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.verdict && Array.isArray(parsed.reasons)) {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              configured: true,
              verdict: parsed.verdict,
              reasons: parsed.reasons,
              generated_at: new Date().toISOString(),
            }),
          };
        }
      }
    } catch (llmErr) {
      console.warn("External LLM call failed, falling back to smart heuristic engine:", llmErr);
    }
  }

  // 智能语义推演引擎保底（无需外部 Key，永远秒级高水准响应）
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

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      configured: true,
      verdict: generated.verdict,
      reasons: generated.reasons,
      generated_at: new Date().toISOString(),
    }),
  };
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
