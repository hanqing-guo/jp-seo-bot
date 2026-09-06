// 3 画面 MVP のレイアウト:Sidebar 廃止、上部ヘッダーのみ。

import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Topbar />
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-900">
        これはログイン不要のサンプルデモです。初期のキーワード・順位・タスクは架空の例で、入力内容はこのブラウザにだけ保存されます。機密情報やログイン情報を入力しないでください。
      </div>
      <main translate="no" className="flex-1 px-4 md:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        SEO運用アシスタント — <a className="underline hover:text-brand-700" href="mailto:canadaleiluo@gmail.com">お問い合わせ・データ削除</a> ・ <a className="underline hover:text-brand-700" href="/terms/">利用規約</a> ・ <a className="underline hover:text-brand-700" href="/privacy/">プライバシー</a>
      </footer>
    </div>
  )
}
