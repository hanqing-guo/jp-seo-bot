// 画面 3 — キーワード詳細

import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CircleDot, Clock, Trash2 } from 'lucide-react'
import { useKeyword, useStore } from '../store/StoreProvider'
import { TIER_PROFILES, budgetBreakdown } from '../lib/difficulty'
import type { Keyword, MonthlyTask } from '../store/types'

export default function KeywordDetail() {
  const { id } = useParams<{ id: string }>()
  const kw = useKeyword(id)
  const { deleteKeyword, updateTaskStatus } = useStore()

  if (!kw) return <Navigate to="/" replace />

  const profile = TIER_PROFILES[kw.tier]
  const progress = Math.min(100, Math.round((kw.elapsedMonths / kw.targetMonths) * 100))
  const breakdown = budgetBreakdown(kw.tier)

  function handleDelete() {
    if (confirm('このキーワードを削除しますか?')) {
      deleteKeyword(kw!.id)
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" />
          キーワード一覧に戻る
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
        >
          <Trash2 className="size-3.5" />
          削除
        </button>
      </div>

      <header>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl">{profile.emoji}</span>
          <h1 className="text-3xl font-bold text-slate-900 break-words">{kw.keyword}</h1>
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <span className={`font-semibold ${profile.textClass}`}>{profile.label}</span>
          <span className="text-slate-400">KD {kw.difficulty}/100</span>
          <span className="text-slate-400">
            目標 {profile.targetMonths} ヶ月で 1 ページ目
          </span>
        </div>
      </header>

      <ProgressCard kw={kw} progress={progress} profile={profile} />
      <TasksCard kw={kw} onUpdateStatus={updateTaskStatus} />
      <BudgetCard breakdown={breakdown} monthlyTotal={kw.monthlyBudgetYen} totalMonths={kw.targetMonths} />
    </div>
  )
}

function ProgressCard({ kw, profile, progress }: {
  kw: Keyword
  profile: (typeof TIER_PROFILES)['easy']
  progress: number
}) {
  const startRank = kw.rankHistory[0]?.google ?? null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">順位の進捗</h2>

      <div className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between text-xs mb-1">
            <span className="text-slate-500">
              開始 {startRank !== null ? `${startRank} 位` : '—'} → 目標 1 位
            </span>
            <span className="tabular-nums font-bold" style={{ color: profile.color }}>
              {kw.elapsedMonths} / {kw.targetMonths} ヶ月({progress}%)
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full transition-all flex items-center justify-end pr-1"
              style={{ width: `${progress}%`, backgroundColor: profile.color }}
            >
              {progress > 12 ? <CircleDot className="size-3 text-white" /> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <RankPanel label="Google Japan" rank={kw.googleRank} color="#4285f4" history={kw.rankHistory.map(s => s.google)} />
          <RankPanel label="Yahoo Japan"  rank={kw.yahooRank}  color="#ff0033" history={kw.rankHistory.map(s => s.yahoo)} />
        </div>
      </div>
    </section>
  )
}

function RankPanel({ label, rank, color, history }: {
  label: string
  rank: number | null
  color: string
  history: (number | null)[]
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums" style={{ color: rank !== null && rank <= 10 ? color : '#0f172a' }}>
        {rank === null ? '計測中' : `${rank} 位`}
      </div>
      {history.length >= 2 ? (
        <Spark history={history} color={color} />
      ) : (
        <div className="mt-2 text-[10px] text-slate-400">履歴を蓄積中…</div>
      )}
    </div>
  )
}

function Spark({ history, color }: { history: (number | null)[]; color: string }) {
  const points = history.map((v, i) => ({ x: i, y: v }))
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y).filter((v): v is number => v !== null)
  if (ys.length < 2) return null

  const w = 200, h = 40
  const maxX = Math.max(...xs)
  const minRank = Math.min(...ys)
  const maxRank = Math.max(...ys)
  const range = Math.max(1, maxRank - minRank)

  const path = points
    .filter(p => p.y !== null)
    .map((p, idx) => {
      const x = (p.x / Math.max(1, maxX)) * w
      const y = h - (((p.y as number) - minRank) / range) * (h - 4) - 2
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="mt-2 block">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

function TasksCard({ kw, onUpdateStatus }: {
  kw: Keyword
  onUpdateStatus: (kwId: string, monthNumber: number, status: MonthlyTask['status']) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">毎月のタスク</h2>
      <ol className="space-y-3">
        {kw.monthlyTasks.map(task => (
          <TaskRow key={task.monthNumber} task={task} onToggle={(next) => onUpdateStatus(kw.id, task.monthNumber, next)} />
        ))}
      </ol>
    </section>
  )
}

function TaskRow({ task, onToggle }: { task: MonthlyTask; onToggle: (next: MonthlyTask['status']) => void }) {
  const status = task.status
  const next: MonthlyTask['status'] = status === 'planned' ? 'in_progress' : status === 'in_progress' ? 'done' : 'planned'

  const iconCls =
    status === 'done' ? 'bg-emerald-100 text-emerald-700' :
    status === 'in_progress' ? 'bg-brand-100 text-brand-700' :
    'bg-slate-100 text-slate-400'

  return (
    <li className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onToggle(next)}
        className={`flex size-8 items-center justify-center rounded-full shrink-0 hover:opacity-80 transition ${iconCls}`}
        aria-label={`タスク ${task.monthNumber} ヶ月目 を ${next} に切替`}
      >
        {status === 'done' ? <Check className="size-4" /> :
         status === 'in_progress' ? <Clock className="size-4" /> :
         <span className="text-[11px] tabular-nums">{task.monthNumber}</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 tabular-nums">{task.monthNumber} ヶ月目</span>
          {status === 'in_progress' ? <span className="text-[11px] text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded-full">実行中</span> : null}
          {status === 'done' ? <span className="text-[11px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">完了</span> : null}
        </div>
        <p className={`text-sm leading-relaxed ${status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {task.label}
        </p>
      </div>
      <span className="text-xs tabular-nums text-slate-400 shrink-0">
        ¥{task.budgetYen.toLocaleString()}
      </span>
    </li>
  )
}

function BudgetCard({ breakdown, monthlyTotal, totalMonths }: {
  breakdown: { label: string; yen: number }[]
  monthlyTotal: number
  totalMonths: number
}) {
  const totalCost = monthlyTotal * totalMonths
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">費用の内訳</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500">月額予算</div>
          <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
            ¥{monthlyTotal.toLocaleString()}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {breakdown.map(b => (
              <li key={b.label} className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-600">{b.label}</span>
                <span className="tabular-nums text-slate-900 font-semibold">¥{b.yen.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="text-xs text-slate-500">1 ページ目到達までの総額</div>
          <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
            ¥{totalCost.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ¥{monthlyTotal.toLocaleString()}/月 × {totalMonths} ヶ月
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs text-slate-500 leading-relaxed">
            すべて月 1 回払い(Stripe / 銀行振込)。<br />
            途中解約は翌月から。
          </div>
        </div>
      </div>
    </section>
  )
}
