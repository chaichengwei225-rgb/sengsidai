// Supabase Edge Function: ai-recommend
//
// 用途：给 GitHub Pages 这类纯静态托管提供 AI 推理入口。
// 前端 src/lib/ai.js 在检测到 Supabase URL 时会自动改调这里
// （`${VITE_SUPABASE_URL}/functions/v1/ai-recommend`），无需自有后端。
//
// 设计要点（与 netlify/functions/ai-recommend.js 保持同一口径）：
// 1. 返回 source 字段区分真模型与回落，前端能明确显示来源；
// 2. 失败一律返回 configured:false，由前端 clientSmartAiEngine 本地兜底，不会开天窗；
// 3. 错误信息经 safeError 脱敏，绝不回显 API Key；
// 4. 模型用 glm-4-flash-250414 —— 免费通道稳定，glm-4.7-flash 实测频繁 429。
//
// 部署：supabase functions deploy ai-recommend
// 密钥：supabase secrets set GLM_API_KEY=你的key

const DEFAULT_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_MODEL = "glm-4-flash-250414";
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

// 截断 + 抹掉形似密钥的内容；上游 401 常会回显收到的 Key
function safeError(message: unknown, apiKey = "") {
  let out = String(message ?? "").slice(0, 260);
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

// 模型偶尔带 markdown 围栏或前后废话，只取最外层 JSON
function extractJson(text: string) {
  let s = String(text || "").trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

type GlmResult =
  | { ok: true; verdict: string; reasons: string[]; model: string }
  | { ok: false; retryable: boolean; reason: string };

async function callGlm(opts: {
  apiKey: string;
  endpoint: string;
  model: string;
  prompt: string;
}): Promise<GlmResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(opts.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content:
              "你是一个精打细算、反冲动消费但支持合理悦己的清醒朋友。严格输出合法 JSON 格式，不要输出任何解释性文字。",
          },
          { role: "user", content: opts.prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      let detail = "";
      try {
        detail = (await resp.text()).slice(0, 240);
      } catch (_e) {
        detail = "";
      }
      return {
        ok: false,
        retryable: resp.status === 429 || resp.status >= 500,
        reason: `上游返回 HTTP ${resp.status}${detail ? "：" + safeError(detail, opts.apiKey) : ""}`,
      };
    }

    const raw = await resp.json();
    const content = raw?.choices?.[0]?.message?.content || "";
    if (!content) {
      return { ok: false, retryable: false, reason: "上游响应缺少 content" };
    }

    let parsed: { verdict?: string; reasons?: unknown };
    try {
      parsed = extractJson(content);
    } catch (_e) {
      return { ok: false, retryable: false, reason: "模型返回不是合法 JSON" };
    }

    const verdict =
      parsed.verdict === "buy"
        ? "buy"
        : parsed.verdict === "skip" || parsed.verdict === "think"
          ? "skip"
          : null;
    if (!verdict) {
      return { ok: false, retryable: false, reason: "模型 verdict 非法" };
    }

    const rawReasons = Array.isArray(parsed.reasons) ? parsed.reasons : [parsed.reasons];
    const reasons = rawReasons
      .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      .map((r) => r.trim().slice(0, 120))
      .slice(0, 3);
    if (reasons.length < 2) {
      return { ok: false, retryable: false, reason: "模型给出的理由少于 2 条" };
    }

    return { ok: true, verdict, reasons, model: raw?.model || opts.model };
  } catch (e) {
    const isTimeout = (e as Error)?.name === "AbortError";
    return {
      ok: false,
      retryable: true,
      reason: isTimeout
        ? `GLM 请求超时（超过 ${TIMEOUT_MS / 1000} 秒）`
        : `GLM 调用异常：${safeError((e as Error)?.message, opts.apiKey)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  const apiKey = Deno.env.get("GLM_API_KEY") || "";
  if (!apiKey.trim()) {
    return json(200, {
      configured: false,
      source: "fallback",
      error: "NO_KEY",
      message: "服务端未配置 GLM_API_KEY，已由前端本地规则引擎接管",
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_e) {
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
  } = body as Record<string, string | number>;

  const endpoint = Deno.env.get("AI_BASE_URL") || DEFAULT_ENDPOINT;
  const model = Deno.env.get("AI_MODEL") || DEFAULT_MODEL;

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

请综合评估这是真实刚需还是情绪消费，必须明确站队，严禁弃权。
严格输出合法 JSON，不要包含 markdown 代码块：
{
  "verdict": "buy" | "skip",
  "reasons": ["第1条理由", "第2条理由", "第3条理由"]
}
要求：verdict 只能是 buy 或 skip；reasons 为 2 到 3 条，每条 40 字以内，口语化、切中要害。`;

  let result = await callGlm({ apiKey, endpoint, model, prompt });
  // 429 / 5xx / 超时属于偶发，短等后重试一次
  if (!result.ok && result.retryable) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    result = await callGlm({ apiKey, endpoint, model, prompt });
  }

  if (result.ok) {
    return json(200, {
      configured: true,
      source: "glm",
      model: result.model,
      verdict: result.verdict,
      reasons: result.reasons,
      generated_at: new Date().toISOString(),
    });
  }

  // 失败交给前端本地规则引擎兜底，这里只如实回报原因
  return json(200, {
    configured: false,
    source: "fallback",
    error: "GLM_FAILED",
    message: result.reason,
  });
});
