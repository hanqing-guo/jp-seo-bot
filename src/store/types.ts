// SEO運用アシスタント — 公開デモ用の最小型定義

export type DifficultyTier = 'easy' | 'medium' | 'hard'

export interface MonthlyTask {
  /** 1-indexed sample workflow step (legacy field name retained for stored data) */
  monthNumber: number
  /** タスクの短い説明 */
  label: string
  /** Legacy field retained for stored demo data; public pilot pricing is separate. */
  budgetYen: number
  status: 'planned' | 'in_progress' | 'done'
}

export interface RankSnapshot {
  date: string      // YYYY-MM-DD
  google: number | null
  yahoo: number | null
}

export interface Keyword {
  id: string
  keyword: string
  /** KD 0-100 */
  difficulty: number
  tier: DifficultyTier
  /** Sample workflow step count (legacy field name retained for stored data). */
  targetMonths: number
  /** Legacy field; not a price or subscription quote. */
  monthlyBudgetYen: number
  /** 開始月から経過した月数 */
  elapsedMonths: number
  /** 今月実行中のタスク */
  currentTaskLabel: string
  /** 月別タスク全件(履歴 + 予定) */
  monthlyTasks: MonthlyTask[]
  /** 直近の Google Japan 順位 */
  googleRank: number | null
  /** 直近の Yahoo Japan 順位 */
  yahooRank: number | null
  /** 順位履歴(直近 12 ヶ月分) */
  rankHistory: RankSnapshot[]
  /** 追加日 ISO */
  createdAt: string
}

export interface Faq {
  q: string
  a: string
}

export interface GeneratedArticle {
  id: string
  title: string
  markdown: string
  /** 'deepseek' | 'claude' | 'template' */
  provider: string
  /** SEO メタディスクリプション(120 字程度)。生成時のみ。 */
  metaDescription?: string
  /** よくある質問。本文 FAQ + FAQPage JSON-LD に使う。 */
  faq?: Faq[]
  /** 共起語・関連キーワード(内部リンク候補)。 */
  relatedKeywords?: string[]
  createdAt: string
}
