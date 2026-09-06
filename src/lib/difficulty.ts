// キーワード難易度判定 + tier マッピング
// 公開デモ用のキーワード難易度カテゴリ。期間・価格・順位成果は推定しない。

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
    targetMonths: 4,
    monthlyBudgetYen: 0,
    monthlyTaskTemplate: '検索意図と優先ページを確認',
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
    targetMonths: 4,
    monthlyBudgetYen: 0,
    monthlyTaskTemplate: '競合差分と優先ページを確認',
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
    targetMonths: 4,
    monthlyBudgetYen: 0,
    monthlyTaskTemplate: '対象範囲と優先順位を人が精査',
  },
}

// 消費税(日本は総額表示義務)。価格は税別を基準に保持し、表示は税込を主にする。
export const TAX_RATE = 0.1
export function withTax(yenExclusive: number): number {
  return Math.round(yenExclusive * (1 + TAX_RATE))
}

/**
 * 円の統一表示。locale を ja-JP に固定して桁区切りを保証する
 * (ブラウザ locale 依存の `toLocaleString()` だと、例: de 環境で "¥3.300" のように
 *  区切りが崩れる)。日本市場向けプロダクトなので常に ja-JP で揃える。
 */
export function formatYen(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`
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

  // ②' 広いヘッド語(YMYL ではないが検索数・競合が大きい一般トピック)。
  //    単独だと上位化が難しいので加点する。短語ガード(下記)からも除外する。
  const broadHead = [
    '英語', '英会話', '料理', 'レシピ', 'ダイエット', '筋トレ', '旅行', 'ホテル',
    '化粧品', 'コスメ', 'スキンケア', 'ファッション', '家電', 'パソコン', 'スマホ',
    'ゲーム', 'アニメ', '映画', '音楽', '漫画', 'プログラミング', '資格',
  ]
  const broadHits = broadHead.filter((w) => keyword.includes(w)).length
  if (broadHits > 0) kd += 12

  // ★ 無意味・極端に短い入力(空白を除き 2 文字以下)で、かつ競合シグナル(①②②')も
  //   無い場合は、実在の競合キーワードとして判定できない。最低档(easy 相当)で返す。
  //   「脱毛」「保険」等の意味ある短語は ① fierce、「英語」等は ②' broadHead で
  //   加点されるため誤判定にならない。
  //   ※ 以前は「短い=ヘッド語」とみなして加点し、単文字 "a" が最難・最高額の
  //     「むずかしい」档に誤判定されていた(発売阻断バグ)。その方向を是正する。
  if (charCount <= 2 && fierceHits === 0 && commHits === 0 && broadHits === 0) return 20

  // ③ ヘッド(広い)/ロングテール(具体)。
  if (wordCount <= 1) kd += 16
  else if (wordCount === 2) kd += 7
  else if (wordCount === 4) kd -= 6
  else if (wordCount >= 5) kd -= 13
  // 「短い=ヘッド語」の一律加点(旧 charCount<=4 → +10)は撤去。競合度は
  // ① fierce / ② commercial で判定し、長いロングテールのみ易化する。
  if (charCount >= 20) kd -= 6

  // ④ 情報・ハウツー系ロングテール → 易化。
  if (/(とは|やり方|方法|手順|始め方|作り方|初心者|入門|自分で|失敗|違い|意味|理由)/.test(keyword)) kd -= 9

  // ⑤ 超ローカル(小エリア×ニッチ)→ 易化。大都市名は競合が多く割引しない。
  const bigCity = /(東京|大阪|名古屋|横浜|福岡|札幌|京都|神戸|仙台|さいたま|千葉)/.test(keyword)
  const microLocal = /([一-龯ぁ-ん]{2,}市|[一-龯]{1,3}区|[一-龯]{2,}町|[一-龯ァ-ヶ]{2,}駅|近く|周辺|徒歩|地域)/.test(keyword)
  if (microLocal && !bigCity) kd -= 13
  else if (microLocal && bigCity) kd -= 3

  return Math.max(0, Math.min(100, Math.round(kd)))
}

/**
 * キーワードとして有効か。空白・単文字・記号のみ・乱码を弾く。
 *   - 空白を除いて 2 文字以上
 *   - 日本語(かな/カナ/漢字)または英数字を 1 文字以上含む
 * 開通フロー(KeywordInput)はこれが false の間は送信不可にする。
 */
export function isValidKeyword(raw: string): boolean {
  const k = (raw ?? '').trim()
  if (k.replace(/\s/g, '').length < 2) return false
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9]/u.test(k)
}

export function generateMonthlyTasks(tier: DifficultyTier): MonthlyTask[] {
  const profile = TIER_PROFILES[tier]
  const labels = [
    '対象URLと公開情報を読み取り専用で確認',
    '優先課題 Top 10 と日本語キーワード候補を整理',
    '競合 2〜3 サイトとの差分と30日アクション案を作成',
    '診断レポートを納品し、30分の説明を実施',
  ]
  return labels.map((label, i) => ({
    monthNumber: i + 1,
    label,
    budgetYen: profile.monthlyBudgetYen,
    status: 'planned',
  }))
}

// 顧客向け「私たちがやること」(専門用語なし・大白話)
export function serviceFeatures(tier: DifficultyTier): string[] {
  void tier
  return [
    '公開ページと読み取り専用の GSC データを確認',
    '優先課題 Top 10 と日本語キーワード候補を整理',
    '競合 2〜3 サイトとの差分を整理',
    '30日アクション案と30分の説明を提供',
  ]
}
