// 上部ヘッダー:ロゴ + 言語切替のみ。site 選択器も Sidebar 切替ボタンも無し。

import { Link } from 'react-router-dom'
import { Globe, Sparkles } from 'lucide-react'
import { useT, type Lang } from '../lib/i18n'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
]

export default function Topbar() {
  const { lang, setLang, t } = useT()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
              {t('app.title')}
            </div>
            <div className="text-[10px] text-slate-500">{t('app.tagline')}</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Globe className="size-4 text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {LANGS.map(l => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLang(l.value)}
                className={
                  'px-2.5 py-1 rounded-md transition-colors ' +
                  (lang === l.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
