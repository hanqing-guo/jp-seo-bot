// 画面 1 — キーワード入力 + 難易度自動判定

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store/StoreProvider'
import { estimateKD, profileFromKD, budgetBreakdown } from '../lib/difficulty'

export default function KeywordInput() {
  const navigate = useNavigate()
  const { addKeyword } = useStore()
  const [text, setText] = useState('')

  const trimmed = text.trim()
  const kd = useMemo(() => (trimmed ? estimateKD(trimmed) : null), [trimmed])
  const profile = kd !== null ? profileFromKD(kd) : null
  const breakdown = profile ? budgetBreakdown(profile.tier) : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed || kd === null) return
    const kw = addKeyword({ keyword: trimmed, difficulty: kd })
    navigate(`/kw/${kw.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="size-4" />
        キーワード一覧に戻る
      </Link>

      <h1 className="text-3xl font-bold text-slate-900">キーワードを追加</h1>
      <p className="mt-2 text-sm text-slate-500">
        順位を上げたいキーワードを入力するだけ。難易度・期間・費用は自動で判定します。
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="kw-input" className="text-sm font-semibold text-slate-700">
            キーワード
          </label>
          <input
            id="kw-input"
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="例:渋谷 カフェ 電源 おすすめ"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-lg placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {profile ? (
          <div className={`rounded-2xl border-2 ${profile.borderClass} ${profile.bgClass} p-5`}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl">{profile.emoji}</span>
              <div>
                <div className={`text-2xl font-bold ${profile.textClass}`}>
                  {profile.label}
                </div>
                <div className="text-xs text-slate-500">難易度 (KD): {kd}/100</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-slate-500">予測</div>
                <div className="text-xl font-bold text-slate-900">
                  {profile.targetMonths} ヶ月で 1 ページ目
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white/70 border border-slate-200/50 p-3">
                <div className="text-xs text-slate-500">月額予算</div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  ¥{profile.monthlyBudgetYen.toLocaleString()}
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                  {breakdown.map(b => (
                    <li key={b.label} className="flex justify-between">
                      <span>{b.label}</span>
                      <span className="tabular-nums">¥{b.yen.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-white/70 border border-slate-200/50 p-3">
                <div className="text-xs text-slate-500">毎月の作業</div>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                  {profile.monthlyTaskTemplate}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  すべて自動で実行 / 順位は毎日チェック
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
            キーワードを入力すると難易度を自動判定します
          </div>
        )}

        <button
          type="submit"
          disabled={!trimmed}
          className="w-full inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-4 text-lg font-bold text-white shadow-sm hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="size-5 mr-2" />
          このキーワードで始める
          <ArrowRight className="size-5 ml-2" />
        </button>
      </form>
    </div>
  )
}
