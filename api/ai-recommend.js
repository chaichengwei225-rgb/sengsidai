// Vercel Serverless Function 适配层：/api/ai-recommend
//
// netlify/functions/ai-recommend.js 已统一为 Web API 风格
// （export default async (request) => Response），Vercel 与 Netlify 共用同一份实现，
// 这里只做路径转发，不复制逻辑。
//
// Vercel 环境变量（Project Settings → Environment Variables）：
//   GLM_API_KEY   智谱 API Key（必填，否则回落本地规则引擎）
//   AI_MODEL      可选，默认 glm-4-flash-250414
//   AI_BASE_URL   可选，切换其他 OpenAI 兼容端点
export { default } from '../netlify/functions/ai-recommend.js';
