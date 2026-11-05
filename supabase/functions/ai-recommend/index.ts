// Supabase Edge Function: ai-recommend
// 调用智谱 GLM-4.7-Flash 免费模型为冲动消费审批提供智能决策点评

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // 处理预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GLM_API_KEY");
    if (!apiKey || !apiKey.trim()) {
      return new Response(
        JSON.stringify({
          configured: false,
          error: "NO_KEY",
          message: "站长还没接 AI，投票先顶上",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const {
      title,
      price,
      category,
      reason,
      alternative,
      approve_count = 0,
      reject_count = 0,
      spectate_count = 0,
      owned_ratio = 0,
    } = await req.json();

    const prompt = `你是一个帮年轻人理性消费、对抗冲动剁手的“人间清醒”毒舌又贴心的好朋友。
请针对以下这笔消费审批进行把关点评：

【商品名称】：${title || "未命名商品"}
【预算价格】：¥${price || 0}
【商品分类】：${category || "其他"}
【心动理由】：${reason || "无"}
【平替/现状】：${alternative || "无平替"}
【当前网友投票】：${approve_count}人支持买，${reject_count}人劝退驳回，${spectate_count}人围观
【投票网友中已有类似商品的比例】：${Math.round(Number(owned_ratio) * 100)}%

请根据上述信息，综合评估“这到底是真实生产力/刚需/值得犒劳，还是纯粹情绪消费/智商税/吃灰预定”。
请输出严格的 JSON 格式，不要包含任何 markdown 代码块外部的文字：
{
  "verdict": "buy" | "skip" | "think",
  "reasons": [
    "第1条理由（口语化、接地气、幽默、像朋友当面吐槽或鼓励）",
    "第2条理由",
    "第3条理由"
  ]
}

注意：
- verdict 只能是 "buy"（建议买）、"skip"（建议不买/劝退）、"think"（再想想/待定）之一。
- reasons 必须是 2 到 3 条简短精辟的理由（每条40字以内），别端着官腔，可以带点网络梗或扎心大实话。`;

    const glmResponse = await fetch(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "glm-4.7-flash",
          messages: [
            {
              role: "system",
              content:
                "你是一个精打细算、反冲动消费但支持合理悦己的好朋友。输出必须是合法 JSON 字符串。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!glmResponse.ok) {
      const errText = await glmResponse.text();
      console.error("GLM API Error:", errText);
      return new Response(
        JSON.stringify({
          configured: false,
          error: "API_ERROR",
          message: "AI 暂时走神了，本次只按人类票算",
          details: errText,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const glmData = await glmResponse.json();
    const rawContent = glmData.choices?.[0]?.message?.content || "{}";

    let parsedResult;
    try {
      // 兼容可能带有 markdown 围栏的情形
      const cleanJson = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw content:", rawContent);
      parsedResult = {
        verdict: "think",
        reasons: ["AI 分析遇到格式解析微调，建议参考下方网友投票意见。"],
      };
    }

    // 格式纠偏
    const verdict = ["buy", "skip", "think"].includes(parsedResult.verdict)
      ? parsedResult.verdict
      : "think";
    const reasons = Array.isArray(parsedResult.reasons) && parsedResult.reasons.length > 0
      ? parsedResult.reasons.slice(0, 3)
      : ["别被商家宣传语洗脑，再冷静 24 小时看看心动值是否还在！"];

    return new Response(
      JSON.stringify({
        configured: true,
        verdict,
        reasons,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Unexpected function error:", error);
    return new Response(
      JSON.stringify({
        configured: false,
        error: "INTERNAL_ERROR",
        message: "AI 暂时走神了，本次只按人类票算",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
