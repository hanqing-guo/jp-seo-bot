import { defineConfig, type Connect } from 'vite'
import react from '@vitejs/plugin-react'

// 本番(Vercel)は vercel.json の rewrite(/app/(.*) → /app.html)が SPA の深いパスを
// 捌くが、dev / preview サーバーには対応する回退が無く、/app/new 等を直接開く・
// リロードすると LP(index.html)が表示されていた。dev / preview でも同じ回退を行う。
function appSpaFallback(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    if (req.url && /^\/app(\/|$|\?)/.test(req.url)) req.url = '/app.html'
    next()
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'app-spa-fallback',
      configureServer(server) {
        server.middlewares.use(appSpaFallback())
      },
      configurePreviewServer(server) {
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
