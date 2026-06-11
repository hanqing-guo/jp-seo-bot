import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
