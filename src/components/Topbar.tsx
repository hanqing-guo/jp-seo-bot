import { useState } from 'react'
import { ChevronDown, Globe, Plus } from 'lucide-react'
import { useT, type Lang } from '../lib/i18n'
import { useStore } from '../store/StoreProvider'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
]

export default function Topbar() {
  const { lang, setLang, t } = useT()
  const { sites, currentSiteId, setCurrentSiteId, addSite } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [industry, setIndustry] = useState('SaaS / BtoB')
  const currentSite = sites.find(s => s.id === currentSiteId)

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    addSite({ name, url, industry, language: 'ja' })
    setName('')
    setUrl('')
    setShowAdd(false)
  }

  return (
    <header className="relative flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
          {t('topbar.site')}
        </label>
        <div className="relative">
          <select
            value={currentSiteId}
            onChange={e => setCurrentSiteId(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        </div>
        {currentSite ? (
          <span className="hidden xl:inline text-xs text-slate-400 truncate max-w-[180px]">{currentSite.url}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 whitespace-nowrap"
        >
          <Plus className="size-3.5" />
          {t('topbar.addsite')}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Globe className="size-4 text-slate-400" />
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {LANGS.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLang(l.value)}
              className={
                'px-3 py-1 rounded-md transition-colors ' +
                (lang === l.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {showAdd ? (
        <div className="absolute right-6 top-16 z-30 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <form onSubmit={submitAdd} className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">サイト名</label>
              <input
                className="pill-input w-full mt-1"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="株式会社○○"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">URL</label>
              <input
                className="pill-input w-full mt-1"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                type="url"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">業種</label>
              <input
                className="pill-input w-full mt-1"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn-ghost"
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {t('common.add')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </header>
  )
}
