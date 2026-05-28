// Module C — Google Japan 専用評価
// DIAGNOSIS_SPEC.md §5.1 完全実装。
// 外部 API: SerpAPI(無い時は helper が sentinel を返し、上層は info level)。

import { parseHTML } from '../../_shared/html.ts'
import type { TechnicalCheckResult } from '../../_shared/types.ts'

declare const Deno: { env: { get: (k: string) => string | undefined } } | undefined

function env(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key)
  return undefined
}

export async function runGoogleJapanChecks(
  url: string,
  html: string,
): Promise<TechnicalCheckResult[]> {
  const results: TechnicalCheckResult[] = []
  const doc = parseHTML(html)
  const domain = new URL(url).hostname

  results.push(await checkGoogleIndex(domain))
  results.push(await checkGoogleBusinessProfile(domain))
  results.push(checkGscVerification(doc))
  results.push(checkAIOverviewReadiness(html))
  results.push(checkGoogleTitleOptimization(doc))
  results.push(checkInternalLinks(html, domain))
  results.push(checkSocialMeta(doc))

  return results
}

async function checkGoogleIndex(domain: string): Promise<TechnicalCheckResult> {
  const indexed = await fetchGoogleIndexCount(domain)
  if (indexed < 0) {
    return {
      checkId: 'google_index',
      level: 'info',
      title: 'Google インデックス数を確認できません (API 未設定)',
      description: 'SerpAPI が未設定のため、Google インデックス確認をスキップしました。SERPAPI_KEY を Edge Function の環境変数に設定すると診断できます。',
      fixSuggestion: 'まず Google Search Console (https://search.google.com/search-console/) でインデックス状況を確認してください。',
      currentValue: '未確認',
      idealValue: 'すべての公開ページがインデックス済み',
      scoreImpact: 0,
    }
  }
  return {
    checkId: 'google_index',
    level: indexed > 0 ? 'passed' : 'critical',
    title: indexed > 0
      ? `Google に ${indexed.toLocaleString()} ページがインデックスされています`
      : 'Google にインデックスされていません(重大)',
    description: 'Google にインデックスされていないページは検索結果に表示されません。新規サイトの場合、インデックスされるまで数週間かかることがあります。',
    fixSuggestion: indexed === 0
      ? 'Google Search Console でサイトを登録し、sitemap.xml を送信してください。\nhttps://search.google.com/search-console/'
      : '',
    currentValue: `${indexed.toLocaleString()} ページがインデックス済み`,
    idealValue: 'すべての公開ページがインデックス済み',
    scoreImpact: indexed > 0 ? 0 : -20,
  }
}

async function fetchGoogleIndexCount(domain: string): Promise<number> {
  const key = env('SERPAPI_KEY')
  if (!key) return -1
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?engine=google&q=site:${domain}&gl=jp&hl=ja&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return -1
    const data = await res.json()
    return data?.search_information?.total_results ?? 0
  } catch {
    return -1
  }
}

async function checkGoogleBusinessProfile(domain: string): Promise<TechnicalCheckResult> {
  const gbp = await fetchGbp(domain)
  if (gbp.unavailable) {
    return {
      checkId: 'google_business_profile',
      level: 'info',
      title: 'Googleビジネスプロフィールの登録状況を確認できません (API 未設定)',
      description: 'Googleビジネスプロフィール(旧 Googleマイビジネス)は、Google 検索とGoogleマップでのローカル表示に直結します。日本の中小企業にとって最重要の無料集客ツールです。',
      fixSuggestion: 'https://business.google.com/ から無料で登録できます。NAP(企業名・住所・電話番号)をサイトと一致させてください。',
      currentValue: '未確認',
      idealValue: '登録済み・最新情報に更新',
      scoreImpact: 0,
    }
  }
  return {
    checkId: 'google_business_profile',
    level: gbp.found ? 'passed' : 'warning',
    title: gbp.found
      ? 'Googleビジネスプロフィールが登録されています'
      : 'Googleビジネスプロフィールが未登録です',
    description: 'Googleビジネスプロフィール(旧 Googleマイビジネス)は、Google 検索とGoogleマップでのローカル表示に直結します。日本の中小企業にとって最重要の無料集客ツールです。',
    fixSuggestion: 'https://business.google.com/ から無料で登録できます。NAP(企業名・住所・電話番号)をサイトと一致させてください。',
    currentValue: gbp.found ? `登録済み: ${gbp.name ?? domain}` : '未登録',
    idealValue: '登録済み・最新情報に更新',
    scoreImpact: gbp.found ? 0 : -10,
  }
}

async function fetchGbp(domain: string): Promise<{ found: boolean; name?: string; unavailable?: boolean }> {
  const key = env('SERPAPI_KEY')
  if (!key) return { found: false, unavailable: true }
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(domain)}&hl=ja&gl=jp&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return { found: false, unavailable: true }
    const data = await res.json()
    const place = data?.local_results?.[0] ?? data?.place_results
    if (place) return { found: true, name: place.title ?? place.name }
    return { found: false }
  } catch {
    return { found: false, unavailable: true }
  }
}

function checkGscVerification(doc: Document): TechnicalCheckResult {
  const tag = doc.querySelector('meta[name="google-site-verification"]')
  return {
    checkId: 'gsc_verification',
    level: tag ? 'passed' : 'info',
    title: tag
      ? 'Google Search Console が設定されています'
      : 'Google Search Console の設定が確認できません',
    description: 'Google Search Console は、検索パフォーマンスの確認・インデックス問題の検出に必須の無料ツールです。設定していない場合、SEO の問題に気づくのが遅れます。',
    fixSuggestion: 'https://search.google.com/search-console/ から設定してください。',
    currentValue: tag ? '設定済み' : '未確認',
    idealValue: '設定済み',
    scoreImpact: tag ? 0 : -5,
  }
}

