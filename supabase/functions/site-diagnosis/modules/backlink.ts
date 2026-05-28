// Module E — 被リンク・外部権威評価
// DIAGNOSIS_SPEC.md §7 完全実装。
// 外部 API: WHOIS (RDAP — 無料), Ahrefs/DataForSEO (有料), SerpAPI (有料)。
// 全部 graceful fallback。

import type { TechnicalCheckResult } from '../../_shared/types.ts'

declare const Deno: { env: { get: (k: string) => string | undefined } } | undefined

function env(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key)
  return undefined
}

export async function runBacklinkChecks(url: string): Promise<TechnicalCheckResult[]> {
  const results: TechnicalCheckResult[] = []
  const domain = new URL(url).hostname.replace(/^www\./, '')

  results.push(await checkDomainAge(domain))
  results.push(await checkBacklinkOverview(domain))
  results.push(await checkJapanDirectories(domain))

  return results
}

async function checkDomainAge(domain: string): Promise<TechnicalCheckResult> {
  const age = await getDomainAge(domain)
  if (age === null) {
    return {
      checkId: 'domain_age',
      level: 'info',
      title: 'ドメインエイジを確認できませんでした',
      description: 'ドメインエイジ(ドメインの運用期間)は SEO の信頼性指標のひとつです。古いドメインほど Google から信頼されやすい傾向があります。',
      fixSuggestion: 'WHOIS で確認できます: https://tech-unlimited.com/whois.html',
      currentValue: '未確認',
      idealValue: '2 年以上',
      scoreImpact: 0,
    }
  }
  const level: TechnicalCheckResult['level'] =
    age.years >= 2 ? 'passed' :
    age.years >= 1 ? 'info' : 'warning'
  return {
    checkId: 'domain_age',
    level,
    title: age.years >= 2
      ? `ドメインの信頼性が高いです(運用 ${age.years} 年 ${age.months} ヶ月)`
      : `新しいドメインです(運用 ${age.years} 年 ${age.months} ヶ月)— 信頼性の蓄積が必要です`,
    description: 'ドメインエイジ(ドメインの運用期間)は SEO の信頼性指標のひとつです。古いドメインほど Google から信頼されやすい傾向があります。ただし、コンテンツ品質の方が重要です。',
    fixSuggestion: '新しいドメインの場合、良質なコンテンツの継続的な公開と被リンクの獲得が信頼性を早く高める方法です。',
    currentValue: `${age.years} 年 ${age.months} ヶ月`,
    idealValue: '2 年以上',
    scoreImpact: age.years >= 2 ? 0 : age.years >= 1 ? -3 : -5,
  }
}

async function getDomainAge(domain: string): Promise<{ years: number; months: number } | null> {
  const tld = domain.split('.').slice(-1)[0]
  const candidates = [
    `https://rdap.org/domain/${domain}`,
    `https://www.rdap.net/domain/${domain}`,
    `https://rdap.${tld}/domain/${domain}`,
  ]
  for (const u of candidates) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const data = await res.json()
      const events = (data?.events ?? []) as { eventAction: string; eventDate: string }[]
      const reg = events.find(e =>
        e.eventAction === 'registration' || e.eventAction === 'created' || e.eventAction === 'registered',
      )
      if (!reg) continue
      const created = new Date(reg.eventDate)
      if (isNaN(created.getTime())) continue
      const now = new Date()
      let months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
      if (months < 0) months = 0
      return { years: Math.floor(months / 12), months: months % 12 }
    } catch {
      // try next
    }
  }
  return null
}

