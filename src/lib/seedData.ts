// 初期表示用の KW。
// 【内测(β运用)】自分たち(enki / enkiseojp.com)を「最初の顧客」として後台に投入する dogfood 用シード。
// enki が実際に上げたい本物のキーワード 5 件(🟢2 / 🟡2 / 🔴1)。運用初期なので順位は
// currentRank=null(計測中)— GSC を接続すると実順位が入る。请求はしない(料金は目安表示のみ)。

import type { Keyword, RankSnapshot } from '../store/types'
import { generateMonthlyTasks, profileFromKD, tierFromKD } from './difficulty'

function rankHistory(startRank: number, finalRank: number, months: number): RankSnapshot[] {
  const snapshots: RankSnapshot[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const t = (months - 1 - i) / Math.max(1, months - 1)
    const interp = Math.round(startRank + (finalRank - startRank) * t)
    snapshots.push({
      date: d.toISOString().slice(0, 10),
      google: interp,
      yahoo: Math.max(1, interp + (i % 3 === 0 ? 2 : i % 2 === 0 ? -1 : 0)),
    })
  }
  return snapshots
}

function buildKeyword(
  id: string,
  keyword: string,
  difficulty: number,
  elapsedMonths: number,
  startRank: number,
  currentRank: number | null,
  createdAt: string,
): Keyword {
  const tier = tierFromKD(difficulty)
  const profile = profileFromKD(difficulty)
  const tasks = generateMonthlyTasks(tier)

  for (let i = 0; i < elapsedMonths && i < tasks.length; i++) {
    tasks[i].status = i === elapsedMonths - 1 ? 'in_progress' : 'done'
  }

  return {
    id,
    keyword,
    difficulty,
    tier,
    targetMonths: profile.targetMonths,
    monthlyBudgetYen: profile.monthlyBudgetYen,
    elapsedMonths,
    currentTaskLabel: tasks[Math.max(0, elapsedMonths - 1)]?.label ?? tasks[0].label,
    monthlyTasks: tasks,
    googleRank: currentRank,
    yahooRank: currentRank === null ? null : Math.max(1, currentRank + 2),
    rankHistory: rankHistory(startRank, currentRank ?? startRank, Math.max(elapsedMonths, 1)),
    createdAt,
  }
}

export const SEED_KEYWORDS: Keyword[] = [
  // enki 自社サイト(enkiseojp.com)の実ターゲット KW。難易度は KD 推定の目安。
  // elapsedMonths=1 / currentRank=null = 「運用開始したばかり・順位は計測中」の正直な状態。
  buildKeyword('kw-enki-1', 'メタディスクリプション 書き方', 25, 1, 48, null, '2026-06-01T09:00:00Z'), // 🟢
  buildKeyword('kw-enki-2', '内部リンク 貼り方',             28, 1, 45, null, '2026-06-01T09:00:00Z'), // 🟢
  buildKeyword('kw-enki-3', '中小企業 SEO 自分で',           45, 1, 60, null, '2026-06-02T09:00:00Z'), // 🟡
  buildKeyword('kw-enki-4', 'AI SEO 記事 自動作成',          52, 1, 70, null, '2026-06-02T09:00:00Z'), // 🟡
  buildKeyword('kw-enki-5', '格安 SEO 対策 おすすめ',         72, 1, 88, null, '2026-06-03T09:00:00Z'), // 🔴
]
