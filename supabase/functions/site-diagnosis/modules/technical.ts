// Module A — テクニカル SEO 診断 (共通)
// DIAGNOSIS_SPEC.md §3.1 完全実装。

import { parseHTML } from '../../_shared/html.ts'
import type { TechnicalCheckResult } from '../../_shared/types.ts'

declare const Deno: { env: { get: (k: string) => string | undefined } } | undefined

/** 安全に Deno.env を読む(ブラウザ実行時は undefined を返す) */
function env(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key)
  return undefined
}

export async function runTechnicalChecks(
  url: string,
  html: string,
): Promise<TechnicalCheckResult[]> {
  const results: TechnicalCheckResult[] = []
  const doc = parseHTML(html)
  const origin = new URL(url).origin

  results.push(checkHttps(url))
  results.push(await checkRobots(origin))
  results.push(await checkSitemap(origin))
  results.push(checkMobileViewport(doc))

  const hreflangResult = checkHreflang(doc)
  if (hreflangResult) results.push(hreflangResult)

  results.push(checkSchemaMarkup(doc))
  results.push(await checkBrokenLinks(doc, origin))
  results.push(...await fetchCoreWebVitals(url))

  return results
}

function checkHttps(url: string): TechnicalCheckResult {
  const isHttps = url.startsWith('https://')
  return {
    checkId: 'https',
    level: isHttps ? 'passed' : 'critical',
    title: isHttps ? 'HTTPS で配信されています' : 'HTTPS で配信されていません(致命的)',
    description: 'Google は HTTPS をランキング要因として明言しています。Chrome は HTTP サイトに「保護されていません」警告を表示し、CVR を大きく下げます。',
    fixSuggestion: 'Let\'s Encrypt の無料 SSL 証明書を導入してください。Cloudflare や Vercel を使えばワンクリックで有効化できます。',
    currentValue: isHttps ? 'HTTPS' : 'HTTP',
    idealValue: 'HTTPS',
    scoreImpact: isHttps ? 0 : -20,
  }
}

async function checkRobots(origin: string): Promise<TechnicalCheckResult> {
  let ok = false
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
    ok = res.ok
  } catch {
    ok = false
  }
  return {
    checkId: 'robots_txt',
    level: ok ? 'passed' : 'warning',
    title: ok ? 'robots.txt が正しく設定されています' : 'robots.txt が見つかりません',
    description: 'robots.txt はクローラーへのアクセス制御に重要なファイルです。',
    fixSuggestion: 'サイトルートに robots.txt を設置してください。\nUser-agent: *\nAllow: /',
    currentValue: ok ? '存在する' : '存在しない',
    idealValue: '存在する',
    scoreImpact: ok ? 0 : -3,
  }
}

async function checkSitemap(origin: string): Promise<TechnicalCheckResult> {
  const probes = await Promise.all([
    fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok).catch(() => false),
    fetch(`${origin}/sitemap_index.xml`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok).catch(() => false),
  ])
  const hasSitemap = probes.some(Boolean)
  return {
    checkId: 'sitemap_xml',
    level: hasSitemap ? 'passed' : 'warning',
    title: hasSitemap ? 'sitemap.xml が確認できました' : 'sitemap.xml が見つかりません',
    description: 'sitemap.xml はクローラーにサイト構造を伝えるファイルです。特に新規サイトでは必須です。',
    fixSuggestion: 'WordPress なら Yoast SEO または Rank Math で自動生成できます。',
    currentValue: hasSitemap ? '存在する' : '存在しない',
    idealValue: '存在する',
    scoreImpact: hasSitemap ? 0 : -5,
  }
}

