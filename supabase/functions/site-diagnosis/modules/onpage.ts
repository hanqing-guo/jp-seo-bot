// Module B — オンページ SEO 診断 (共通)
// DIAGNOSIS_SPEC.md §4.1 完全実装。

import { extractDomain, parseHTML } from '../../_shared/html.ts'
import { detectYakujihoViolations } from '../../_shared/yakujiho.ts'
import type { TechnicalCheckResult } from '../../_shared/types.ts'

export async function runOnpageChecks(
  url: string,
  html: string,
): Promise<TechnicalCheckResult[]> {
  const results: TechnicalCheckResult[] = []
  const doc = parseHTML(html)

  results.push(checkTitleTag(doc, url))
  results.push(checkMetaDescription(doc))
  results.push(checkH1(doc))
  results.push(checkHeadingStructure(doc))
  results.push(checkImageAlt(doc))
  results.push(checkCanonical(doc, url))
  results.push(checkContentLength(doc))

  const yakujihoResult = checkYakujiho(doc)
  if (yakujihoResult) results.push(yakujihoResult)

  return results
}

function checkTitleTag(doc: Document, url: string): TechnicalCheckResult {
  const title = doc.querySelector('title')?.textContent?.trim() ?? ''
  const len = title.length
  const domainName = extractDomain(url)

  let level: TechnicalCheckResult['level']
  let titleMsg: string
  let impact: number

  if (!title) {
    level = 'critical'
    titleMsg = 'title タグが設定されていません(致命的)'
    impact = -15
  } else if (len > 60) {
    level = 'warning'
    titleMsg = `title タグが長すぎます(${len} 文字 / 推奨: 30〜60 文字)`
    impact = -5
  } else if (len < 10) {
    level = 'warning'
    titleMsg = `title タグが短すぎます(${len} 文字)`
    impact = -5
  } else {
    level = 'passed'
    titleMsg = `title タグが適切に設定されています(${len} 文字)`
    impact = 0
  }

  return {
    checkId: 'title_tag',
    level,
    title: titleMsg,
    description: 'title タグは検索結果に表示されるページのタイトルです。クリック率に最も影響する SEO 要素のひとつです。',
    fixSuggestion: `ターゲットキーワードを含め、30〜60 文字で設定してください。\n例:「${domainName} | 中小企業向け SEO 自動化ツール - JP SEO Bot」`,
    currentValue: title || '(未設定)',
    idealValue: 'ターゲット KW を含む 30〜60 文字',
    scoreImpact: impact,
  }
}

function checkMetaDescription(doc: Document): TechnicalCheckResult {
  const meta = doc.querySelector('meta[name="description"]')
  const desc = meta?.getAttribute('content')?.trim() ?? ''
  const len = desc.length

  let level: TechnicalCheckResult['level']
  let title: string
  let impact: number

  if (!desc) {
    level = 'warning'
    title = 'meta description が設定されていません'
    impact = -8
  } else if (len > 160 || len < 50) {
    level = 'warning'
    title = len > 160
      ? `meta description が長すぎます(${len} 文字 / 推奨: 80〜160 文字)`
      : `meta description が短すぎます(${len} 文字 / 推奨: 80〜160 文字)`
    impact = -3
  } else {
    level = 'passed'
    title = `meta description が適切に設定されています(${len} 文字)`
    impact = 0
  }

  return {
    checkId: 'meta_description',
    level,
    title,
    description: 'meta description は検索結果のスニペット(説明文)として表示されます。クリック率に影響します。',
    fixSuggestion: '検索意図に応えた内容で 80〜160 文字で設定してください。キーワードを自然に含めましょう。',
    currentValue: desc || '(未設定)',
    idealValue: '80〜160 文字の説明文',
    scoreImpact: impact,
  }
}

function checkH1(doc: Document): TechnicalCheckResult {
  const h1Tags = doc.querySelectorAll('h1')
  const count = h1Tags.length
  const firstText = (h1Tags[0] as Element | undefined)?.textContent?.trim() ?? ''

  let level: TechnicalCheckResult['level']
  let title: string
  let impact: number

  if (count === 0) {
    level = 'critical'
    title = 'H1 タグが設定されていません(致命的)'
    impact = -10
  } else if (count > 1) {
    level = 'warning'
    title = `H1 タグが複数あります(${count} 個 / 推奨: 1 個)`
    impact = -5
  } else {
    level = 'passed'
    title = 'H1 タグが正しく設定されています'
    impact = 0
  }

  return {
    checkId: 'h1_tag',
    level,
    title,
    description: 'H1 タグはページの主題を示すタグです。ページ全体で 1 つだけ使用し、ターゲットキーワードを含めてください。',
    fixSuggestion: count === 0
      ? 'ページの最も重要な見出しに <h1> タグを設定してください。'
      : '複数の H1 を H2/H3 に変更し、1 ページ 1 H1 に統一してください。',
    currentValue: count === 0 ? '(なし)' : `${count} 個: "${firstText.slice(0, 60)}"`,
    idealValue: '1 個のみ(ターゲット KW 含む)',
    scoreImpact: impact,
  }
}

