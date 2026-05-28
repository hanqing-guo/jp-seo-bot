// Module D — Yahoo Japan 専用評価
// DIAGNOSIS_SPEC.md §6.1 完全実装。
// 外部 API: SerpAPI(Yahoo, Chiebukuro) — 無い時は info level fallback。

import { parseHTML } from '../../_shared/html.ts'
import type { TechnicalCheckResult } from '../../_shared/types.ts'

declare const Deno: { env: { get: (k: string) => string | undefined } } | undefined

function env(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key)
  return undefined
}

export async function runYahooJapanChecks(
  url: string,
  html: string,
): Promise<TechnicalCheckResult[]> {
  const results: TechnicalCheckResult[] = []
  const doc = parseHTML(html)
  const domain = new URL(url).hostname

  results.push(await checkYahooIndex(domain))
  results.push(await checkYahooLoco(domain))
  results.push(await checkChiebukuro(domain))
  results.push(checkYahooSnippet(doc))

  if (detectEcommerce(html)) {
    results.push(yahooShoppingTip())
  }

  results.push(yahooNewsTip())
  results.push(await checkYahooDirectory(domain))

  return results
}

async function checkYahooIndex(domain: string): Promise<TechnicalCheckResult> {
  const count = await fetchYahooIndexCount(domain)
  if (count < 0) {
    return {
      checkId: 'yahoo_index',
      level: 'info',
      title: 'Yahoo Japan インデックス数を確認できません (API 未設定)',
      description: 'Yahoo Japan は 2011 年以降 Google の検索アルゴリズムを使用しているため、Google でのインデックス状況と連動しています。',
      fixSuggestion: 'Google Search Console でサイトを登録すれば Yahoo Japan のインデックスも改善されます。',
      currentValue: '未確認',
      idealValue: 'Google と同等のインデックス数',
      scoreImpact: 0,
    }
  }
  return {
    checkId: 'yahoo_index',
    level: count > 0 ? 'passed' : 'critical',
    title: count > 0
      ? `Yahoo Japan に ${count.toLocaleString()} ページがインデックスされています`
      : 'Yahoo Japan にインデックスされていない可能性があります',
    description: 'Yahoo Japan は 2011 年以降 Google の検索アルゴリズムを使用しているため、Google でのインデックス状況と連動しています。ただし Yahoo 独自のクローラーも存在します。',
    fixSuggestion: 'Google Search Console でサイトを登録し、sitemap.xml を送信することで Yahoo Japan のインデックスも改善されます。',
    currentValue: count > 0 ? `${count.toLocaleString()} ページがインデックス済み` : '未インデックスまたは少数',
    idealValue: 'Google と同等のインデックス数',
    scoreImpact: count > 0 ? 0 : -20,
  }
}

async function fetchYahooIndexCount(domain: string): Promise<number> {
  const key = env('SERPAPI_KEY')
  if (!key) return -1
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?engine=yahoo&q=site:${domain}&p=1&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return -1
    const data = await res.json()
    return data?.search_information?.total_results ?? 0
  } catch {
    return -1
  }
}

async function checkYahooLoco(domain: string): Promise<TechnicalCheckResult> {
  const registered = await probeYahooLoco(domain)
  if (registered === null) {
    return {
      checkId: 'yahoo_loco',
      level: 'info',
      title: 'Yahoo!ロコの登録状況を確認できません',
      description: 'Yahoo!ロコは Yahoo Japan の地域ビジネス情報サービスです。Yahoo Japan ユーザー(特に 40 代以上)の検索で地域情報として表示されます。',
      fixSuggestion: 'https://loco.yahoo.co.jp/ からビジネス情報を無料登録できます。',
      currentValue: '未確認',
      idealValue: '登録済み・情報最新',
      scoreImpact: 0,
    }
  }
  return {
    checkId: 'yahoo_loco',
    level: registered ? 'passed' : 'warning',
    title: registered
      ? 'Yahoo!ロコにビジネスが登録されています'
      : 'Yahoo!ロコに未登録です(地域集客の機会損失)',
    description: 'Yahoo!ロコは Yahoo Japan の地域ビジネス情報サービスです。無料で登録でき、ローカル SEO に直結します。',
    fixSuggestion: 'https://loco.yahoo.co.jp/ からビジネス情報を無料登録できます。NAP(企業名・住所・電話番号)を GBP と一致させてください。',
    currentValue: registered ? '登録済み' : '未登録',
    idealValue: '登録済み・情報最新',
    scoreImpact: registered ? 0 : -10,
  }
}

async function probeYahooLoco(domain: string): Promise<boolean | null> {
  const key = env('SERPAPI_KEY')
  if (!key) return null
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?engine=google&q=site:loco.yahoo.co.jp+${domain}&hl=ja&gl=jp&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    return ((data?.search_information?.total_results ?? 0) as number) > 0
  } catch {
    return null
  }
}