function checkMobileViewport(doc: Document): TechnicalCheckResult {
  const has = doc.querySelector('meta[name="viewport"]') !== null
  return {
    checkId: 'mobile_viewport',
    level: has ? 'passed' : 'critical',
    title: has
      ? 'モバイル対応(viewport)が設定されています'
      : 'モバイル対応の viewport メタタグがありません',
    description: '日本のスマートフォン普及率は 80% 以上。Google はモバイルファーストインデックスを採用しており、モバイル非対応サイトは大きく評価を下げます。',
    fixSuggestion: '<head> 内に以下を追加: <meta name="viewport" content="width=device-width, initial-scale=1">',
    currentValue: has ? '設定済み' : '未設定',
    idealValue: '設定済み',
    scoreImpact: has ? 0 : -15,
  }
}

function checkHreflang(doc: Document): TechnicalCheckResult | null {
  const tags = doc.querySelectorAll('link[rel="alternate"][hreflang]')
  if (tags.length === 0) return null
  const hasJa = Array.from(tags).some(t => (t as Element).getAttribute('hreflang')?.startsWith('ja'))
  return {
    checkId: 'hreflang_ja',
    level: hasJa ? 'passed' : 'warning',
    title: hasJa
      ? '日本語 hreflang タグが設定されています'
      : '多言語サイトですが日本語 hreflang タグが不完全です',
    description: '多言語サイトでは hreflang タグで各言語ページを正しく紐付けることが必要です。',
    fixSuggestion: '<link rel="alternate" hreflang="ja" href="https://example.com/ja/"> をすべての日本語ページに追加してください。',
    currentValue: `hreflang タグ: ${tags.length} 件`,
    idealValue: '日本語 (ja) と x-default の両方を設定',
    scoreImpact: hasJa ? 0 : -5,
  }
}

function checkSchemaMarkup(doc: Document): TechnicalCheckResult {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  const has = scripts.length > 0
  return {
    checkId: 'schema_markup',
    level: has ? 'passed' : 'warning',
    title: has
      ? `構造化データ(Schema Markup)が ${scripts.length} 件設定されています`
      : '構造化データ(Schema Markup)が設定されていません',
    description: '構造化データを設定すると、Google 検索結果にリッチリザルト(FAQ・パンくず・評価星など)が表示され、クリック率が平均 20〜30% 向上します。',
    fixSuggestion: 'まず FAQPage スキーマと BreadcrumbList スキーマから始めましょう。JP SEO Bot のスキーマジェネレーターで自動生成できます。',
    currentValue: has ? `${scripts.length} 件設定済み` : '未設定',
    idealValue: 'Article / LocalBusiness / FAQPage / BreadcrumbList',
    scoreImpact: has ? 0 : -8,
  }
}

async function checkBrokenLinks(doc: Document, origin: string): Promise<TechnicalCheckResult> {
  const links = Array.from(doc.querySelectorAll('a[href]'))
    .map(a => (a as Element).getAttribute('href'))
    .filter((h): h is string =>
      !!h && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('javascript:'))
    .slice(0, 10)

  let broken = 0
  await Promise.all(links.map(async (link) => {
    const target = link.startsWith('http') ? link : new URL(link, origin).toString()
    try {
      const res = await fetch(target, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      })
      if (res.status === 404) broken += 1
    } catch {
      broken += 1
    }
  }))

  return {
    checkId: 'broken_links',
    level: broken === 0 ? 'passed' : broken <= 2 ? 'warning' : 'critical',
    title: broken === 0
      ? `リンク切れは検出されませんでした (${links.length} 件チェック)`
      : `リンク切れが ${broken} 件検出されました (${links.length} 件チェック中)`,
    description: 'リンク切れ(404エラー)はユーザー体験を損なうだけでなく、クローラーの巡回効率を下げて SEO に悪影響を与えます。',
    fixSuggestion: 'Broken Link Checker プラグインや Google Search Console のカバレッジレポートで定期的に確認してください。',
    currentValue: `${broken} 件のリンク切れ / ${links.length} 件チェック`,
    idealValue: '0 件',
    scoreImpact: broken === 0 ? 0 : broken <= 2 ? -5 : -10,
  }
}

