import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['path', 'fs', 'buffer', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
    {
      // kuromoji が dict/*.dat.gz を XHR で取得する際、Vite (sirv) が
      // 自動で Content-Encoding: gzip を付与しブラウザが透過解凍してしまうため
      // kuromoji 内の zlib 解凍が失敗する。pre フックで sirv より先に手動 serve。
      name: 'kuromoji-dict-raw',
      enforce: 'pre' as const,
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0]
          if (url && /^\/dict\/[a-z0-9_]+\.dat\.gz$/.test(url)) {
            try {
              const filePath = path.join(__dirname, 'public', url)
              const data = await readFile(filePath)
              res.setHeader('Content-Type', 'application/octet-stream')
              res.setHeader('Content-Length', String(data.length))
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
              res.end(data)
              return
            } catch {
              // fall through
            }
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5180,
  },
  optimizeDeps: {
    include: ['kuromoji'],
  },
  define: {
    global: 'globalThis',
  },
  build: {
    // bundle audit 2026-05-29: main chunk が 740kB (gzip 213kB) と大きく
    // Vite から warning が出ていた。vendor を機能別に分割して並列 fetch +
    // ブラウザ cache hit rate を上げる。recharts (約 300kB) / lucide (50kB)
    // / react ecosystem を別 chunk にすると、ページ間で同じ vendor が
    // 再ダウンロードされない。
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'recharts-vendor': ['recharts'],
          'icons-vendor': ['lucide-react'],
          'utils-vendor': ['clsx', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
