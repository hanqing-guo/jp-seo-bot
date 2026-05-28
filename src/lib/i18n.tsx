import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'ja' | 'en' | 'zh'

type Dict = Record<string, { ja: string; en: string; zh: string }>

const DICT: Dict = {
  'app.title': { ja: 'JP SEO Bot', en: 'JP SEO Bot', zh: 'JP SEO Bot' },
  'app.tagline': {
    ja: '日本市場特化 SEO プラットフォーム',
    en: 'Japan-market SEO platform',
    zh: '日本市场专属 SEO 平台',
  },

  'nav.dashboard': { ja: 'ダッシュボード', en: 'Dashboard', zh: '仪表盘' },
  'nav.keywords': { ja: 'キーワード分析', en: 'Keywords', zh: '关键词分析' },
  'nav.content': { ja: 'コンテンツ生成', en: 'Content', zh: '内容生成' },
  'nav.rank': { ja: 'ランキング追跡', en: 'Rank Tracker', zh: '排名追踪' },
  'nav.audit': { ja: 'サイト診断', en: 'Site Audit', zh: '站点诊断' },
  'nav.competitor': { ja: '競合分析', en: 'Competitors', zh: '竞品分析' },
  'nav.report': { ja: 'レポート', en: 'Reports', zh: '报告' },
  'nav.settings': { ja: '設定', en: 'Settings', zh: '设置' },
  'nav.backlinks': { ja: '被リンク', en: 'Backlinks', zh: '外链' },
  'nav.meo': { ja: 'MEO対策', en: 'MEO (Local)', zh: 'MEO 本地优化' },
  'nav.wordpress': { ja: 'WordPress 連携', en: 'WordPress', zh: 'WordPress 接入' },
  'nav.calendar': { ja: 'コンテンツカレンダー', en: 'Content Calendar', zh: '内容日历' },
  'nav.schema': { ja: 'Schema ジェネレーター', en: 'Schema Generator', zh: 'Schema 生成器' },

  'group.core': { ja: 'コア機能', en: 'Core', zh: '核心功能' },
  'group.jp': { ja: '日本市場特化', en: 'Japan-specific', zh: '日本市场专属' },

  'common.save': { ja: '保存', en: 'Save', zh: '保存' },
  'common.cancel': { ja: 'キャンセル', en: 'Cancel', zh: '取消' },
  'common.generate': { ja: '生成', en: 'Generate', zh: '生成' },
  'common.analyze': { ja: '分析', en: 'Analyze', zh: '分析' },
  'common.copy': { ja: 'コピー', en: 'Copy', zh: '复制' },
  'common.copied': { ja: 'コピーしました', en: 'Copied', zh: '已复制' },
  'common.upload': { ja: 'アップロード', en: 'Upload', zh: '上传' },
  'common.download': { ja: 'ダウンロード', en: 'Download', zh: '下载' },
  'common.delete': { ja: '削除', en: 'Delete', zh: '删除' },
  'common.edit': { ja: '編集', en: 'Edit', zh: '编辑' },
  'common.add': { ja: '追加', en: 'Add', zh: '添加' },
  'common.search': { ja: '検索', en: 'Search', zh: '搜索' },
  'common.loading': { ja: '読み込み中…', en: 'Loading…', zh: '加载中…' },
  'common.status': { ja: 'ステータス', en: 'Status', zh: '状态' },
  'common.actions': { ja: '操作', en: 'Actions', zh: '操作' },
  'common.preview': { ja: 'プレビュー', en: 'Preview', zh: '预览' },
  'common.connected': { ja: '接続済み', en: 'Connected', zh: '已连接' },
  'common.disconnected': { ja: '未接続', en: 'Disconnected', zh: '未连接' },
  'common.published': { ja: '公開中', en: 'Published', zh: '已发布' },
  'common.draft': { ja: '下書き', en: 'Draft', zh: '草稿' },

  'topbar.lang': { ja: '言語', en: 'Language', zh: '语言' },
  'topbar.site': { ja: 'サイト', en: 'Site', zh: '站点' },
  'topbar.addsite': { ja: '新規サイト追加', en: 'Add site', zh: '新增站点' },

  // Weekday headers (calendar) — Chrome 自動翻訳が「木→树」等の誤訳を引き起こすため
  // i18n + translate="no" の二段防御で対応
  'weekday.sun': { ja: '日', en: 'Sun', zh: '日' },
  'weekday.mon': { ja: '月', en: 'Mon', zh: '一' },
  'weekday.tue': { ja: '火', en: 'Tue', zh: '二' },
  'weekday.wed': { ja: '水', en: 'Wed', zh: '三' },
  'weekday.thu': { ja: '木', en: 'Thu', zh: '四' },
  'weekday.fri': { ja: '金', en: 'Fri', zh: '五' },
  'weekday.sat': { ja: '土', en: 'Sat', zh: '六' },
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
    document.documentElement.lang = lang
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
