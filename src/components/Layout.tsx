// 3 画面 MVP のレイアウト:Sidebar 廃止、上部ヘッダーのみ。

import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Topbar />
      <main translate="no" className="flex-1 px-4 md:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        JP SEO Bot — enki
      </footer>
    </div>
  )
}
