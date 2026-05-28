// 初期表示用のデモ KW (3 件 — easy / medium / hard 各 1)

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
  buildKeyword('kw-seed-1', '渋谷 カフェ 電源 おすすめ', 22, 2, 24, 8, '2026-03-15T09:00:00Z'),
  buildKeyword('kw-seed-2', 'BtoB リード獲得 方法',     48, 3, 52, 18, '2026-02-20T09:00:00Z'),
  buildKeyword('kw-seed-3', 'SEO 対策 ツール',           78, 4, 62, 24, '2026-01-10T09:00:00Z'),
]
