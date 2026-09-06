import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { handleUrlAuditRequest } from './api/url-audit'

// 本番(Vercel)は vercel.json の rewrite(/app/(.*) → /app.html)が SPA の深いパスを
// 捌くが、dev / preview サーバーには対応する回退が無く、/app/new 等を直接開く・
// リロードすると LP(index.html)が表示されていた。dev / preview でも同じ回退を行う。
function appSpaFallback(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    if (req.url && /^\/app(\/|$|\?)/.test(req.url)) req.url = '/app.html'
    next()
  }
}

// Vite itself does not normally run Vercel functions. Expose only the bounded,
// no-login public-page audit locally so the real entry/report flow can be tested
// in dev and preview. Private pilot APIs remain unavailable here.
function localUrlAudit(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/url-audit') return next()
    const chunks: Uint8Array[] = []
    let size = 0
    for await (const chunk of req) {
      const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
      size += bytes.byteLength
      if (size > 2_200) {
        res.statusCode = 413
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE' }))
        return
      }
      chunks.push(bytes)
    }
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item))
      else if (value !== undefined) headers.set(key, value)
    }
    const body = chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined
    const request = new Request(`http://localhost${req.url ?? '/api/url-audit'}`, {
      method: req.method,
      headers,
      body,
    })
    const response = await handleUrlAuditRequest(request)
    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    res.end(Buffer.from(await response.arrayBuffer()))
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'app-spa-fallback',
      configureServer(server) {
        server.middlewares.use(localUrlAudit())
        server.middlewares.use(appSpaFallback())
      },
      configurePreviewServer(server) {
        server.middlewares.use(localUrlAudit())
        server.middlewares.use(appSpaFallback())
      },
    },
  ],
  server: {
    port: 5180,
  },
  build: {
    // vendor を機能別に分割して並列 fetch + ブラウザ cache hit rate を上げる。
    rollupOptions: {
      // マルチページ:/ = 静的 LP(index.html)、/app = SPA ツール(app.html)
      input: {
        main: 'index.html',
        app: 'app.html',
      },
      output: {
        // Vite 8 (rolldown) は manualChunks の Object 形式非対応 → 関数形式
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'icons-vendor'
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler')
          )
            return 'react-vendor'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