async function fetchCoreWebVitals(url: string): Promise<TechnicalCheckResult[]> {
  const apiKey = env('PAGESPEED_API_KEY') ?? ''
  const apiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=mobile&locale=ja` +
    (apiKey ? `&key=${apiKey}` : '')

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const audits = data?.lighthouseResult?.audits ?? {}

    const lcpMs = audits['largest-contentful-paint']?.numericValue ?? 0
    const cls = audits['cumulative-layout-shift']?.numericValue ?? 0
    const inp = audits['interaction-to-next-paint']?.numericValue ?? 0

    return [buildLcp(lcpMs), buildCls(cls), buildInp(inp)]
  } catch {
    return [{
      checkId: 'cwv_unavailable',
      level: 'info',
      title: 'Core Web Vitals の取得に時間がかかっています',
      description: 'PageSpeed Insights API へのアクセスがタイムアウトしました。後ほど再診断をお試しください。',
      fixSuggestion: 'Google PageSpeed Insights (https://pagespeed.web.dev) で直接確認できます。',
      scoreImpact: 0,
    }]
  }
}

function buildLcp(lcpMs: number): TechnicalCheckResult {
  const sec = (lcpMs / 1000).toFixed(1)
  const level = lcpMs < 2500 ? 'passed' : lcpMs < 4000 ? 'warning' : 'critical'
  return {
    checkId: 'lcp',
    level,
    title: level === 'passed'
      ? `LCP(最大コンテンツ描画)が良好です(${sec}秒)`
      : `LCP が遅すぎます(${sec}秒 / 推奨: 2.5秒以下)`,
    description: 'LCP はページのメインコンテンツが表示されるまでの時間です。Core Web Vitals の最重要指標で、遅いと検索順位に直接影響します。',
    fixSuggestion: '画像の WebP 変換・サイズ圧縮、サーバーレスポンス改善、キャッシュ設定、CDN の導入が効果的です。',
    currentValue: `${sec}秒`,
    idealValue: '2.5秒以下',
    scoreImpact: level === 'passed' ? 0 : level === 'warning' ? -8 : -15,
  }
}

function buildCls(cls: number): TechnicalCheckResult {
  const level = cls < 0.1 ? 'passed' : cls < 0.25 ? 'warning' : 'critical'
  return {
    checkId: 'cls',
    level,
    title: level === 'passed'
      ? `CLS(レイアウトのズレ)が良好です(${cls.toFixed(3)})`
      : `CLS が高すぎます(${cls.toFixed(3)} / 推奨: 0.1以下)`,
    description: 'CLS はページ読み込み中に要素がずれる度合いです。スマホで突然ボタンの位置がずれるような現象の原因です。',
    fixSuggestion: '画像・動画・広告の width/height 属性を明示してください。Web フォントの読み込み方法も最適化してください。',
    currentValue: cls.toFixed(3),
    idealValue: '0.1以下',
    scoreImpact: level === 'passed' ? 0 : level === 'warning' ? -5 : -10,
  }
}

function buildInp(inp: number): TechnicalCheckResult {
  const level = inp < 200 ? 'passed' : inp < 500 ? 'warning' : 'critical'
  return {
    checkId: 'inp',
    level,
    title: level === 'passed'
      ? `INP(操作応答速度)が良好です(${Math.round(inp)}ms)`
      : `INP が遅いです(${Math.round(inp)}ms / 推奨: 200ms以下)`,
    description: 'INP はボタンをタップしてから反応するまでの時間です。2024年3月に Google の正式指標になりました。',
    fixSuggestion: 'JavaScript の最適化・不要なプラグインの削除・コードの遅延読み込みが有効です。',
    currentValue: `${Math.round(inp)}ms`,
    idealValue: '200ms以下',
    scoreImpact: level === 'passed' ? 0 : level === 'warning' ? -5 : -10,
  }
}
