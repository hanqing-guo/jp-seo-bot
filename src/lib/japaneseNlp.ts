// JAPAN_SPEC §A — 日本語 NLP パイプライン (kuromoji.js).
// ブラウザ側で形態素解析・共起語抽出・可読性スコアを算出。
// NOTE: kuromoji は CJS パッケージで、最上位 import 時に Node 専用 require が
// 走るため、ブラウザでは動的 import を使って遅延ロードする。
import type { IpadicFeatures, Tokenizer } from 'kuromoji'

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null

export function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (tokenizerPromise) return tokenizerPromise
  type Builder = { build: (cb: (err: Error | null, tk: Tokenizer<IpadicFeatures>) => void) => void }
  type KuromojiAPI = { builder: (opts: { dicPath: string }) => Builder }

  tokenizerPromise = (async () => {
    const mod = (await import('kuromoji')) as unknown as KuromojiAPI & { default?: KuromojiAPI }
    const kuromoji: KuromojiAPI = mod.default ?? mod
    if (typeof kuromoji.builder !== 'function') {
      throw new Error('kuromoji.builder is not available')
    }
    return new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromoji
        .builder({ dicPath: '/dict' })
        .build((err: Error | null, tk: Tokenizer<IpadicFeatures>) => {
          if (err) {
            tokenizerPromise = null
            reject(err)
          } else {
            resolve(tk)
          }
        })
    })
  })()
  return tokenizerPromise
}

export interface Token {
  surface_form: string
  pos: string
  pos_detail_1: string
  reading: string
  basic_form: string
}

export async function tokenize(text: string): Promise<Token[]> {
  if (!text) return []
  const tk = await getTokenizer()
  return tk.tokenize(text).map(t => ({
    surface_form: t.surface_form,
    pos: t.pos,
    pos_detail_1: t.pos_detail_1,
    reading: t.reading ?? '',
    basic_form: t.basic_form ?? t.surface_form,
  }))
}

export async function extractKeyNouns(text: string): Promise<string[]> {
  const tokens = await tokenize(text)
  return tokens
    .filter(
      t =>
        t.pos === '名詞' &&
        t.pos_detail_1 !== '非自立' &&
        t.pos_detail_1 !== '代名詞' &&
        t.pos_detail_1 !== '数' &&
        t.surface_form.length > 1,
    )
    .map(t => t.surface_form)
}

export async function calculateCoOccurrenceScore(
  targetKeyword: string,
  pageContent: string,
): Promise<Map<string, number>> {
  const [targetNouns, pageNouns] = await Promise.all([
    extractKeyNouns(targetKeyword),
    extractKeyNouns(pageContent),
  ])
  const freq = new Map<string, number>()
  for (const noun of pageNouns) {
    if (!targetNouns.includes(noun)) {
      freq.set(noun, (freq.get(noun) ?? 0) + 1)
    }
  }
  const scores = new Map<string, number>()
  if (freq.size === 0) return scores
  const maxFreq = Math.max(...freq.values())
  for (const [word, count] of freq) {
    scores.set(word, count / maxFreq)
  }
  return scores
}

export interface ReadabilityResult {
  score: number
  averageSentenceLength: number
  kanjiRate: number
  sentenceCount: number
}

export function calculateJapaneseReadability(text: string): ReadabilityResult {
  if (!text || !text.trim()) {
    return { score: 0, averageSentenceLength: 0, kanjiRate: 0, sentenceCount: 0 }
  }
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) {
    return { score: 0, averageSentenceLength: text.length, kanjiRate: 0, sentenceCount: 0 }
  }
  const totalLen = sentences.reduce((sum, s) => sum + s.length, 0)
  const avgLength = totalLen / sentences.length

  const lengthScore =
    avgLength >= 40 && avgLength <= 80
      ? 100
      : avgLength < 40
        ? Math.max(40, 70 + avgLength)
        : Math.max(0, 100 - (avgLength - 80) * 2)

  const kanjiCount = (text.match(/[一-龯]/g) || []).length
  const kanjiRate = kanjiCount / text.length
  const kanjiScore =
    kanjiRate >= 0.3 && kanjiRate <= 0.4
      ? 100
      : Math.max(0, 100 - Math.abs(kanjiRate - 0.35) * 500)

  return {
    score: Math.round((lengthScore + kanjiScore) / 2),
    averageSentenceLength: Math.round(avgLength * 10) / 10,
    kanjiRate: Math.round(kanjiRate * 1000) / 10,
    sentenceCount: sentences.length,
  }
}

export interface PosBreakdown {
  pos: string
  count: number
  examples: string[]
}

export async function posBreakdown(text: string): Promise<PosBreakdown[]> {
  const tokens = await tokenize(text)
  const byPos = new Map<string, { count: number; examples: Set<string> }>()
  for (const t of tokens) {
    const slot = byPos.get(t.pos) ?? { count: 0, examples: new Set<string>() }
    slot.count += 1
    if (slot.examples.size < 5) slot.examples.add(t.surface_form)
    byPos.set(t.pos, slot)
  }
  return Array.from(byPos.entries())
    .map(([pos, v]) => ({ pos, count: v.count, examples: Array.from(v.examples) }))
    .sort((a, b) => b.count - a.count)
}

export interface KeywordDensityResult {
  keyword: string
  count: number
  totalTokens: number
  density: number
}

export async function calculateKeywordDensity(
  targetKeyword: string,
  text: string,
): Promise<KeywordDensityResult> {
  const target = targetKeyword.replace(/\s+/g, '')
  const tokens = await tokenize(text)
  const totalTokens = tokens.filter(t => t.pos !== '記号').length
  if (totalTokens === 0) {
    return { keyword: targetKeyword, count: 0, totalTokens: 0, density: 0 }
  }
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const count = (text.match(new RegExp(escaped, 'g')) || []).length
  return {
    keyword: targetKeyword,
    count,
    totalTokens,
    density: Math.round((count / totalTokens) * 10000) / 100,
  }
}
