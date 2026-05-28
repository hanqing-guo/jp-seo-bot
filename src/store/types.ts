// JP SEO Bot v2 — 3 画面 MVP 用の最小型定義

export type DifficultyTier = 'easy' | 'medium' | 'hard'

export interface MonthlyTask {
  /** 1-indexed (1 = 開始月, 2 = 2 ヶ月目, …) */
  monthNumber: number
  /** タスクの短い説明 */
  label: string
  /** 月内の予算配分(円) */
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
  /** 1 ページ目到達までの目標月数(3 / 6 / 10) */
  targetMonths: number
  /** 月額予算(円) */
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
