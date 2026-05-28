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

  // ─── Module C/D/E mock items (Phase 3+) ───────────────────
  items.push({
    checkId: 'google_business_profile',
    level: total < 70 ? 'warning' : 'passed',
    engine: 'google',
    category: 'Google Japan',
    title: total < 70
      ? 'Googleビジネスプロフィールが未登録です'
      : 'Googleビジネスプロフィールが登録されています',
    description: 'Googleビジネスプロフィール(旧 Googleマイビジネス)は、Google 検索とGoogleマップでのローカル表示に直結します。日本の中小企業にとって最重要の無料集客ツールです。',
    fixSuggestion: 'https://business.google.com/ から無料で登録できます。NAP(企業名・住所・電話番号)をサイトと一致させてください。',
    currentValue: total < 70 ? '未登録' : '登録済み',
    idealValue: '登録済み・最新情報に更新',
    scoreImpact: total < 70 ? -10 : 0,
  })
  items.push({
    checkId: 'google_ai_overview',
    level: total < 60 ? 'warning' : 'info',
    engine: 'google',
    category: 'Google Japan',
    title: total < 60
      ? 'Google AI Overview に引用されにくい構造です'
      : 'Google AI Overview に部分的に対応しています',
    description: '2025 年に日本でも展開された Google AI Overview は、検索結果上部に AI 生成の回答を表示します。ここに引用されることで、クリック数が大幅に増加します。',
    fixSuggestion: 'FAQ セクションの追加、Schema Markup の設定、E-E-A-T の向上(著者情報・引用元の明示)が効果的です。',
    currentValue: total < 60 ? 'AI Overview 対応スコア 25/100' : 'AI Overview 対応スコア 55/100',
    idealValue: '70 点以上',
    scoreImpact: total < 60 ? -5 : -3,
  })
  items.push({
    checkId: 'yahoo_loco',
    level: total < 75 ? 'warning' : 'passed',
    engine: 'yahoo',
    category: 'Yahoo Japan',
    title: total < 75
      ? 'Yahoo!ロコに未登録です(地域集客の機会損失)'
      : 'Yahoo!ロコに登録されています',
    description: 'Yahoo!ロコは Yahoo Japan の地域ビジネス情報サービスです。Yahoo Japan ユーザー(特に 40 代以上)の検索で地域情報として表示されます。無料で登録でき、ローカル SEO に直結します。',
    fixSuggestion: 'https://loco.yahoo.co.jp/ からビジネス情報を無料登録できます。NAP(企業名・住所・電話番号)を GBP と一致させてください。',
    currentValue: total < 75 ? '未登録' : '登録済み',
    idealValue: '登録済み・情報最新',
    scoreImpact: total < 75 ? -10 : 0,
  })
  items.push({
    checkId: 'yahoo_chiebukuro',
    level: 'info',
    engine: 'yahoo',
    category: 'Yahoo Japan',
    title: 'Yahoo!知恵袋に 8 件の関連 Q&A があります(回答機会あり)',
    description: 'Yahoo!知恵袋への回答は、ブランドの専門性をアピールし間接的な SEO 効果(ブランド認知・被リンク)につながります。',
    fixSuggestion: '「業界 X のおすすめサービスは?」などの質問に専門家として回答し、ブランドの権威性を示しましょう。',
    currentValue: '8 件の関連 Q&A',
    idealValue: '関連 Q&A への定期的な回答',
    scoreImpact: 0,
  })
  items.push({
    checkId: 'domain_age',
    level: total < 50 ? 'warning' : total < 70 ? 'info' : 'passed',
    engine: 'common',
    category: '被リンク',
    title: total < 50
      ? '新しいドメインです(運用 8 ヶ月)— 信頼性の蓄積が必要です'
      : total < 70
        ? '比較的新しいドメインです(運用 1 年 4 ヶ月)'
        : 'ドメインの信頼性が高いです(運用 3 年 2 ヶ月)',
    description: 'ドメインエイジ(ドメインの運用期間)は SEO の信頼性指標のひとつです。古いドメインほど Google から信頼されやすい傾向があります。',
    fixSuggestion: '新しいドメインの場合、良質なコンテンツの継続的な公開と被リンクの獲得が信頼性を早く高める方法です。',
    currentValue: total < 50 ? '0 年 8 ヶ月' : total < 70 ? '1 年 4 ヶ月' : '3 年 2 ヶ月',
    idealValue: '2 年以上',
    scoreImpact: total < 50 ? -5 : total < 70 ? -3 : 0,
  })
  items.push({
    checkId: 'japan_directories',
    level: total < 70 ? 'warning' : 'info',
    engine: 'common',
    category: '被リンク',
    title: total < 70
      ? '重要なディレクトリ 2 件への登録が未完了です'
      : '主要ディレクトリの一部に未登録があります',
    description: '日本の主要ビジネスディレクトリへの登録は、NAP 情報の一貫性を高め、ローカル SEO と被リンク獲得の両方に効果があります。',
    fixSuggestion: '未登録のディレクトリ: Googleビジネスプロフィール、Yahoo!ロコ\nJP SEO Bot の被リンクプランナーで一括管理できます。',
    currentValue: total < 70 ? '1/5 登録済み' : '3/5 登録済み',
    idealValue: '全ディレクトリ登録済み',
    scoreImpact: total < 70 ? -8 : -3,
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
