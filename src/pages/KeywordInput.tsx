// 画面 1 — キーワード入力 + プラン提案(簡単 / ふつう / むずかしい)

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store/StoreProvider'
import { estimateKD, profileFromKD, budgetBreakdown, serviceFeatures, TIER_PROFILES } from '../lib/difficulty'
import type { DifficultyTier } from '../store/types'

const TIER_ORDER: DifficultyTier[] = ['easy', 'medium', 'hard']

export default function KeywordInput() {
  const navigate = useNavigate()
  const { addKeyword } = useStore()
  const [text, setText] = useState('')

  const trimmed = text.trim()
  const kd = useMemo(() => (trimmed ? estimateKD(trimmed) : null), [trimmed])
  const myTier: DifficultyTier | null = kd !== null ? profileFromKD(kd).tier : null
  const myProfile = myTier ? TIER_PROFILES[myTier] : null
  const breakdown = myTier ? budgetBreakdown(myTier) : []
  const features = myTier ? serviceFeatures(myTier) : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed || kd === null) return
    const kw = addKeyword({ keyword: trimmed, difficulty: kd })
    navigate(`/kw/${kw.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl py-12">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="size-4" />
        キーワード一覧に戻る
      </Link>

      <h1 className="text-3xl font-bold text-slate-900">キーワードを追加</h1>
      <p className="mt-2 text-sm text-slate-500">
        上げたいキーワードを入力するだけ。最適なプランを自動でご提案します。
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
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

        {myTier && myProfile ? (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-3">
                あなたのキーワードに最適なプラン
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TIER_ORDER.map(tier => {
                  const p = TIER_PROFILES[tier]
                  const isMine = tier === myTier
                  return (
                    <div
                      key={tier}
                      className={
                        'relative rounded-2xl border-2 p-4 transition ' +
                        (isMine
                          ? `${p.borderClass} ${p.bgClass} shadow-md`
                          : 'border-slate-200 bg-white opacity-60')
                      }
                    >
                      {isMine ? (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          あなたのキーワード
                        </span>
                      ) : null}
                      <div className="text-2xl">{p.emoji}</div>
                      <div className={`mt-1 text-lg font-bold ${isMine ? p.textClass : 'text-slate-700'}`}>
                        {p.label}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        <span className="text-2xl font-bold text-slate-900">{p.targetMonths}</span> ヶ月で1ページ目
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                        ¥{p.monthlyBudgetYen.toLocaleString()}
                        <span className="text-xs font-normal text-slate-500"> / 月</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">このプランでやること</h3>
              <ul className="mt-3 space-y-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="size-3.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">料金の内訳</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  ¥{myProfile.monthlyBudgetYen.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500">/ 月(税別)</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {breakdown.map(b => (
                  <li key={b.label} className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-600">{b.label}</span>
                    <span className="tabular-nums text-slate-900 font-semibold">¥{b.yen.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                {myProfile.targetMonths} ヶ月続けた場合の総額: ¥{(myProfile.monthlyBudgetYen * myProfile.targetMonths).toLocaleString()}(月 1 回払い・いつでも解約可)
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
            キーワードを入力すると、最適なプランと料金が表示されます
          </div>
        )}

        <button
          type="submit"
          disabled={!trimmed}
          className="w-full inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-4 text-lg font-bold text-white shadow-sm hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="size-5 mr-2" />
          このプランで始める
          <ArrowRight className="size-5 ml-2" />
        </button>
      </form>
    </div>
  )
}
