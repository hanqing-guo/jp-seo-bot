// 診断結果 Mock データ + 共有 type
// 本来は supabase/functions/_shared/types.ts と同型だが、Vite frontend が
// Deno 用 .ts URL import を解決できないため、必要 type のみ frontend に再定義する。

export type CheckLevel = 'critical' | 'warning' | 'info' | 'passed'
export type CheckEngine = 'google' | 'yahoo' | 'common'

export interface DiagnosisItem {
  checkId: string
  level: CheckLevel
  engine: CheckEngine
  category: string
  title: string
  description: string
  fixSuggestion: string
  currentValue?: string
  idealValue?: string
  scoreImpact: number
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

function urlSeed(url: string): number {
  let h = 0
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Demo 用 mock。Edge Function が未デプロイ環境でも完全な RESULT 表示を
 * できるよう、URL ハッシュから決定的にスコアと検出項目を生成する。
 */
export function generateMockDiagnosis(url: string): DiagnosisResponse {
  const seed = urlSeed(url)
  const bucket = seed % 100

  const baseTotal =
    bucket <= 15 ? 25 + (bucket % 10) :
    bucket <= 50 ? 50 + (bucket % 15) :
    bucket <= 80 ? 65 + (bucket % 13) :
                   80 + (bucket % 18)

  const total = Math.max(0, Math.min(100, baseTotal))
  const google = Math.max(0, Math.min(100, total + ((seed >> 3) % 11) - 5))
  const yahoo  = Math.max(0, Math.min(100, total + ((seed >> 6) % 11) - 7))

  const scores: ScoreBreakdown = {
    total,
    google,
    yahoo,
    technical: Math.max(0, Math.min(100, total + ((seed >> 9)  % 11) - 5)),
    onpage:    Math.max(0, Math.min(100, total + ((seed >> 12) % 11) - 5)),
    content:   Math.max(0, Math.min(100, total + ((seed >> 15) % 11) - 5)),
    backlink:  Math.max(0, Math.min(100, total + ((seed >> 18) % 11) - 8)),
    mobile:    Math.max(0, Math.min(100, total + ((seed >> 21) % 11) - 3)),
  }

  const items: DiagnosisItem[] = []

  if (total < 70) {
    items.push({
      checkId: 'lcp',
      level: 'critical',
      engine: 'common',
      category: 'テクニカル',
      title: 'LCP(最大コンテンツ描画)が遅すぎます(4.2 秒)',
      description: 'LCP はページのメインコンテンツが表示されるまでの時間です。Google の Core Web Vitals の最重要指標で、遅いと検索順位に直接影響します。',
      fixSuggestion: '画像の WebP 変換・サイズ圧縮、サーバーレスポンス改善、キャッシュ設定、CDN の導入が効果的です。',
      currentValue: '4.2 秒',
      idealValue: '2.5 秒以下',
      scoreImpact: -15,
    })
  }
  if (total < 60) {
    items.push({
      checkId: 'mobile_viewport',
      level: 'critical',
      engine: 'common',
      category: 'テクニカル',
      title: 'モバイル対応の viewport メタタグがありません',
      description: '日本のスマートフォン普及率は 80% 以上。Google はモバイルファーストインデックスを採用しており、モバイル非対応サイトは大きく評価を下げます。',
      fixSuggestion: '<head> 内に追加: <meta name="viewport" content="width=device-width, initial-scale=1">',
      currentValue: '未設定',
      idealValue: '設定済み',
      scoreImpact: -15,
    })
  }
  if (total < 80) {
    items.push({
      checkId: 'meta_description',
      level: 'warning',
      engine: 'common',
      category: 'オンページ',
      title: 'meta description が設定されていません',
      description: 'meta description は検索結果のスニペット(説明文)として表示されます。クリック率に影響します。',
      fixSuggestion: '検索意図に応えた内容で 80〜160 文字で設定してください。',
      currentValue: '(未設定)',
      idealValue: '80〜160 文字の説明文',
      scoreImpact: -8,
    })
  }
  if (total < 75) {
    items.push({
      checkId: 'schema_markup',
      level: 'warning',
      engine: 'common',
      category: 'テクニカル',
      title: '構造化データ(Schema Markup)が設定されていません',
      description: '構造化データを設定すると、Google 検索結果にリッチリザルト(FAQ・パンくず・評価星など)が表示され、クリック率が平均 20〜30% 向上します。',
      fixSuggestion: 'まず FAQPage スキーマと BreadcrumbList スキーマから始めましょう。JP SEO Bot のスキーマジェネレーターで自動生成できます。',
      currentValue: '未設定',
      idealValue: 'Article / LocalBusiness / FAQPage / BreadcrumbList',
      scoreImpact: -8,
    })
  }
  items.push({
    checkId: 'title_tag',
    level: total >= 80 ? 'passed' : 'warning',
    engine: 'common',
    category: 'オンページ',
    title: total >= 80
      ? `title タグが適切に設定されています(${30 + (seed % 25)} 文字)`
      : `title タグが長すぎます(${65 + (seed % 20)} 文字 / 推奨: 30〜60 文字)`,
    description: 'title タグは検索結果に表示されるページのタイトルです。クリック率に最も影響する SEO 要素のひとつです。',
    fixSuggestion: 'ターゲットキーワードを含め、30〜60 文字で設定してください。',
    currentValue: total >= 80 ? '適切な長さ' : '60 文字超え',
    idealValue: 'ターゲット KW を含む 30〜60 文字',
    scoreImpact: total >= 80 ? 0 : -5,
  })
  items.push({
    checkId: 'https',
    level: 'passed',
    engine: 'common',
    category: 'テクニカル',
    title: 'HTTPS で配信されています',
    description: 'Google は HTTPS をランキング要因として明言しています。',
    fixSuggestion: '',
    currentValue: 'HTTPS',
    idealValue: 'HTTPS',
    scoreImpact: 0,
  })

  const criticalCount = items.filter(i => i.level === 'critical').length
  const warningCount  = items.filter(i => i.level === 'warning').length

  const grade = getScoreGrade(total)
  const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
  const summary = `${hostname} の診断が完了しました。` +
    `総合 ${total}/100(グレード ${grade.grade} / ${grade.label})。` +
    `Google ${google} / Yahoo ${yahoo}、重大 ${criticalCount} 件・警告 ${warningCount} 件を検出。`

  const quickWins: string[] = items
    .filter(i => i.level === 'critical')
    .slice(0, 3)
    .map(i => `${i.title}:${i.fixSuggestion.split('\n')[0]}`)

  if (quickWins.length < 1) {
    const w = items.find(i => i.level === 'warning')
    if (w) quickWins.push(`${w.title}:${w.fixSuggestion.split('\n')[0]}`)
  }

  return {
    sessionId: 'mock-' + seed.toString(36).slice(0, 8),
    url: url.startsWith('http') ? url : `https://${url}`,
    scores,
    items,
    summary,
    quickWins,
    criticalCount,
    warningCount,
  }
}
