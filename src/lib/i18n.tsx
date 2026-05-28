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

  // Weekday headers (calendar)
  'weekday.sun': { ja: '日', en: 'Sun', zh: '日' },
  'weekday.mon': { ja: '月', en: 'Mon', zh: '一' },
  'weekday.tue': { ja: '火', en: 'Tue', zh: '二' },
  'weekday.wed': { ja: '水', en: 'Wed', zh: '三' },
  'weekday.thu': { ja: '木', en: 'Thu', zh: '四' },
  'weekday.fri': { ja: '金', en: 'Fri', zh: '五' },
  'weekday.sat': { ja: '土', en: 'Sat', zh: '六' },

  // ===== Page titles =====
  'page.dashboard.title': { ja: 'ダッシュボード', en: 'Dashboard', zh: '仪表盘' },
  'page.dashboard.subtitle': { ja: '主要 SEO 指標の概観', en: 'Overview of key SEO metrics', zh: 'SEO 关键指标总览' },
  'page.keywords.title': { ja: 'キーワード分析', en: 'Keyword Analysis', zh: '关键词分析' },
  'page.keywords.subtitle': { ja: '日本語形態素解析 (§A) + 共起語 + 検索ボリューム/順位', en: 'JP morphological analysis (§A) + co-occurrence + volume/rank', zh: '日语形态素分析 (§A) + 共现词 + 搜索量/排名' },
  'page.content.title': { ja: 'コンテンツ生成 & スコアリング', en: 'Content Studio & Scoring', zh: '内容生成与评分' },
  'page.content.subtitle': { ja: 'JAPAN_SPEC §H 詳細スコア (12 項目) を実時間で算出', en: 'JAPAN_SPEC §H 12-item live scoring', zh: 'JAPAN_SPEC §H 12 项实时评分' },
  'page.rank.title': { ja: 'ランキング追跡', en: 'Rank Tracker', zh: '排名追踪' },
  'page.rank.subtitle': { ja: '月次の検索順位推移', en: 'Monthly search rank trend', zh: '每月搜索排名走势' },
  'page.audit.title': { ja: 'サイト診断', en: 'Site Audit', zh: '站点诊断' },
  'page.audit.subtitle': { ja: '技術 SEO / オンページ / モバイル / 表示速度の総合監査', en: 'Tech SEO / on-page / mobile / speed audit', zh: '技术 SEO / 页面 / 移动端 / 速度综合审计' },
  'page.competitor.title': { ja: '競合分析', en: 'Competitors', zh: '竞品分析' },
  'page.competitor.subtitle': { ja: '競合ドメインの DR / オーガニック流入 / 共通キーワード', en: 'Competitor DR / organic traffic / shared keywords', zh: '竞品域名 DR / 自然流量 / 共同关键词' },
  'page.report.title': { ja: 'レポート', en: 'Reports', zh: '报告' },
  'page.report.subtitle': { ja: '月次・週次サマリーの自動生成と配信', en: 'Monthly/weekly summary auto-generation', zh: '月度/周度报告自动生成' },
  'page.settings.title': { ja: '設定', en: 'Settings', zh: '设置' },
  'page.settings.subtitle': { ja: 'サイト情報・API キー・データリセット', en: 'Site info, API keys, data reset', zh: '站点信息 / API 密钥 / 数据重置' },
  'page.backlinks.title': { ja: '被リンク戦略プランナー', en: 'Backlink Planner', zh: '外链策略规划' },
  'page.backlinks.subtitle': { ja: '日本特有の被リンク獲得チャネル 26 件 (JAPAN_SPEC §B 原文) を活用', en: 'JP-specific 26 backlink channels (JAPAN_SPEC §B)', zh: '日本特有外链获取渠道 26 项 (JAPAN_SPEC §B)' },
  'page.meo.title': { ja: 'MEO 対策', en: 'MEO (Local Search)', zh: 'MEO 本地优化' },
  'page.meo.subtitle': { ja: 'Googleビジネスプロフィール / Yahoo!ロコ / エキテン 最適化', en: 'Google Business Profile / Yahoo Loco / Ekiten optimization', zh: 'Google 商家档案 / Yahoo Loco / Ekiten 优化' },
  'page.wordpress.title': { ja: 'WordPress 連携', en: 'WordPress Integration', zh: 'WordPress 接入' },
  'page.wordpress.subtitle': { ja: 'WP REST API + Application Password 認証。Yoast / Rank Math / AIOSEO / SEO SIMPLE PACK 対応', en: 'WP REST API + Application Password. Yoast / Rank Math / AIOSEO / SEO SIMPLE PACK', zh: 'WP REST API + Application Password。支持 Yoast / Rank Math / AIOSEO / SEO SIMPLE PACK' },
  'page.calendar.title': { ja: 'コンテンツカレンダー', en: 'Content Calendar', zh: '内容日历' },
  'page.calendar.subtitle': { ja: 'JAPAN_CONTENT_CALENDAR (季節イベント) と連動した発信スケジュール', en: 'Publishing schedule tied to JP seasonal events', zh: '与日本季节事件联动的发布日程' },
  'page.schema.title': { ja: 'Schema Markup ジェネレーター', en: 'Schema Markup Generator', zh: 'Schema 标记生成器' },
  'page.schema.subtitle': { ja: '日本市場で効果的な 5 種類の JSON-LD を生成', en: 'Generate 5 JSON-LD types effective in JP market', zh: '生成 5 类对日本市场有效的 JSON-LD' },

  // ===== Search intent =====
  'intent.informational': { ja: '情報', en: 'Info', zh: '信息' },
  'intent.commercial': { ja: '商業', en: 'Commercial', zh: '商业' },
  'intent.navigational': { ja: '指名', en: 'Navigational', zh: '导航' },
  'intent.transactional': { ja: '取引', en: 'Transaction', zh: '交易' },

  // ===== Severity (audit) =====
  'severity.critical': { ja: '重大', en: 'Critical', zh: '严重' },
  'severity.warning': { ja: '警告', en: 'Warning', zh: '警告' },
  'severity.info': { ja: '情報', en: 'Info', zh: '提示' },

  // ===== Article status =====
  'article.status.published': { ja: '公開中', en: 'Published', zh: '已发布' },
  'article.status.in_review': { ja: 'レビュー', en: 'In Review', zh: '审核中' },
  'article.status.draft': { ja: '下書き', en: 'Draft', zh: '草稿' },

  // ===== Backlink status / category / strength / linkType =====
  'backlink.status.not_registered': { ja: '未登録', en: 'Not registered', zh: '未登记' },
  'backlink.status.in_progress': { ja: '進行中', en: 'In progress', zh: '进行中' },
  'backlink.status.registered': { ja: '登録済', en: 'Registered', zh: '已登记' },
  'backlink.status.failed': { ja: '失敗', en: 'Failed', zh: '失败' },
  'backlink.category.blog': { ja: 'ブログ', en: 'Blog', zh: '博客' },
  'backlink.category.press_release': { ja: 'プレスリリース', en: 'Press release', zh: '新闻稿' },
  'backlink.category.comparison': { ja: '比較サイト', en: 'Comparison', zh: '比较网站' },
  'backlink.category.portal': { ja: 'ポータル / MEO', en: 'Portal / MEO', zh: '门户 / MEO' },
  'backlink.category.community': { ja: 'コミュニティ / 技術', en: 'Community / Tech', zh: '社区 / 技术' },
  'backlink.category.authoritative': { ja: '権威機関', en: 'Authoritative', zh: '权威机构' },
  'backlink.strength.low': { ja: '低', en: 'Low', zh: '低' },
  'backlink.strength.medium': { ja: '中', en: 'Medium', zh: '中' },
  'backlink.strength.high': { ja: '高', en: 'High', zh: '高' },
  'backlink.strength.very_high': { ja: '極めて高', en: 'Very high', zh: '极高' },
  'backlink.strength.critical': { ja: '最重要', en: 'Critical', zh: '关键' },
  'backlink.linkType.dofollow': { ja: 'dofollow', en: 'dofollow', zh: 'dofollow' },
  'backlink.linkType.nofollow': { ja: 'nofollow', en: 'nofollow', zh: 'nofollow' },
  'backlink.linkType.nofollow_mostly': { ja: 'nofollow 主体', en: 'mostly nofollow', zh: '主要 nofollow' },
  'backlink.linkType.mixed': { ja: '混在', en: 'mixed', zh: '混合' },

  // ===== Audit category =====
  'audit.category.technical': { ja: '技術', en: 'Technical', zh: '技术' },
  'audit.category.on-page': { ja: 'オンページ', en: 'On-page', zh: '页面内' },
  'audit.category.content': { ja: 'コンテンツ', en: 'Content', zh: '内容' },
  'audit.category.mobile': { ja: 'モバイル', en: 'Mobile', zh: '移动端' },
  'audit.category.speed': { ja: '表示速度', en: 'Speed', zh: '加载速度' },

  // ===== Calendar status =====
  'calendar.status.planned': { ja: '計画中', en: 'Planned', zh: '计划中' },
  'calendar.status.in_progress': { ja: '執筆中', en: 'In progress', zh: '撰写中' },
  'calendar.status.published': { ja: '公開済', en: 'Published', zh: '已发布' },
  'calendar.status.cancelled': { ja: '中止', en: 'Cancelled', zh: '已取消' },

  // ===== WP post status =====
  'wp.status.publish': { ja: '公開中', en: 'Published', zh: '已发布' },
  'wp.status.draft': { ja: '下書き', en: 'Draft', zh: '草稿' },
  'wp.status.pending': { ja: '保留中', en: 'Pending', zh: '待审' },
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
    // 注:html[lang] を動的に "zh"/"en" に変えると Chrome auto-translate が
    // 「日本語/中文」→「日本人/中国人」のように誤起動するため "ja" 固定。
    // 実 i18n は useT() で完結する。
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
