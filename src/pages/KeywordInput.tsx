// 画面 1 — キーワード入力 + プラン提案(簡単 / ふつう / むずかしい)

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2, Search, Sparkles, X } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store/StoreProvider'
import { estimateKD, profileFromKD, serviceFeatures, TIER_PROFILES, isValidKeyword } from '../lib/difficulty'
import { checkSerpWeakness, type SerpCheckResult } from '../lib/serpCheck'
import type { DifficultyTier } from '../store/types'

const TIER_ORDER: DifficultyTier[] = ['easy', 'medium', 'hard']

export default function KeywordInput() {
  const navigate = useNavigate()
  const { addKeyword, keywords } = useStore()
  const [text, setText] = useState('')

  const trimmed = text.trim()
  // 有効なキーワード(2 文字以上 + 意味のある文字)でない限り、プラン提案も
  // 開通もしない。空白・単文字・記号のみ・乱码では押せない。
  const valid = isValidKeyword(trimmed)
  const heuristicKd = useMemo(() => (valid ? estimateKD(trimmed) : null), [trimmed, valid])

  // SERP 実測(任意・ボタンで実行)— 結果があればヒューリスティック KD を補正する。
  const [serp, setSerp] = useState<SerpCheckResult | null>(null)
  const [serpLoading, setSerpLoading] = useState(false)
  const [serpError, setSerpError] = useState<string | null>(null)
  useEffect(() => {
    // キーワードが変わったら実測結果は無効
    setSerp(null)
    setSerpError(null)
  }, [trimmed])

  async function handleSerpCheck() {
    if (!valid || serpLoading) return
    setSerpLoading(true)
    setSerpError(null)
    try {
      setSerp(await checkSerpWeakness(trimmed))
    } catch (e) {
      setSerpError(e instanceof Error ? e.message : String(e))
    } finally {
      setSerpLoading(false)
    }
  }

  const kd =
    heuristicKd !== null && serp?.configured
      ? Math.max(0, Math.min(100, heuristicKd + serp.kdAdjust))
      : heuristicKd
  const myTier: DifficultyTier | null = kd !== null ? profileFromKD(kd).tier : null
  const myProfile = myTier ? TIER_PROFILES[myTier] : null
  const features = myTier ? serviceFeatures(myTier) : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || kd === null) return
    // 重複防止: 同じキーワード(空白正規化・大小無視)が既にあれば新規作成せず既存へ。
    const norm = trimmed.replace(/\s+/g, ' ').toLowerCase()
    const existing = keywords.find(
      (k) => k.keyword.replace(/\s+/g, ' ').toLowerCase() === norm,
    )
    if (existing) {
      navigate(`/kw/${existing.id}`)
      return
    }
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
        サンプルキーワードを入力すると、簡易ヒューリスティックによる難易度と作業例を表示します。
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div>
          <label htmlFor="kw-input" className="text-sm font-semibold text-slate-700">
            キーワード
          </label>
          <div className="relative mt-2">
            <input
              id="kw-input"
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="例:渋谷 カフェ 電源 おすすめ"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 pr-12 text-lg placeholder:text-slate-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-100"
            />
            {text ? (
              <button
                type="button"
                onClick={() => setText('')}
                aria-label="入力をクリア"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          {trimmed && !valid ? (
            <p className="mt-2 text-xs text-rose-500">
              2 文字以上の有効なキーワードを入力してください。
            </p>
          ) : null}
        </div>

        {myTier && myProfile ? (
          <>
            <div>
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-700">
                  サンプル難易度
                </div>
                <div className="text-[11px] text-slate-400">
                  ※ キーワード文字列だけから推定するヒューリスティック値です。検索需要や実際の競合強度を測定した値ではありません。
                </div>
              </div>

              {/* SERP 実測 — 実際の検索上位 10 件から「勝てる見込み」を判定 */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-700">実際の競合をチェック</div>
                  <button
                    type="button"
                    onClick={handleSerpCheck}
                    disabled={serpLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                  >
                    {serpLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                    {serpLoading ? '検索上位を取得中…' : 'Google 上位 10 件を実測'}
                  </button>
                </div>
                {serpError ? (
                  <p className="mt-2 text-xs text-rose-500">{serpError}</p>
                ) : serp && !serp.configured ? (
                  <p className="mt-2 text-xs text-slate-400">
                    SERP実測はこのデモでは未接続です。現在の難易度はヒューリスティック推定のみです。
                  </p>
                ) : serp?.configured ? (
                  <div
                    className={
                      'mt-3 rounded-lg border p-3 text-sm ' +
                      (serp.verdict === 'winnable'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : serp.verdict === 'fair'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-rose-200 bg-rose-50 text-rose-800')
                    }
                  >
                    {serp.verdict === 'winnable' ? (
                      <>
                        <span className="font-bold">比較的取り組みやすい可能性があります。</span>
                        上位 10 件のうち {serp.weakCount} 件が個人ブログ・Q&A サイト
                        ({serp.weakDomains.slice(0, 3).join(' / ')})。順位を保証する判定ではありません。
                      </>
                    ) : serp.verdict === 'fair' ? (
                      <>
                        <span className="font-bold">追加調査が必要なキーワードです。</span>
                        上位10件のうち {serp.weakCount} 件が個人サイト系です。実際の採否はサイト状況と検索意図を確認して判断します。
                      </>
                    ) : (
                      <>
                        <span className="font-bold">上位 10 件がすべて企業サイトです。</span>
                        競争が強い可能性があります。関連する具体的なキーワードも含めて人が確認する必要があります。
                      </>
                    )}
                  </div>
                ) : null}
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
                          推定カテゴリ
                        </span>
                      ) : null}
                      <div className="text-2xl">{p.emoji}</div>
                      <div className={`mt-1 text-lg font-bold ${isMine ? p.textClass : 'text-slate-700'}`}>
                        {p.label}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">作業例を確認するためのデモ分類</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">サンプル作業リスト</h3>
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

            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-slate-700">
              この画面は見積もり・申込み画面ではありません。有料の「30日SEO改善スタート診断」は単発サービスで、対象URLを確認した後にメールで範囲と納期をご案内します。
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
            キーワードを入力すると、サンプルの難易度と作業例が表示されます
          </div>
        )}

        <button
          type="submit"
          disabled={!valid}
          className="w-full inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-4 text-lg font-bold text-white shadow-xs hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="size-5 mr-2" />
          デモに追加する
          <ArrowRight className="size-5 ml-2" />
        </button>
      </form>
    </div>
  )
}
