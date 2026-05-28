// スコアリングアルゴリズム
// DIAGNOSIS_SPEC.md §9.1 完全実装。

import type { DiagnosisItem, ScoreBreakdown } from '../_shared/types.ts'

const SCORE_WEIGHTS = {
  technical: 0.20,
  onpage:    0.25,
  content:   0.15,
  backlink:  0.15,
  google:    0.15,
  yahoo:     0.10,
} as const

const MOBILE_RELATED_CHECKS = new Set(['mobile_viewport', 'lcp', 'cls', 'inp'])

export function calculateScores(allItems: DiagnosisItem[]): ScoreBreakdown {
  const base = 100

  const deduct = {
    technical: 0,
    onpage: 0,
    content: 0,
    backlink: 0,
    google: 0,
    yahoo: 0,
  }

  for (const item of allItems) {
    const d = Math.abs(item.scoreImpact)
    if (item.engine === 'common') {
      if (item.category === '被リンク') {
        deduct.backlink += d
      } else if (item.category === 'コンテンツ') {
        deduct.content += d
      } else if (item.category === 'オンページ') {
        deduct.onpage += d
      } else {
        deduct.technical += d * 0.4
        deduct.onpage    += d * 0.4
        deduct.content   += d * 0.2
      }
    } else if (item.engine === 'google') {
      deduct.google += d
    } else if (item.engine === 'yahoo') {
      deduct.yahoo += d
    }
  }

  const technical = Math.max(0, base - deduct.technical)
  const onpage    = Math.max(0, base - deduct.onpage)
  const content   = Math.max(0, base - deduct.content)
  const backlink  = Math.max(0, base - deduct.backlink)
  const googleCat = Math.max(0, base - deduct.google)
  const yahooCat  = Math.max(0, base - deduct.yahoo)

  const total = Math.round(
    technical * SCORE_WEIGHTS.technical +
    onpage    * SCORE_WEIGHTS.onpage    +
    content   * SCORE_WEIGHTS.content   +
    backlink  * SCORE_WEIGHTS.backlink  +
    googleCat * SCORE_WEIGHTS.google    +
    yahooCat  * SCORE_WEIGHTS.yahoo,
  )

  const googleScore = Math.round(
    technical * 0.30 + onpage * 0.30 + content * 0.20 + backlink * 0.10 + googleCat * 0.10,
  )

  const yahooScore = Math.round(
    technical * 0.30 + onpage * 0.30 + content * 0.15 + backlink * 0.10 + yahooCat * 0.15,
  )

  return {
    total,
    google: googleScore,
    yahoo: yahooScore,
    technical: Math.round(technical),
    onpage: Math.round(onpage),
    content: Math.round(content),
    backlink: Math.round(backlink),
    mobile: calculateMobileScore(allItems),
  }
}

export function calculateMobileScore(allItems: DiagnosisItem[]): number {
  const mobileItems = allItems.filter(i => MOBILE_RELATED_CHECKS.has(i.checkId))
  if (mobileItems.length === 0) return 100
  const totalDeduct = mobileItems.reduce((s, i) => s + Math.abs(i.scoreImpact), 0)
  return Math.max(0, Math.round(100 - totalDeduct))
}

export interface ScoreGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
  color: string
  message: string
}

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 80) return { grade: 'A', label: '優秀',       color: '#16a34a', message: 'SEO の基盤が整っています。さらなる上位表示を目指せます。' }
  if (score >= 65) return { grade: 'B', label: '良好',       color: '#2563eb', message: '一部に改善の余地がありますが、SEO の基礎は整っています。' }
  if (score >= 50) return { grade: 'C', label: '改善が必要', color: '#ca8a04', message: '複数の SEO 問題があります。早急な改善で順位向上が期待できます。' }
  if (score >= 30) return { grade: 'D', label: '問題あり',   color: '#dc2626', message: '深刻な SEO 問題があります。このままでは検索上位表示が困難です。' }
  return              { grade: 'F', label: '緊急対応必要',   color: '#991b1b', message: '致命的な SEO 問題があります。競合他社に大きく遅れをとっています。' }
}