function checkAIOverviewReadiness(html: string): TechnicalCheckResult {
  const r = scoreAIOverview(html)
  const level: TechnicalCheckResult['level'] =
    r.score >= 70 ? 'passed' :
    r.score >= 40 ? 'warning' : 'info'
  return {
    checkId: 'google_ai_overview',
    level,
    title: r.score >= 70
      ? 'Google AI Overview(AI 概要)に引用されやすい構造です'
      : 'Google AI Overview に引用されにくい構造です',
    description: '2025年に日本でも展開された Google AI Overview は、検索結果上部に AI 生成の回答を表示します。ここに引用されることで、クリック数が大幅に増加します。',
    fixSuggestion: 'FAQ セクションの追加、Schema Markup の設定、E-E-A-T の向上(著者情報・引用元の明示)が効果的です。',
    currentValue: `AI Overview 対応スコア: ${r.score}/100 (${r.reasons.join(' / ')})`,
    idealValue: '70 点以上',
    scoreImpact: r.score >= 70 ? 0 : r.score >= 40 ? -3 : -5,
  }
}

function scoreAIOverview(html: string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  if (/"@type":\s*"FAQPage"/i.test(html)) { score += 25; reasons.push('FAQPage schema あり') }
  if (/"@type":\s*"Article"/i.test(html)) { score += 20; reasons.push('Article schema あり') }
  if (/著者|執筆|監修/.test(html)) { score += 15; reasons.push('著者情報あり') }
  if (/出典[:：]|参考[:：]|参照[:：]/.test(html)) { score += 15; reasons.push('出典あり') }
  if ((html.match(/<h2/gi) ?? []).length >= 3) { score += 15; reasons.push('H2 が 3 件以上') }
  if (/(よくある質問|FAQ)/.test(html)) { score += 10; reasons.push('FAQ セクションあり') }
  if (reasons.length === 0) reasons.push('FAQ/Article schema・著者・出典が不足')
  return { score: Math.min(100, score), reasons }
}

function checkGoogleTitleOptimization(doc: Document): TechnicalCheckResult {
  const title = doc.querySelector('title')?.textContent?.trim() ?? ''
  const ja = /[぀-ヿ㐀-䶿一-鿿]/.test(title)
  const optimal = ja && title.length <= 32
  return {
    checkId: 'google_title_optimization',
    level: optimal ? 'passed' : 'warning',
    title: optimal
      ? 'title タグが Google 検索結果に適した長さです'
      : '日本語 title タグの最適化が必要です',
    description: 'Google は日本語の title を約 30〜32 文字(半角換算 60 文字)で切り詰めます。重要なキーワードを前半に配置してください。',
    fixSuggestion: '日本語 30〜32 文字以内を目安に設定し、ブランド名は後半に置いてください。\n例:「補助金申請を自動化 | 中小企業向け JP SEO Bot」',
    currentValue: `${title.length} 文字: "${title.slice(0, 50)}"`,
    idealValue: '日本語 30〜32 文字以内、KW を前半に配置',
    scoreImpact: optimal ? 0 : -5,
  }
}

function checkInternalLinks(html: string, domain: string): TechnicalCheckResult {
  const count = countInternalLinks(html, domain)
  const level: TechnicalCheckResult['level'] =
    count >= 5 ? 'passed' :
    count >= 2 ? 'info' : 'warning'
  return {
    checkId: 'internal_links',
    level,
    title: count >= 5
      ? `内部リンクが ${count} 件設置されています`
      : `内部リンクが少なすぎます(${count} 件 / 推奨: 5 件以上)`,
    description: '内部リンクはクローラーのサイト巡回を助け、PageRank を効率的に分散させます。関連記事への内部リンクを増やすことで、サイト全体の評価が向上します。',
    fixSuggestion: '本文中に関連ページへのリンクを自然に設置してください。特に上位表示させたいページへのリンクを増やすことが有効です。',
    currentValue: `${count} 件の内部リンク`,
    idealValue: '5 件以上',
    scoreImpact: count >= 5 ? 0 : count >= 2 ? -3 : -5,
  }
}

function countInternalLinks(html: string, domain: string): number {
  const hrefs = Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map(m => m[1])
  const internal = hrefs.filter(h => {
    if (h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('javascript:')) return false
    if (h.startsWith('/')) return true
    try {
      return new URL(h).hostname.replace(/^www\./, '') === domain.replace(/^www\./, '')
    } catch {
      return false
    }
  })
  return internal.length
}

function checkSocialMeta(doc: Document): TechnicalCheckResult {
  const ogTitle = doc.querySelector('meta[property="og:title"]')
  const ogImage = doc.querySelector('meta[property="og:image"]')
  const twCard = doc.querySelector('meta[name="twitter:card"]')
  const score = (ogTitle ? 1 : 0) + (ogImage ? 1 : 0) + (twCard ? 1 : 0)
  return {
    checkId: 'social_meta',
    level: score === 3 ? 'passed' : 'info',
    title: score === 3
      ? 'SNS シェア用メタタグが完備されています'
      : 'SNS シェア用メタタグ(OGP)が未設定または不足です',
    description: 'OGP (Open Graph Protocol) を設定すると、X(旧Twitter)・Facebook などでシェアされた際に画像・タイトル・説明文が正しく表示されます。被リンク獲得率が向上します。',
    fixSuggestion: 'og:title / og:description / og:image / twitter:card タグを各ページに追加してください。',
    currentValue: score === 0 ? '未設定' : `${score}/3 設定済み`,
    idealValue: 'og:title / og:description / og:image / twitter:card すべて設定',
    scoreImpact: score === 3 ? 0 : score >= 1 ? 0 : -2,
  }
}
