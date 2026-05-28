// JAPAN_SPEC §H — 日本語コンテンツ品質スコアリング詳細版.
import type { ContentScore, ContentScoreBreakdown } from '../store/types'
import {
  calculateCoOccurrenceScore,
  calculateJapaneseReadability,
  calculateKeywordDensity,
} from './japaneseNlp'

const YAKUJIHO_NG = [
  '完治',
  '完全に治る',
  '永久に',
  '絶対に',
  '即効',
  '万能',
  '最高',
  '最強',
  '世界一',
  'No.1',
  '驚異の',
  '医療レベル',
  '医薬品',
  'がんが治る',
]

const AUTHOR_PATTERNS = [/著者/, /執筆/, /監修/, /編集部/]
const CITATION_PATTERNS = [
  /出典[:：]/,
  /参考[:：]/,
  /参照[:：]/,
  /\[\d+\]/,
  /https?:\/\//,
]
const UPDATE_PATTERNS = [
  /最終更新[:：]/,
  /更新日[:：]/,
  /\d{4}年\d{1,2}月\d{1,2}日/,
]
const FAQ_PATTERNS = [/よくある(質問|ご質問)/, /FAQ/i, /Q\s*[:：]/]
const KEIGO_PATTERNS = [/です。/, /ます。/, /でしょう/, /ございます/]

function patternHits(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, p) => sum + (text.match(p)?.length ?? 0), 0)
}

export interface ScoreInput {
  text: string
  targetKeyword: string
  wordCount: number
  headingsH2: number
  headingsH3: number
  internalLinkCount: number
}

const IDEAL_DENSITY_MIN = 0.5
const IDEAL_DENSITY_MAX = 3.0

export async function scoreJapaneseContent(input: ScoreInput): Promise<ContentScore> {
  const readability = calculateJapaneseReadability(input.text)
  const density = await calculateKeywordDensity(input.targetKeyword, input.text)
  const cooccur = await calculateCoOccurrenceScore(input.targetKeyword, input.text)

  const sortedCo = Array.from(cooccur.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20)
  const coScore = Math.min(100, Math.round((sortedCo.length / 20) * 100))

  const densityScore =
    density.density >= IDEAL_DENSITY_MIN && density.density <= IDEAL_DENSITY_MAX
      ? 100
      : density.density === 0
        ? 0
        : Math.max(0, 100 - Math.abs(density.density - 1.5) * 30)

  const headingScore = (() => {
    if (input.headingsH2 === 0) return 30
    let s = 60
    if (input.headingsH2 >= 3) s += 20
    if (input.headingsH3 >= 3) s += 10
    if (input.headingsH2 > 12) s -= 10
    return Math.min(100, Math.max(0, s))
  })()

  const wordCountScore = (() => {
    if (input.wordCount < 800) return Math.round((input.wordCount / 800) * 60)
    if (input.wordCount >= 2000 && input.wordCount <= 5000) return 100
    if (input.wordCount > 5000) return 90
    return 70 + Math.round(((input.wordCount - 800) / 1200) * 30)
  })()

  const internalLinksScore = Math.min(100, input.internalLinkCount * 20)

  const authorInfo = patternHits(input.text, AUTHOR_PATTERNS) > 0 ? 100 : 30
  const citationScore = Math.min(100, patternHits(input.text, CITATION_PATTERNS) * 25)
  const updateDate = patternHits(input.text, UPDATE_PATTERNS) > 0 ? 100 : 40

  const ngHits = YAKUJIHO_NG.filter(w => input.text.includes(w)).length
  const yakujihoCompliance = Math.max(0, 100 - ngHits * 25)

  const keigoHits = patternHits(input.text, KEIGO_PATTERNS)
  const keigoScore = Math.min(100, keigoHits * 8)

  const faqPresence = patternHits(input.text, FAQ_PATTERNS) > 0 ? 100 : 0

  const breakdown: ContentScoreBreakdown = {
    coOccurrenceScore: coScore,
    readabilityScore: readability.score,
    keywordDensity: Math.round(densityScore),
    headingStructure: headingScore,
    wordCount: wordCountScore,
    internalLinks: internalLinksScore,
    authorInfo,
    citationScore,
    updateDate,
    yakujihoCompliance,
    keigo: keigoScore,
    faqPresence,
  }

  const weights: Record<keyof ContentScoreBreakdown, number> = {
    coOccurrenceScore: 1.2,
    readabilityScore: 1.0,
    keywordDensity: 1.0,
    headingStructure: 0.9,
    wordCount: 0.8,
    internalLinks: 0.6,
    authorInfo: 0.7,
    citationScore: 0.8,
    updateDate: 0.5,
    yakujihoCompliance: 1.0,
    keigo: 0.4,
    faqPresence: 0.6,
  }

  let weightedSum = 0
  let weightTotal = 0
  for (const k of Object.keys(weights) as (keyof ContentScoreBreakdown)[]) {
    weightedSum += breakdown[k] * weights[k]
    weightTotal += weights[k]
  }
  const overall = Math.round(weightedSum / weightTotal)

  const suggestions: string[] = []
  if (breakdown.keywordDensity < 60) {
    suggestions.push(
      `キーワード密度が ${density.density}% です。理想は 0.5〜3.0%。「${input.targetKeyword}」を本文中に自然に追加してください。`,
    )
  }
  if (breakdown.coOccurrenceScore < 60) {
    suggestions.push(
      '上位競合の共起語カバレッジが不足しています。関連名詞を 10〜20 個追加すると順位向上が見込めます。',
    )
  }
  if (breakdown.readabilityScore < 60) {
    suggestions.push(
      `平均文長 ${readability.averageSentenceLength} 文字、漢字率 ${readability.kanjiRate}% です。1 文 40〜80 文字・漢字率 30〜40% を目安に調整してください。`,
    )
  }
  if (breakdown.headingStructure < 70) {
    suggestions.push('H2/H3 構造を整理。H2 を 3 以上、各 H2 配下に H3 を 2-3 配置するのが理想です。')
  }
  if (breakdown.wordCount < 70) {
    suggestions.push(
      `文字数 ${input.wordCount}。SEO 競合の上位記事は 2,000〜5,000 文字程度。深掘りを推奨します。`,
    )
  }
  if (breakdown.internalLinks < 60) {
    suggestions.push('内部リンクが 3 件未満です。関連記事へのリンクを 3〜5 件追加してください。')
  }
  if (breakdown.authorInfo < 60) {
    suggestions.push(
      '著者・監修者の表記がありません。E-E-A-T 強化のため著者プロフィールへリンクを設置してください。',
    )
  }
  if (breakdown.citationScore < 60) {
    suggestions.push('一次情報・出典の引用が少ないです。「出典:」「参考:」表記で出典を明示してください。')
  }
  if (breakdown.updateDate < 60) {
    suggestions.push('最終更新日が記載されていません。「最終更新: YYYY年MM月DD日」を冒頭に追加してください。')
  }
  if (breakdown.yakujihoCompliance < 100) {
    suggestions.push(
      `薬機法 NG ワードが ${ngHits} 件検出されました。「完治」「絶対」「即効」等の表現を改善してください。`,
    )
  }
  if (breakdown.faqPresence === 0) {
    suggestions.push('FAQ セクションがありません。FAQPage スキーマと組み合わせるとリッチリザルト獲得に有効です。')
  }

  return { overall, breakdown, suggestions }
}