function checkHeadingStructure(doc: Document): TechnicalCheckResult {
  const h2 = doc.querySelectorAll('h2').length
  const h3 = doc.querySelectorAll('h3').length
  return {
    checkId: 'heading_structure',
    level: h2 === 0 ? 'warning' : 'passed',
    title: h2 === 0
      ? '見出し構造(H2/H3)が設定されていません'
      : `見出し構造が設定されています(H2: ${h2} 個 / H3: ${h3} 個)`,
    description: '適切な見出し構造は、クローラーがコンテンツの構造を理解するために重要です。また、ユーザーの可読性も向上します。',
    fixSuggestion: '本文を H2(大見出し)で区切り、詳細を H3(小見出し)でまとめてください。各見出しに関連キーワードを自然に含めましょう。',
    currentValue: `H2: ${h2} 個 / H3: ${h3} 個`,
    idealValue: 'H2: 3〜8 個 / H3: 適宜',
    scoreImpact: h2 === 0 ? -3 : 0,
  }
}

function checkImageAlt(doc: Document): TechnicalCheckResult {
  const imgs = Array.from(doc.querySelectorAll('img'))
  const without = imgs.filter(img => !(img as Element).getAttribute('alt')).length
  const total = imgs.length
  const ratio = total > 0 ? Math.round(((total - without) / total) * 100) : 100

  let level: TechnicalCheckResult['level']
  let impact: number
  if (without === 0) {
    level = 'passed'
    impact = 0
  } else if (total > 0 && without > total * 0.3) {
    level = 'warning'
    impact = -5
  } else {
    level = 'info'
    impact = -2
  }

  return {
    checkId: 'image_alt',
    level,
    title: without === 0
      ? `全画像に alt テキストが設定されています (${total} 件)`
      : `alt テキストのない画像が ${without} 件あります(設定率: ${ratio}%)`,
    description: '画像の alt テキストは、クローラーが画像の内容を理解するための情報です。関連キーワードを含めることで SEO に貢献します。視覚障害のあるユーザーへのアクセシビリティにも重要です。',
    fixSuggestion: 'すべての <img> タグに内容を説明する alt 属性を追加してください。装飾画像は alt="" とします。',
    currentValue: `${without} 件 未設定 / 全 ${total} 件`,
    idealValue: '全画像に設定(100%)',
    scoreImpact: impact,
  }
}

function checkCanonical(doc: Document, url: string): TechnicalCheckResult {
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? ''
  return {
    checkId: 'canonical',
    level: canonical ? 'passed' : 'info',
    title: canonical
      ? 'canonical タグが設定されています'
      : 'canonical タグが設定されていません',
    description: 'canonical タグは重複コンテンツの問題を防ぎ、SEO 評価を正しく集約するために重要です。',
    fixSuggestion: `<link rel="canonical" href="${url}"> を各ページの <head> 内に追加してください。`,
    currentValue: canonical || '(未設定)',
    idealValue: '各ページの正規 URL',
    scoreImpact: canonical ? 0 : -3,
  }
}

function checkContentLength(doc: Document): TechnicalCheckResult {
  const bodyText = (doc.querySelector('body') as Element | null)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  const count = bodyText.length

  let level: TechnicalCheckResult['level']
  let title: string
  let impact: number

  if (count >= 1500) {
    level = 'passed'
    title = `コンテンツ量が十分です(約 ${count.toLocaleString()} 文字)`
    impact = 0
  } else if (count >= 500) {
    level = 'warning'
    title = `コンテンツが少なめです(約 ${count.toLocaleString()} 文字 / 推奨: 1,500 文字以上)`
    impact = -5
  } else {
    level = 'critical'
    title = `コンテンツが少なすぎます(約 ${count.toLocaleString()} 文字 / 推奨: 1,500 文字以上)`
    impact = -10
  }

  return {
    checkId: 'content_length',
    level,
    title,
    description: '日本語 SEO では、1 ページあたり 1,500〜3,000 文字以上のコンテンツが上位表示の傾向があります。薄いコンテンツ(Thin Content)はペナルティの対象になることもあります。',
    fixSuggestion: 'FAQ セクション・具体的な使用例・よくある質問などを追加して、コンテンツを充実させてください。',
    currentValue: `約 ${count.toLocaleString()} 文字`,
    idealValue: '1,500〜3,000 文字以上',
    scoreImpact: impact,
  }
}

function checkYakujiho(doc: Document): TechnicalCheckResult | null {
  const bodyText = (doc.querySelector('body') as Element | null)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  const issues = detectYakujihoViolations(bodyText)
  if (issues.length === 0) return null

  const hasViolation = issues.some(i => i.level === 'violation')
  return {
    checkId: 'yakujiho_check',
    level: hasViolation ? 'critical' : 'warning',
    title: `薬機法・景品表示法に注意が必要な表現が ${issues.length} 件検出されました`,
    description: '日本の薬機法(医薬品等の品質・有効性・安全性の確保等に関する法律)や景品表示法に違反する表現は、SEO ペナルティだけでなく法的リスクもあります。',
    fixSuggestion: `検出された表現:${issues.map(i => `「${i.text}」(${i.reason})`).join(' / ')}\nこれらの表現を修正するか、根拠となるデータを明示してください。`,
    currentValue: `${issues.length} 件の問題表現`,
    idealValue: '問題表現 0 件',
    scoreImpact: hasViolation ? -15 : -5,
  }
}
