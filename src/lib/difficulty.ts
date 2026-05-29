// キーワード難易度判定 + tier マッピング
// Han 指示書の定義に厳密に従う:
//   🟢 かんたん   KD 0-30   → 3 ヶ月で 1 ページ目 / ¥3,000/月
//   🟡 ふつう     KD 31-60  → 6 ヶ月で 1 ページ目 / ¥6,000/月
//   🔴 むずかしい KD 61-100 → 10 ヶ月で 1 ページ目 / ¥12,000/月

import type { DifficultyTier, MonthlyTask } from '../store/types'

export interface TierProfile {
  tier: DifficultyTier
  emoji: string
  label: string
  shortLabel: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
  targetMonths: number
  monthlyBudgetYen: number
  monthlyTaskTemplate: string
}

export const TIER_PROFILES: Record<DifficultyTier, TierProfile> = {
  easy: {
    tier: 'easy',
    emoji: '🟢',
    label: 'かんたん',
    shortLabel: 'KD 0-30',
    color: '#16a34a',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-700',
    targetMonths: 3,
    monthlyBudgetYen: 3000,
    monthlyTaskTemplate: 'AI 記事 月 2 本、内部リンク最適化',
  },
  medium: {
    tier: 'medium',
    emoji: '🟡',
    label: 'ふつう',
    shortLabel: 'KD 31-60',
    color: '#ca8a04',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-700',
    targetMonths: 6,
    monthlyBudgetYen: 6000,
    monthlyTaskTemplate: 'AI 記事 月 4 本、被リンク獲得',
  },
  hard: {
    tier: 'hard',
    emoji: '🔴',
    label: 'むずかしい',
    shortLabel: 'KD 61-100',
    color: '#dc2626',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-700',
    targetMonths: 10,
    monthlyBudgetYen: 12000,
    monthlyTaskTemplate: 'AI 記事 月 8 本、PR TIMES 配信、被リンク強化',
  },
}

export function tierFromKD(kd: number): DifficultyTier {
  if (kd <= 30) return 'easy'
  if (kd <= 60) return 'medium'
  return 'hard'
}

export function profileFromKD(kd: number): TierProfile {
  return TIER_PROFILES[tierFromKD(kd)]
}

/**
 * キーワード文字列から KD 0-100 を heuristic で推定。
 */
export function estimateKD(rawKeyword: string): number {
  const keyword = rawKeyword.trim()
  if (!keyword) return 50

  const tokens = keyword.split(/[\s　]+/).filter(Boolean)
  const wordCount = tokens.length
  const charCount = keyword.replace(/\s/g, '').length

  let kd = 55

  if (wordCount >= 5) kd -= 30
  else if (wordCount >= 4) kd -= 20
  else if (wordCount >= 3) kd -= 12
  else if (wordCount >= 2) kd -= 5

  if (charCount <= 3) kd += 30
  else if (charCount <= 5) kd += 15
  else if (charCount >= 18) kd -= 8

  const generic = ['SEO', 'マーケティング', '対策', 'ツール', '比較', 'おすすめ', 'ランキング', 'とは', '方法', 'やり方']
  for (const g of generic) {
    if (keyword.includes(g)) kd += 8
  }

  const longtail = [/[一-龯]{2,}市/, /[一-龯]{1,}区/, /[一-龯]{1,}駅/, /\d{4}年/, /\d{1,2}\s*月/, /近く/, /徒歩/, /選び方/, /失敗/, /体験談/]
  for (const re of longtail) {
    if (re.test(keyword)) kd -= 10
  }

  if (/(料金|価格|無料|安い|サブスク|プラン)/.test(keyword)) kd += 5

  return Math.max(0, Math.min(100, Math.round(kd)))
}

