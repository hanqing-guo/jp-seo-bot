// 上部ヘッダー:ロゴ + サービス名のみ(日本語専用)。言語切替・site 選択器・Sidebar 切替は無し。

import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'

export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-xs">
            <BarChart3 className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
              SEO運用アシスタント
              <span className="ml-1.5 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 align-middle">サンプルデモ</span>
            </div>
            <div className="text-[10px] text-slate-500">保存先: このブラウザのみ</div>
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-xs font-semibold text-brand-700">
          <Link to="/audit" className="hover:text-brand-900">URL診断デモ</Link>
          <a href="/" className="hover:text-brand-900">サービス案内へ</a>
        </nav>
      </div>
    </header>
  )
}
