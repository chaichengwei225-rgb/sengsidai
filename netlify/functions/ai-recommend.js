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