export function generateMonthlyTasks(tier: DifficultyTier): MonthlyTask[] {
  const profile = TIER_PROFILES[tier]
  const tasks: MonthlyTask[] = []

  if (tier === 'easy') {
    const labels = [
      'AI 記事 2 本 + 内部リンク整理',
      'AI 記事 2 本 + キーワードクラスタ拡張',
      'AI 記事 2 本 + 順位改善検証 + 共起語見直し',
    ]
    for (let i = 0; i < 3; i++) {
      tasks.push({ monthNumber: i + 1, label: labels[i], budgetYen: profile.monthlyBudgetYen, status: 'planned' })
    }
  } else if (tier === 'medium') {
    const labels = [
      'AI 記事 4 本 + 内部リンク最適化',
      'AI 記事 4 本 + 被リンク候補リスト作成',
      'AI 記事 4 本 + はてなブログ / note への投稿',
      'AI 記事 4 本 + 業界比較サイトへの掲載申請',
      'AI 記事 4 本 + 被リンク獲得 + 既存記事リライト',
      'AI 記事 4 本 + 順位検証 + コンテンツリフレッシュ',
    ]
    for (let i = 0; i < 6; i++) {
      tasks.push({ monthNumber: i + 1, label: labels[i], budgetYen: profile.monthlyBudgetYen, status: 'planned' })
    }
  } else {
    const labels = [
      'AI 記事 8 本 + ピラーページ作成 + 内部リンク骨組み',
      'AI 記事 8 本 + PR TIMES 配信 1 本 + 被リンク獲得',
      'AI 記事 8 本 + Qiita / Zenn 投稿 + 業界記事拡散',
      'AI 記事 8 本 + PR TIMES 配信 1 本 + Boxil 掲載申請',
      'AI 記事 8 本 + 既存記事リライト + 共起語見直し',
      'AI 記事 8 本 + PR TIMES 配信 1 本 + 被リンク強化',
      'AI 記事 8 本 + AI Overview 対応(FAQ / Schema 追加)',
      'AI 記事 8 本 + 順位改善検証 + 内部リンク再構築',
      'AI 記事 8 本 + PR TIMES 配信 1 本 + 海外被リンク',
      'AI 記事 8 本 + 最終ブースト(プレスリリース + リフレッシュ)',
    ]
    for (let i = 0; i < 10; i++) {
      tasks.push({ monthNumber: i + 1, label: labels[i], budgetYen: profile.monthlyBudgetYen, status: 'planned' })
    }
  }

  return tasks
}

export function budgetBreakdown(tier: DifficultyTier): { label: string; yen: number }[] {
  if (tier === 'easy') {
    return [
      { label: 'AI 記事の作成(2 本)', yen: 2000 },
      { label: '順位チェックツール', yen: 1000 },
    ]
  }
  if (tier === 'medium') {
    return [
      { label: 'AI 記事の作成(4 本)', yen: 3500 },
      { label: '紹介リンクの獲得', yen: 1500 },
      { label: '順位チェックツール', yen: 1000 },
    ]
  }
  return [
    { label: 'AI 記事の作成(8 本)', yen: 6500 },
    { label: 'プレスリリース配信(月 1 本)', yen: 3500 },
    { label: '紹介リンクの獲得', yen: 1500 },
    { label: '順位チェックツール', yen: 500 },
  ]
}

// 顧客向け「私たちがやること」(専門用語なし・大白話)
export function serviceFeatures(tier: DifficultyTier): string[] {
  const base = ['毎日、Google と Yahoo の順位を自動でチェック']
  if (tier === 'easy') {
    return [
      ...base,
      'AI が SEO 記事を毎月 2 本 作成',
      'サイト内の改善を自動で実施',
      '毎月、わかりやすい成果レポートをお届け',
    ]
  }
  if (tier === 'medium') {
    return [
      ...base,
      'AI が SEO 記事を毎月 4 本 作成',
      '他サイトからの紹介リンクを増やす',
      'ライバルサイトの動きを監視',
      '毎月、わかりやすい成果レポートをお届け',
    ]
  }
  return [
    ...base,
    'AI が SEO 記事を毎月 8 本 作成',
    '他サイトからの紹介リンクを増やす',
    'ニュースサイトへプレスリリースを配信(月 1 本)',
    '上位表示を強力に後押し',
    '毎月、わかりやすい成果レポートをお届け',
  ]
}
