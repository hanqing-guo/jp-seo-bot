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

// 消費税(日本は総額表示義務)。価格は税別を基準に保持し、表示は税込を主にする。
export const TAX_RATE = 0.1
export function withTax(yenExclusive: number): number {
  return Math.round(yenExclusive * (1 + TAX_RATE))
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
 * キーワード文字列から SEO 難易度 KD(0-100)を推定する heuristic。
 *
 * ⚠️ これは SERP を実測した値ではなく語彙ベースの推定。正確な競合度には
 *    順位/難易度 API(DataForSEO 等)が必要。ただし「弁護士 無料 相談」等の
 *    高単価・YMYL・激戦ワードを安易プランに誤判定しないことを最優先に設計。
 *
 * 主要シグナル:
 *   ① 高競合/YMYL/お金が動く業種(弁護士・保険・不動産・転職・クレカ…)→ 大きく難化
 *   ② 商業修飾(おすすめ・比較・無料・料金…)→ 難化
 *   ③ 広いヘッド語(1〜2語/短語)→ 難化 / 具体的ロングテール・ハウツー → 易化
 *   ④ 超ローカル(小エリア×ニッチ)→ 易化(大都市名は割引しない)
 */
export function estimateKD(rawKeyword: string): number {
  const keyword = rawKeyword.trim()
  if (!keyword) return 50
  const lower = keyword.toLowerCase()
  const tokens = keyword.split(/[\s　]+/).filter(Boolean)
  const wordCount = tokens.length
  const charCount = keyword.replace(/\s/g, '').length

  let kd = 42

  // ① 高競合・YMYL・高単価の業種(SEO 最激戦区)。最重要シグナル。
  const fierce = [
    '弁護士', '税理士', '司法書士', '行政書士', '社労士', '探偵', '興信所',
    '医師', '医院', '歯医者', '歯科', 'クリニック', '美容外科', '整形', '脱毛', 'aga', '薄毛', 'インプラント', '矯正', '病院',
    '転職', '求人', '派遣', 'アルバイト', '就職', 'エージェント',
    '不動産', '賃貸', 'マンション', '戸建', '土地', '売却', '査定', '買取', 'リフォーム', '外壁塗装', '注文住宅', 'ハウスメーカー',
    '保険', '生命保険', '自動車保険', '医療保険', 'クレジットカード', 'クレカ', 'カードローン', 'キャッシング', '借金', '債務整理', '過払い', 'ローン', '住宅ローン',
    'fx', '投資', '株', '仮想通貨', 'nisa', 'ideco', '資産運用',
    '副業', '在宅ワーク', '結婚相談', '婚活', 'マッチングアプリ',
    '引っ越し', '引越', '葬儀', '葬式', '永代供養', '格安sim', '光回線', 'wifi', 'ウォーターサーバー', '電力', '動画配信', 'エステ',
  ]
  const fierceHits = fierce.filter((w) => lower.includes(w)).length
  if (fierceHits > 0) kd += 32 + Math.min(12, (fierceHits - 1) * 8)

  // ② 競合を強める商業修飾(比較・お金系)。
  const commercial = ['おすすめ', '比較', 'ランキング', '口コミ', '評判', '人気', '無料', '相談', '料金', '費用', '相場', '安い', '最安', '格安', '見積', '申込', '予約', '解約', '選び方']
  const commHits = commercial.filter((w) => keyword.includes(w)).length
  kd += Math.min(20, commHits * 6)

  // ③ ヘッド(広い)/ロングテール(具体)。
  if (wordCount <= 1) kd += 16
  else if (wordCount === 2) kd += 7
  else if (wordCount === 4) kd -= 6
  else if (wordCount >= 5) kd -= 13
  if (charCount <= 4) kd += 10
  else if (charCount >= 20) kd -= 6

  // ④ 情報・ハウツー系ロングテール → 易化。
  if (/(とは|やり方|方法|手順|始め方|作り方|初心者|入門|自分で|失敗|違い|意味|理由)/.test(keyword)) kd -= 9

  // ⑤ 超ローカル(小エリア×ニッチ)→ 易化。大都市名は競合が多く割引しない。
  const bigCity = /(東京|大阪|名古屋|横浜|福岡|札幌|京都|神戸|仙台|さいたま|千葉)/.test(keyword)
  const microLocal = /([一-龯ぁ-ん]{2,}市|[一-龯]{1,3}区|[一-龯]{2,}町|[一-龯ァ-ヶ]{2,}駅|近く|周辺|徒歩|地域)/.test(keyword)
  if (microLocal && !bigCity) kd -= 13
  else if (microLocal && bigCity) kd -= 3

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