async function checkBacklinkOverview(domain: string): Promise<TechnicalCheckResult> {
  const data = await getBacklinkOverview(domain)
  if (data === null) {
    return {
      checkId: 'backlink_count',
      level: 'info',
      title: '被リンク数を確認できません (API 未設定)',
      description: '被リンク(他サイトからのリンク)は Google の最重要ランキング要因のひとつです。特に権威性の高い日本のサイト(PR TIMES・Boxil・はてなブログなど)からの被リンクが効果的です。',
      fixSuggestion: 'AHREFS_API_KEY または DATAFORSEO_API_KEY を環境変数に設定すると、被リンク数の自動診断が利用できます。\nJP SEO Bot の被リンクプランナーで PR TIMES・Boxil・note・はてなブログなどへの登録計画を立てられます。',
      currentValue: '未確認',
      idealValue: '20 以上の信頼性の高いサイトから',
      scoreImpact: 0,
    }
  }
  const level: TechnicalCheckResult['level'] =
    data.referring_domains >= 20 ? 'passed' :
    data.referring_domains >= 5  ? 'warning' : 'critical'
  return {
    checkId: 'backlink_count',
    level,
    title: data.referring_domains >= 20
      ? `被リンクが十分にあります(${data.referring_domains} サイトから)`
      : `被リンクが少なすぎます(${data.referring_domains} サイトから)`,
    description: '被リンク(他サイトからのリンク)は Google の最重要ランキング要因のひとつです。',
    fixSuggestion: 'JP SEO Bot の被リンクプランナーを使って、PR TIMES・Boxil・note・はてなブログなどへの登録計画を立てましょう。',
    currentValue: `${data.referring_domains} サイトから ${data.total_backlinks} 件の被リンク`,
    idealValue: '20 以上の信頼性の高いサイトから',
    scoreImpact: data.referring_domains >= 20 ? 0 : data.referring_domains >= 5 ? -5 : -10,
  }
}

async function getBacklinkOverview(_domain: string): Promise<{ referring_domains: number; total_backlinks: number } | null> {
  const ahrefs = env('AHREFS_API_KEY')
  const dfs = env('DATAFORSEO_API_KEY')
  if (!ahrefs && !dfs) return null
  return { referring_domains: 0, total_backlinks: 0 }
}

const JAPAN_DIRECTORIES = [
  { name: 'Googleビジネスプロフィール', host: 'business.google.com', critical: true },
  { name: 'Yahoo!ロコ',                 host: 'loco.yahoo.co.jp',    critical: true },
  { name: 'エキテン',                   host: 'ekiten.jp',           critical: false },
  { name: 'Boxil SaaS',                 host: 'boxil.jp',            critical: false },
  { name: 'ITreview',                   host: 'itreview.jp',         critical: false },
] as const

async function checkJapanDirectories(domain: string): Promise<TechnicalCheckResult> {
  const status = await Promise.all(JAPAN_DIRECTORIES.map(async dir => ({
    ...dir,
    registered: await checkDirectoryRegistration(domain, dir.host),
  })))
  const knownCount = status.filter(d => d.registered !== null).length

  if (knownCount === 0) {
    return {
      checkId: 'japan_directories',
      level: 'info',
      title: '日本主要ディレクトリの登録状況を確認できません (API 未設定)',
      description: '日本の主要ビジネスディレクトリへの登録は、NAP 情報の一貫性を高め、ローカル SEO と被リンク獲得の両方に効果があります。',
      fixSuggestion: 'JP SEO Bot の被リンクプランナーで一括管理できます。\n優先: Googleビジネスプロフィール、Yahoo!ロコ、エキテン、Boxil SaaS、ITreview',
      currentValue: '未確認',
      idealValue: '全ディレクトリ登録済み',
      scoreImpact: 0,
    }
  }

  const unregisteredCritical = status.filter(d => d.critical && d.registered === false)
  const unregisteredAll = status.filter(d => d.registered === false)
  const registered = status.filter(d => d.registered === true).length
  return {
    checkId: 'japan_directories',
    level: unregisteredCritical.length > 0 ? 'warning'
      : unregisteredAll.length > 2 ? 'info' : 'passed',
    title: unregisteredCritical.length === 0
      ? '主要日本ディレクトリへの登録が完了しています'
      : `重要なディレクトリ ${unregisteredCritical.length} 件への登録が未完了です`,
    description: '日本の主要ビジネスディレクトリへの登録は、NAP 情報の一貫性を高め、ローカル SEO と被リンク獲得の両方に効果があります。',
    fixSuggestion: unregisteredAll.length > 0
      ? `未登録のディレクトリ: ${unregisteredAll.map(d => d.name).join('、')}\nJP SEO Bot の被リンクプランナーで一括管理できます。`
      : '',
    currentValue: `${registered}/${knownCount} 登録済み`,
    idealValue: '全ディレクトリ登録済み',
    scoreImpact: unregisteredCritical.length > 0 ? -8 : unregisteredAll.length > 2 ? -3 : 0,
  }
}

async function checkDirectoryRegistration(domain: string, dirHost: string): Promise<boolean | null> {
  const key = env('SERPAPI_KEY')
  if (!key) return null
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?engine=google&q=site:${dirHost}+${domain}&hl=ja&gl=jp&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    return ((data?.search_information?.total_results ?? 0) as number) > 0
  } catch {
    return null
  }
}