async function checkChiebukuro(domain: string): Promise<TechnicalCheckResult> {
  const data = await searchChiebukuro(domain)
  if (data === null) {
    return {
      checkId: 'yahoo_chiebukuro',
      level: 'info',
      title: 'Yahoo!知恵袋の関連 Q&A は確認できません',
      description: 'Yahoo!知恵袋への回答は、ブランドの専門性をアピールし間接的な SEO 効果(ブランド認知・被リンク)につながります。',
      fixSuggestion: '業界のよくある質問を事前に調査し、知恵袋で回答することで認知度を高められます。',
      currentValue: '未確認',
      idealValue: '関連 Q&A への定期的な回答',
      scoreImpact: 0,
    }
  }
  return {
    checkId: 'yahoo_chiebukuro',
    level: 'info',
    title: data.questionCount > 0
      ? `Yahoo!知恵袋に ${data.questionCount} 件の関連 Q&A があります(回答機会あり)`
      : 'Yahoo!知恵袋に関連 Q&A は見つかりませんでした',
    description: 'Yahoo!知恵袋への回答は、ブランドの専門性をアピールし間接的な SEO 効果につながります。Yahoo Japan の検索結果でも知恵袋が上位に表示されることが多くあります。',
    fixSuggestion: data.questionCount > 0 && data.topQuestions[0]
      ? `「${data.topQuestions[0]}」などの質問に専門家として回答し、ブランドの権威性を示しましょう。`
      : '業界のよくある質問を事前に調査し、知恵袋で回答することで認知度を高められます。',
    currentValue: `${data.questionCount} 件の関連 Q&A`,
    idealValue: '関連 Q&A への定期的な回答',
    scoreImpact: 0,
  }
}

async function searchChiebukuro(domain: string): Promise<{ questionCount: number; topQuestions: string[] } | null> {
  const key = env('SERPAPI_KEY')
  if (!key) return null
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?engine=google&q=site:chiebukuro.yahoo.co.jp+${domain}&hl=ja&gl=jp&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const total = (data?.search_information?.total_results ?? 0) as number
    const topQuestions = (data?.organic_results ?? []).slice(0, 3).map((r: { title?: string }) => r.title ?? '')
    return { questionCount: total, topQuestions }
  } catch {
    return null
  }
}

function checkYahooSnippet(doc: Document): TechnicalCheckResult {
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? ''
  const optimal = desc.length >= 80 && desc.length <= 120
  return {
    checkId: 'yahoo_snippet',
    level: optimal ? 'passed' : 'warning',
    title: optimal
      ? 'Yahoo Japan 検索結果のスニペットに最適な説明文です'
      : 'Yahoo Japan 検索結果のスニペット最適化が必要です',
    description: 'Yahoo Japan の検索結果スニペット(説明文)は Google と異なり、約 80〜120 文字が表示されることが多いです。この範囲で重要情報を前半に配置することが効果的です。',
    fixSuggestion: 'meta description を 80〜120 文字で設定し、ターゲットキーワードと行動喚起(CTA)を含めてください。',
    currentValue: desc ? `${desc.length} 文字` : '未設定',
    idealValue: '80〜120 文字',
    scoreImpact: optimal ? 0 : -5,
  }
}

function detectEcommerce(html: string): boolean {
  return (
    /(?:カート|お買い物|ショッピング|購入|商品一覧|Cart|add[-_ ]?to[-_ ]?cart|product[-_ ]?list)/i.test(html) &&
    /(?:¥|円|price|price-tag|product-price)/i.test(html)
  )
}

function yahooShoppingTip(): TechnicalCheckResult {
  return {
    checkId: 'yahoo_shopping',
    level: 'info',
    title: 'EC サイトと判定されました — Yahoo!ショッピングへの出店を検討してください',
    description: 'Yahoo!ショッピングは日本最大級の EC モール。出店することで Yahoo Japan の検索結果に商品情報が表示されやすくなります。',
    fixSuggestion: 'https://business-ec.yahoo.co.jp/shopping/ から無料出店できます(2013 年以降、出店費用・月額費用ともに無料)。',
    currentValue: 'EC サイト検出',
    idealValue: 'Yahoo!ショッピング出店済み',
    scoreImpact: 0,
  }
}

function yahooNewsTip(): TechnicalCheckResult {
  return {
    checkId: 'yahoo_news_potential',
    level: 'info',
    title: 'PR TIMES 経由で Yahoo Japan ニュースへの掲載が可能です',
    description: 'PR TIMES へのプレスリリース配信は、Yahoo Japan ニュースに自動転載される可能性があります。DR91 の超高権威サイトからの言及は、SEO に大きな効果をもたらします。',
    fixSuggestion: 'JP SEO Bot のプレスリリース自動生成機能を使えば、毎月 1 本のプレスリリースを低コストで作成・配信できます。',
    currentValue: '未活用',
    idealValue: '月 1〜2 本のプレスリリース配信',
    scoreImpact: 0,
  }
}

async function checkYahooDirectory(domain: string): Promise<TechnicalCheckResult> {
  const key = env('SERPAPI_KEY')
  let registered: boolean | null = null
  if (key) {
    try {
      const res = await fetch(
        `https://serpapi.com/search.json?engine=google&q=site:ekiten.jp+${domain}&hl=ja&gl=jp&api_key=${key}`,
        { signal: AbortSignal.timeout(10000) },
      )
      if (res.ok) {
        const data = await res.json()
        registered = ((data?.search_information?.total_results ?? 0) as number) > 0
      }
    } catch {
      registered = null
    }
  }
  return {
    checkId: 'yahoo_directory',
    level: registered === true ? 'passed' : 'info',
    title: registered === true
      ? 'Yahoo Japan 関連ディレクトリに登録されています'
      : 'Yahoo Japan 関連ディレクトリへの登録を推奨します',
    description: 'エキテン・Yahoo!ロコなどの日本のローカルディレクトリへの登録は、NAP 情報の一貫性を高め、Yahoo Japan のローカル検索順位に影響します。',
    fixSuggestion: 'エキテン (https://www.ekiten.jp) への登録から始めましょう。無料で登録でき、即座に効果が出る場合があります。',
    currentValue: registered === true ? '一部登録済み' : registered === false ? '未登録' : '未確認',
    idealValue: '主要ディレクトリすべて登録済み',
    scoreImpact: registered === true ? 0 : registered === false ? -5 : 0,
  }
}
