import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'ja' | 'en' | 'zh'

type Dict = Record<string, { ja: string; en: string; zh: string }>

const DICT: Dict = {
  'app.title': { ja: 'JP SEO Bot', en: 'JP SEO Bot', zh: 'JP SEO Bot' },
  'app.tagline': {
    ja: '日本市場特化 SEO 自動化',
    en: 'Japan-market SEO automation',
    zh: '日本市场 SEO 自动化',
  },
}

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const Ctx = createContext<I18nCtx | null>(null)
const STORAGE_KEY = 'jp-seo-bot:lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'ja'
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'en' || v === 'zh' || v === 'ja' ? v : 'ja'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    // html[lang] は "ja" 固定。Chrome auto-translate 誤起動防止。
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  const t = useCallback(
    (key: string) => {
      const entry = DICT[key]
      if (!entry) return key
      return entry[lang] ?? entry.ja ?? key
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useT() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useT must be used inside I18nProvider')
  return ctx
}
