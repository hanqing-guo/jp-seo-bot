// 薬機法 / 景品表示法 危険表現検出
// DIAGNOSIS_SPEC.md §4.1 から参照される detectYakujihoViolations の実装。

export type YakujihoLevel = 'violation' | 'warning'

export interface YakujihoMatch {
  text: string
  level: YakujihoLevel
  category: '薬機法' | '景品表示法' | '医療広告ガイドライン'
  reason: string
}

const VIOLATION_PATTERNS: { re: RegExp; category: YakujihoMatch['category']; reason: string }[] = [
  { re: /完治(する|します|可能)/, category: '薬機法',           reason: '医薬品でない製品が「完治」を謳うのは薬機法違反' },
  { re: /(?:癌|がん|ガン)が治る/, category: '医療広告ガイドライン', reason: '疾病治療効果の標榜は医療広告ガイドライン違反' },
  { re: /必ず治る/,                category: '薬機法',           reason: '効果保証表現は薬機法違反' },
  { re: /100%[\s ]?(?:効果|成功|改善|安全)/, category: '景品表示法', reason: '100% 効果保証は不当表示の典型例' },
  { re: /即効性?(?:あり|保証)/,    category: '薬機法',           reason: '即効性の保証は薬機法 66 条違反のおそれ' },
  { re: /世界初(?:[!！]|の)/,       category: '景品表示法',       reason: '客観的根拠が必要(優良誤認防止)' },
]

const WARNING_PATTERNS: { re: RegExp; category: YakujihoMatch['category']; reason: string }[] = [
  { re: /世界一/,                   category: '景品表示法',       reason: '客観的根拠の明示が必要' },
  { re: /日本一/,                   category: '景品表示法',       reason: '客観的根拠の明示が必要' },
  { re: /業界No\.?\s?1/i,          category: '景品表示法',       reason: '調査主体・調査時期・対象範囲を併記する必要' },
  { re: /最高(?:級|品質)/,          category: '景品表示法',       reason: '優良誤認のおそれ — 根拠が必要' },
  { re: /絶対/,                     category: '薬機法',           reason: '断定的保証表現は避ける' },
  { re: /永久に/,                   category: '薬機法',           reason: '時間的保証は誇大広告のおそれ' },
  { re: /万能/,                     category: '薬機法',           reason: '広範な効能の標榜は誇大広告' },
  { re: /奇跡(?:の|的)/,            category: '景品表示法',       reason: '主観的すぎる誇張表現' },
  { re: /驚異的(?:な|に)/,          category: '景品表示法',       reason: '誇大表現のおそれ' },
  { re: /医療レベル/,                category: '医療広告ガイドライン', reason: '医療類似表現は治療効果を連想させる' },
]

export interface YakujihoResult extends YakujihoMatch {
  level: YakujihoLevel
}

/**
 * 本文テキスト中の薬機法 / 景品表示法 違反候補を検出。
 * spec §4.1 から detectYakujihoViolations(bodyText) として呼ばれる。
 */
export function detectYakujihoViolations(text: string): YakujihoResult[] {
  if (!text) return []
  const found: YakujihoResult[] = []
  const seen = new Set<string>()

  for (const p of VIOLATION_PATTERNS) {
    const m = text.match(p.re)
    if (m && !seen.has(m[0])) {
      seen.add(m[0])
      found.push({ text: m[0], level: 'violation', category: p.category, reason: p.reason })
    }
  }
  for (const p of WARNING_PATTERNS) {
    const m = text.match(p.re)
    if (m && !seen.has(m[0])) {
      seen.add(m[0])
      found.push({ text: m[0], level: 'warning', category: p.category, reason: p.reason })
    }
  }
  return found
}
