// Vercel Serverless Function 适配层：/api/sync-data
//
// 原函数 netlify/functions/sync-data.js 已经是 Web API 风格
// （export default async (req) => Response），Vercel 可直接承接，这里只做转发。
//
// 存储说明：
//   原实现用 @netlify/blobs，在 Vercel 上 getStore() 会抛错，
//   但源码里 getBlobStore() 已 catch 并回落到进程内 memoryState。
//   由于 Serverless 每次冷启动内存清空，Vercel 上这份数据不持久 ——
//   生产环境请配置 Supabase（前端 cloudStore 会优先走 Supabase 分支），
//   或改用 Vercel Blob / Upstash 持久化。
export { default } from '../netlify/functions/sync-data.js';
