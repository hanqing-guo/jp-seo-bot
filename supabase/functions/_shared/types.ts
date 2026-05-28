// 診断モジュール共通型
// DIAGNOSIS_SPEC.md §3.1 TechnicalCheckResult を全 module で共有

export type CheckLevel = 'critical' | 'warning' | 'info' | 'passed'
export type CheckEngine = 'google' | 'yahoo' | 'common'

export interface TechnicalCheckResult {
  checkId: string
  level: CheckLevel
  title: string
  description: string
  fixSuggestion: string
  currentValue?: string
  idealValue?: string
  scoreImpact: number   // 負数 (例: -15) で減点を表現
}

export interface DiagnosisItem extends TechnicalCheckResult {
  engine: CheckEngine
  category: string
}

export interface ScoreBreakdown {
  total: number
  google: number
  yahoo: number
  technical: number
  onpage: number
  content: number
  backlink: number
  mobile: number
}

export interface DiagnosisResponse {
  sessionId: string
  url: string
  scores: ScoreBreakdown
  items: DiagnosisItem[]
  summary: string
  quickWins: string[]
  criticalCount: number
  warningCount: number
}

export interface DiagnosisError {
  error: {
    code: string
    message: string
  }
}
