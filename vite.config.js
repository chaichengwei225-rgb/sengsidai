import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import Module from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// 开发态把 netlify/functions/ai-recommend.js 直接挂到 /api/ai-recommend。
// 这样 `npm run dev` 一条命令就能跑真实 GLM，不需要 `netlify dev`（本机 Netlify CLI
// 未登录时会报 "Failed retrieving user account: Unauthorized"），也不需要重新部署。
// 注意：Function 文件是 CommonJS，而项目 package.json 是 "type": "module"，
// 所以必须显式用 Module._compile 以 CJS 语义加载，直接 require/import 都会失败。
function localAiFunction(mode) {
  return {
    name: 'local-ai-function',
    configureServer(server) {
      const fnPath = resolve(process.cwd(), 'netlify/functions/ai-recommend.js')

      const loadHandler = () => {
        const mod = new Module(fnPath)
        mod.filename = fnPath
        mod.paths = Module._nodeModulePaths(dirname(fnPath))
        mod._compile(readFileSync(fnPath, 'utf8'), fnPath)
        return mod.exports.handler
      }

      server.middlewares.use('/api/ai-recommend', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end('ok')
          return
        }
        if (req.method !== 'POST') return next()

        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', async () => {
          // 每次请求重读 .env，改 Key 后无需重启 dev server。
          // 只注入非 VITE_ 变量；VITE_ 前缀的由 Vite 自己处理，且绝不能把 Key 暴露给前端。
          const env = loadEnv(mode, process.cwd(), '')
          for (const [key, value] of Object.entries(env)) {
            if (!key.startsWith('VITE_')) process.env[key] = value
          }
          try {
            const out = await loadHandler()({ httpMethod: 'POST', body: raw, headers: req.headers })
            res.statusCode = out.statusCode || 200
            for (const [key, value] of Object.entries(out.headers || {})) res.setHeader(key, value)
            res.end(out.body)
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: String(err?.message || err) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages 子路径部署时由 CI 注入 VITE_BASE（例如 /sengsidai/），默认根路径
  base: process.env.VITE_BASE || '/',
  plugins: [
    tailwindcss(),
    react(),
    localAiFunction(mode),
  ],
}))
