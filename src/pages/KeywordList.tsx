// 画面 2 — キーワード一覧(メイン)

import { Link } from 'react-router-dom'
import { Plus, Search, Sparkles } from 'lucide-react'
import { useStore } from '../store/StoreProvider'
import { TIER_PROFILES, withTax, formatYen } from '../lib/difficulty'
import type { Keyword } from '../store/types'

export default function KeywordList() {
  const { keywords } = useStore()

  // 月額合計(税込)= 各 KW を難易度別の単価(easy/medium/hard)で合算。
  // 「キーワードの数 × 難易度別の料金」= 自助選択モデルの可視化。β運用中は請求しない(目安)。
  const monthlyTotal = keywords.reduce((sum, k) => sum + withTax(k.monthlyBudgetYen), 0)

  if (keywords.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-xs">
          <Sparkles className="size-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">まだキーワードがありません</h2>
        <p className="mt-2 text-sm text-slate-500">
          まずは 1 つ、上げたいキーワードを追加してみましょう。
        </p>
        <Link
          to="/new"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-xs hover:bg-brand-700"
        >
          <Plus className="size-5 mr-2" />
          最初のキーワードを追加
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">追跡中のキーワード</h1>
          <p className="text-sm text-slate-500 mt-1">
            合計 {keywords.length} 件 ・ 月額 <span className="font-bold text-slate-700 tabular-nums">{formatYen(monthlyTotal)}</span>(税込)
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            ベータ運用中 — 料金は目安です(請求は行いません)。Google 順位は Search Console 連携で取得。
          </p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-brand-700"
        >
          <Plus className="size-4 mr-1" />
          新規キーワード
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keywords.map(k => (
          <KeywordCard key={k.id} k={k} />
        ))}
      </div>
    </div>
  )
}

function KeywordCard({ k }: { k: Keyword }) {
  const profile = TIER_PROFILES[k.tier]
  const progress = Math.min(100, Math.round((k.elapsedMonths / k.targetMonths) * 100))

  return (
    <Link
      to={`/kw/${k.id}`}
      className={`block rounded-2xl border-2 ${profile.borderClass} bg-white p-5 hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{profile.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-900 wrap-break-word">{k.keyword}</h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs flex-wrap">
            <span className={`font-semibold ${profile.textClass}`}>{profile.label}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs mb-1">
          <span className="text-slate-500">
            {k.elapsedMonths} / {k.targetMonths} ヶ月で 1 ページ目
          </span>
          <span className={`tabular-nums font-bold ${profile.textClass}`}>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: profile.color }}
          />
        </div>
      </div>

      <div className={`mt-4 rounded-lg ${profile.bgClass} px-3 py-2 text-xs`}>
        <div className="font-semibold text-slate-700 mb-0.5">今月の作業</div>
        <div className={profile.textClass}>{k.currentTaskLabel}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <RankBox label="Google Japan" rank={k.googleRank} />
        <RankBox label="Yahoo Japan" rank={k.yahooRank} />
      </div>
    </Link>
  )
}

function RankBox({ label, rank }: { label: string; rank: number | null }) {
  // P2 fix: 順位の色は媒体(Google/Yahoo)で変えず意味で統一(1 ページ目=緑 / それ以外=スレート)。
  const rankColor = rank !== null && rank <= 10 ? '#16a34a' : '#0f172a'
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        <Search className="size-2.5" />
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: rankColor }}>
        {rank === null ? '計測中' : `${rank} 位`}
      </div>
    </div>
  )
}
