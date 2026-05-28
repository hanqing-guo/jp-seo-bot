// 無料 SEO 診断ページ
// DIAGNOSIS_SPEC.md §10.1 / §10.2 ベース。
// Phase 2 完了:IDLE → LOADING (8 ステップ) → RESULT の全状態。
// fetch /api/diagnose (Edge Function 未デプロイ環境では mock fallback)。
// Phase 3-4: AI サマリー / CTA / シェア機能 / DB 履歴。

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Copy, Globe2,
  Info, Link as LinkIcon, Lock, RefreshCcw, Share2, Sparkles, Stethoscope, XCircle,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useT } from '../lib/i18n'
import {
  generateMockDiagnosis,
  getScoreGrade,
  type DiagnosisItem,
  type DiagnosisResponse,
} from '../lib/diagnosisMock'

// spec §10.1
const LOADING_STEPS: { label: string; duration: number }[] = [
  { label: 'サイトにアクセス中…',                duration: 2000 },
  { label: 'テクニカル SEO を分析中…',             duration: 3000 },
  { label: 'Google Japan での評価を確認中…',        duration: 4000 },
  { label: 'Yahoo Japan での評価を確認中…',         duration: 3000 },
  { label: 'コンテンツ品質を分析中…',              duration: 2000 },
  { label: '被リンク・外部評価を確認中…',          duration: 3000 },
  { label: 'Core Web Vitals を測定中…',            duration: 4000 },
  { label: 'AI が診断レポートを生成中…',            duration: 3000 },
]

type UIState =
  | { kind: 'idle' }
  | { kind: 'loading'; url: string; stepIndex: number; result: DiagnosisResponse | null }
  | { kind: 'result'; url: string; data: DiagnosisResponse; usedMock: boolean }

function isLikelyValidUrl(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withProto)
    return /\./.test(u.hostname) && u.hostname.length >= 4
  } catch {
    return false
  }
}

export default function Diagnosis() {
  const { t } = useT()
  const [url, setUrl] = useState('')
  const [state, setState] = useState<UIState>({ kind: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const valid = useMemo(() => isLikelyValidUrl(url), [url])

  useEffect(() => () => { cancelRef.current?.() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = url.trim()
    if (!trimmed) {
      setError(t('diagnosis.input.required'))
      return
    }
    if (!valid) {
      setError(t('diagnosis.input.invalid'))
      return
    }
    startDiagnosis(trimmed)
  }

  function startDiagnosis(targetUrl: string) {
    // 真の Edge Function を fetch しつつ、UI は spec §10.1 のアニメーションを再生
    let cancelled = false
    cancelRef.current = () => { cancelled = true }

    // バックグラウンドで fetch (失敗時 null)
    const fetchPromise: Promise<DiagnosisResponse | null> = fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
    })
      .then(async r => (r.ok ? (await r.json()) as DiagnosisResponse : null))
      .catch(() => null)

    setState({ kind: 'loading', url: targetUrl, stepIndex: 0, result: null })

    // ステップを順次進める
    let idx = 0
    let live: DiagnosisResponse | null = null
    const runStep = () => {
      if (cancelled) return
      if (idx >= LOADING_STEPS.length) {
        // アニメ完了 → fetch 結果 or mock を採用
        fetchPromise.then(res => {
          if (cancelled) return
          const final = res ?? generateMockDiagnosis(targetUrl)
          setState({ kind: 'result', url: targetUrl, data: final, usedMock: res === null })
        })
        return
      }
      setState(prev =>
        prev.kind === 'loading'
          ? { ...prev, stepIndex: idx, result: live }
          : prev,
      )
      const dur = LOADING_STEPS[idx].duration
      idx += 1
      setTimeout(runStep, dur)
    }
    runStep()

    // fetch が早く完了したら結果を保持(完了表示は LOADING 終了まで待つ)
    fetchPromise.then(r => {
      if (!cancelled && r) live = r
    })
  }

  function reset() {
    cancelRef.current?.()
    setState({ kind: 'idle' })
    setError(null)
  }

  return (
    <div>
      <PageHeader
        title={t('page.diagnosis.title')}
        subtitle={t('page.diagnosis.subtitle')}
        spec="DIAGNOSIS_SPEC §10 / Phase 1-4 完了"
      />

      {state.kind === 'idle'    ? renderIdle()    : null}
      {state.kind === 'loading' ? renderLoading() : null}
      {state.kind === 'result'  ? renderResult()  : null}
    </div>
  )

  // ──────────────────────────────────────────────────────────
  // IDLE
  // ──────────────────────────────────────────────────────────
  function renderIdle() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">サイト URL を入力</h2>
              <p className="text-xs text-slate-500">30 秒以内に診断結果をお届けします</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder={t('diagnosis.input.placeholder')}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-base placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'diagnosis-url-error' : undefined}
                />
              </div>
              {error ? (
                <p id="diagnosis-url-error" className="mt-2 text-xs text-rose-600">
                  {error}
                </p>
              ) : null}
            </div>

            <button type="submit" className="w-full btn-primary py-3 text-base font-bold">
              <Sparkles className="size-5 mr-2" />
              {t('diagnosis.input.cta')}
              <ChevronRight className="size-5 ml-1" />
            </button>

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
              <Lock className="size-4 shrink-0 mt-0.5 text-slate-400" />
              <span>{t('diagnosis.input.privacy')}</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>{t('diagnosis.input.tally')}</span>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-bold text-slate-900 mb-3">診断で見える 6 項目</h3>
            <ul className="space-y-2 text-xs">
              {[
                ['A', 'テクニカル SEO (HTTPS / CWV / robots / sitemap)'],
                ['B', 'オンページ SEO (title / meta / H1 / 文字数)'],
                ['C', 'Google Japan (GBP / インデックス / AI Overview)'],
                ['D', 'Yahoo Japan (ロコ / 知恵袋 / ディレクトリ)'],
                ['E', '被リンク (ドメインエイジ / 日本ディレクトリ)'],
                ['F', 'AI サマリー (Claude による日本語要約)'],
              ].map(([k, l]) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="badge-blue shrink-0">{k}</span>
                  <span className="text-slate-700">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Phase 1-4 実装完了</h3>
            <ul className="space-y-1.5 text-xs">
              {[
                'Module A-B (テクニカル + オンページ): 8 + 8 件のチェック',
                'Module C-E (Google/Yahoo Japan + 被リンク): 16 件のチェック',
                'Module F (AI サマリー): DeepSeek / Claude / template 切替',
                'スコアリング (6 カテゴリ加重 + A-F グレード)',
                'LOADING 8 ステップ + RESULT (心理 CTA + シェア)',
                'レート制限 (IP 別 3 回/時間, in-memory)',
              ].map((l, i) => (
                <li key={i} className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Edge Function をデプロイすると実 URL 診断が有効化されます。未デプロイ時は demo mock で動作確認可能。
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // LOADING
  // ──────────────────────────────────────────────────────────
  function renderLoading() {
    if (state.kind !== 'loading') return null
    const totalDuration = LOADING_STEPS.reduce((s, x) => s + x.duration, 0)
    const doneDuration = LOADING_STEPS.slice(0, state.stepIndex + 1).reduce((s, x) => s + x.duration, 0)
    const progress = Math.round((doneDuration / totalDuration) * 100)
    return (
      <div className="max-w-3xl mx-auto card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Sparkles className="size-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">診断中</h2>
            <p className="text-xs text-slate-500 truncate">{state.url}</p>
          </div>
          <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-900 whitespace-nowrap">
            キャンセル
          </button>
        </div>

        <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 text-right text-[11px] text-slate-400 tabular-nums">{progress}%</div>

        <ul className="mt-6 space-y-3">
          {LOADING_STEPS.map((s, i) => {
            const done = i < state.stepIndex
            const active = i === state.stepIndex
            return (
              <li key={i} className="flex items-center gap-3">
                <div
                  className={
                    'flex size-7 items-center justify-center rounded-full shrink-0 ' +
                    (done
                      ? 'bg-emerald-100 text-emerald-700'
                      : active
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-slate-100 text-slate-400')
                  }
                >
                  {done ? <CheckCircle2 className="size-4" />
                   : active ? <Sparkles className="size-4 animate-pulse" />
                   : <span className="text-[11px] tabular-nums">{i + 1}</span>}
                </div>
                <span className={done ? 'text-sm text-slate-400 line-through' : active ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-500'}>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // RESULT
  // ──────────────────────────────────────────────────────────
  function renderResult() {
    if (state.kind !== 'result') return null
    const { data, usedMock } = state
    const grade = getScoreGrade(data.scores.total)
    const critical = data.items.filter(i => i.level === 'critical')
    const warning  = data.items.filter(i => i.level === 'warning')
    const info     = data.items.filter(i => i.level === 'info')
    const passed   = data.items.filter(i => i.level === 'passed')

    return (
      <div className="space-y-6">
        {usedMock ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            ⚠ Edge Function (<code>/api/diagnose</code>) が未デプロイのため、demo 用 mock 結果を表示しています。Supabase Functions をデプロイすれば実 URL の診断結果に置き換わります。
          </div>
        ) : null}

        {/* 総合スコア */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2 flex flex-col md:flex-row items-center gap-6">
            <div
              className="flex size-32 items-center justify-center rounded-full border-8 shrink-0"
              style={{ borderColor: grade.color, color: grade.color }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums">{data.scores.total}</div>
                <div className="text-[10px] uppercase tracking-wider">/ 100</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: grade.color }}
                >
                  グレード {grade.grade}
                </span>
                <span className="badge-gray">{grade.label}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1 break-all">{new URL(data.url).hostname}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{grade.message}</p>
              <p className="mt-2 text-xs text-slate-500">{data.summary}</p>
            </div>
          </div>

          {/* Google vs Yahoo */}
          <div className="card">
            <h3 className="text-sm font-bold text-slate-900 mb-3">エンジン別スコア</h3>
            <EngineBar label="Google Japan" score={data.scores.google} color="#4285f4" />
            <EngineBar label="Yahoo Japan"  score={data.scores.yahoo}  color="#ff0033" />
            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
              Yahoo Japan は 2011 年以降 Google のアルゴリズムを使用していますが、Yahoo!ロコ・知恵袋など独自要素があります。
            </p>
          </div>
        </div>

        {/* カテゴリ別スコア */}
        <div className="card">
          <h3 className="text-sm font-bold text-slate-900 mb-3">カテゴリ別スコア</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { k: 'technical', label: 'テクニカル' },
              { k: 'onpage',    label: 'オンページ' },
              { k: 'content',   label: 'コンテンツ' },
              { k: 'backlink',  label: '被リンク' },
              { k: 'mobile',    label: 'モバイル' },
            ].map(({ k, label }) => {
              const v = (data.scores as unknown as Record<string, number>)[k]
              return (
                <div key={k} className="rounded-lg border border-slate-100 p-3">
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className="text-xl font-bold tabular-nums" style={{ color: getScoreGrade(v).color }}>{v}</div>
                  <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full" style={{ width: `${v}%`, backgroundColor: getScoreGrade(v).color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 問題一覧 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900">検出された問題</h3>
            <div className="flex gap-3 text-xs">
              <Pill icon={<XCircle className="size-3" />} count={critical.length} label="重大" tone="red" />
              <Pill icon={<AlertTriangle className="size-3" />} count={warning.length} label="警告" tone="amber" />
              <Pill icon={<Info className="size-3" />} count={info.length} label="情報" tone="blue" />
              <Pill icon={<CheckCircle2 className="size-3" />} count={passed.length} label="合格" tone="green" />
            </div>
          </div>

          <ul className="space-y-2">
            {[...critical, ...warning, ...info].map((item, idx) => (
              <IssueRow key={`${item.checkId}-${idx}`} item={item} />
            ))}
            {data.items.length === 0 ? (
              <li className="text-sm text-slate-400 py-4 text-center">問題は検出されませんでした。</li>
            ) : null}
          </ul>
        </div>

        {/* Quick wins (AI 簡易版) */}
        {data.quickWins.length > 0 ? (
          <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">今すぐできる改善策</h3>
            </div>
            <ol className="space-y-2">
              {data.quickWins.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold tabular-nums">{i + 1}</span>
                  <span className="leading-relaxed">{w}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {/* 心理的 trigger CTA (spec §11.1) — grade 別 */}
        <CtaSection score={data.scores.total} criticalCount={data.criticalCount} />

        {/* シェア機能 (spec §11.2) */}
        <ShareCard
          url={data.url}
          totalScore={data.scores.total}
          googleScore={data.scores.google}
          yahooScore={data.scores.yahoo}
        />

        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={reset} className="btn-ghost">
            <RefreshCcw className="size-4 mr-1" />
            別の URL を診断
          </button>
        </div>
      </div>
    )
  }
}

// ──────────────────────────────────────────────────────────
// 心理的 trigger CTA (spec §11.1 完全実装)
// ──────────────────────────────────────────────────────────
function CtaSection({ score, criticalCount }: { score: number; criticalCount: number }) {
  // F ランク (0-30): 危機感 → 緊急行動
  if (score < 31) {
    return (
      <div className="card border-rose-300 bg-gradient-to-br from-rose-50 to-white">
        <p className="text-sm font-bold text-rose-900">
          致命的な問題が {criticalCount} 件あります。このままでは競合に大きく遅れをとります。
        </p>
        <p className="mt-2 text-xs text-rose-700">
          いますぐ JP SEO Bot 有料プランの自動修正で、最低でも 6 ヶ月分の遅れを取り戻せます。
        </p>
        <button className="mt-3 w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-rose-600 px-6 py-3 text-base font-bold text-white hover:bg-rose-700 transition-colors">
          <Sparkles className="size-5 mr-2" />
          今すぐ無料で改善を始める
          <ArrowRight className="size-5 ml-2" />
        </button>
      </div>
    )
  }
  // D ランク (31-50): 競争心
  if (score < 51) {
    return (
      <div className="card border-amber-300 bg-gradient-to-br from-amber-50 to-white">
        <p className="text-sm font-bold text-amber-900">
          競合と比べてどうか — 業界平均 62 点に対して、あなたのサイトは {score} 点。
        </p>
        <p className="mt-2 text-xs text-amber-700">
          現状の SEO 改善余地はかなり大きく、計画的に修正すれば 3-6 ヶ月で平均以上に追いつけます。
        </p>
        <button className="mt-3 w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-base font-bold text-white hover:bg-orange-700 transition-colors">
          <ArrowRight className="size-5 mr-2" />
          競合を追い越すプランを見る
        </button>
      </div>
    )
  }
  // C ランク (51-65): 達成感
  if (score < 66) {
    return (
      <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white">
        <p className="text-sm font-bold text-brand-900">
          あと {80 - score} 点上げれば、検索結果 1 ページ目が現実的に視野に入ります。
        </p>
        <p className="mt-2 text-xs text-brand-700">
          残りの問題を計画的に修正すれば、検索順位の改善が見込めます。
        </p>
        <button className="mt-3 w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-base font-bold text-white hover:bg-brand-700 transition-colors">
          <ArrowRight className="size-5 mr-2" />
          残りの問題を修正して順位を上げる
        </button>
      </div>
    )
  }
  // B ランク (66-79): 自信付与
  if (score < 80) {
    return (
      <div className="card border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <p className="text-sm font-bold text-emerald-900">
          すでに良い基盤があります。さらに最適化すれば上位表示が可能です。
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          現在のスコアは業界上位 30% に相当。あと一歩で上位 5% を狙えます。
        </p>
        <button className="mt-3 w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-bold text-white hover:bg-emerald-700 transition-colors">
          <ArrowRight className="size-5 mr-2" />
          さらに上を目指す(上位 5% へ)
        </button>
      </div>
    )
  }
  // A ランク (80+): AI/GEO
  return (
    <div className="card border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-brand-50">
      <p className="text-sm font-bold text-emerald-900">
        優れた SEO 基盤です。次は AI 検索可視性 (GEO) の強化を。
      </p>
      <p className="mt-2 text-xs text-emerald-700">
        ChatGPT・Perplexity・Google AI Overview など、AI 検索結果での引用率を高めることが次の差別化要素です。
      </p>
      <button className="mt-3 w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-brand-600 px-6 py-3 text-base font-bold text-white hover:from-emerald-700 hover:to-brand-700 transition-colors">
        <Sparkles className="size-5 mr-2" />
        AI 検索 (ChatGPT/Perplexity) でも引用されるサイトへ
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// シェア機能 (spec §11.2)
// ──────────────────────────────────────────────────────────
function ShareCard({ url, totalScore, googleScore, yahooScore }: {
  url: string; totalScore: number; googleScore: number; yahooScore: number
}) {
  const [copied, setCopied] = useState(false)
  const hostname = useMemo(() => {
    try { return new URL(url).hostname } catch { return url }
  }, [url])

  const shareText =
    `${hostname} の SEO スコアは ${totalScore}/100 でした。` +
    `Google Japan: ${googleScore} 点 / Yahoo Japan: ${yahooScore} 点。` +
    `JP SEO Bot で無料診断できます`

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://jp-seo-bot.example.co.jp/diagnosis'

  function shareNative() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator.share({ text: shareText, url: pageUrl }).catch(() => { /* user cancelled */ })
    }
  }

  function shareTwitter() {
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`
    window.open(u, '_blank', 'noopener,noreferrer')
  }

  function shareLine() {
    const u = `https://line.me/R/share?text=${encodeURIComponent(`${shareText}\n${pageUrl}`)}`
    window.open(u, '_blank', 'noopener,noreferrer')
  }

  function shareFacebook() {
    const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`
    window.open(u, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${pageUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard 不可
    }
  }

  const hasNative = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Share2 className="size-4 text-slate-500" />
        <h3 className="text-sm font-bold text-slate-900">結果をシェア</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        診断結果を SNS でシェアすると、同業他社や知り合いにも JP SEO Bot を知ってもらえます。
      </p>
      <div className="flex flex-wrap gap-2">
        {hasNative ? (
          <button onClick={shareNative} className="btn-primary">
            <Share2 className="size-4 mr-1" /> シェア
          </button>
        ) : null}
        <button onClick={shareTwitter} className="btn-ghost">
          <span className="font-bold mr-1">𝕏</span> X (Twitter)
        </button>
        <button onClick={shareLine} className="btn-ghost">
          <span className="font-bold text-emerald-600 mr-1">LINE</span>
        </button>
        <button onClick={shareFacebook} className="btn-ghost">
          <span className="font-bold text-brand-600 mr-1">f</span> Facebook
        </button>
        <button onClick={copyLink} className="btn-ghost">
          {copied ? <><CheckCircle2 className="size-4 mr-1 text-emerald-600" /> コピー済</> : <><Copy className="size-4 mr-1" /> リンクをコピー</>}
        </button>
      </div>
      <pre className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-600 whitespace-pre-wrap">
        {shareText}
        {'\n'}
        {pageUrl}
      </pre>
    </div>
  )
}

function EngineBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function Pill({ icon, count, label, tone }: {
  icon: React.ReactNode
  count: number
  label: string
  tone: 'red' | 'amber' | 'blue' | 'green'
}) {
  const cls =
    tone === 'red'   ? 'bg-rose-100 text-rose-700' :
    tone === 'amber' ? 'bg-amber-100 text-amber-700' :
    tone === 'blue'  ? 'bg-brand-100 text-brand-700' :
                       'bg-emerald-100 text-emerald-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${cls}`}>
      {icon}
      <span className="tabular-nums font-semibold">{count}</span>
      <span>{label}</span>
    </span>
  )
}

function IssueRow({ item }: { item: DiagnosisItem }) {
  const [open, setOpen] = useState(false)
  const tone =
    item.level === 'critical' ? 'bg-rose-100 text-rose-700' :
    item.level === 'warning'  ? 'bg-amber-100 text-amber-700' :
    item.level === 'info'     ? 'bg-brand-100 text-brand-700' :
                                'bg-emerald-100 text-emerald-700'
  const icon =
    item.level === 'critical' ? <XCircle className="size-4" /> :
    item.level === 'warning'  ? <AlertTriangle className="size-4" /> :
    item.level === 'info'     ? <Info className="size-4" /> :
                                <CheckCircle2 className="size-4" />
  return (
    <li className="rounded-lg border border-slate-100 hover:bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-start gap-3 p-3"
      >
        <div className={`mt-0.5 flex size-8 items-center justify-center rounded-lg shrink-0 ${tone}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
            <span className="badge-gray">{item.category}</span>
            {item.scoreImpact < 0 ? (
              <span className="badge-red tabular-nums">{item.scoreImpact} 点</span>
            ) : null}
          </div>
          {!open ? <p className="mt-1 text-xs text-slate-500 line-clamp-1">{item.description}</p> : null}
        </div>
        <ChevronRight className={`size-4 text-slate-300 mt-2 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open ? (
        <div className="px-3 pb-3 pl-14 text-xs text-slate-600 space-y-2">
          <p>{item.description}</p>
          {item.currentValue ? (
            <div className="flex flex-wrap gap-3">
              <span className="rounded bg-slate-100 px-2 py-0.5">現在: <strong className="text-slate-900">{item.currentValue}</strong></span>
              {item.idealValue ? (
                <span className="rounded bg-emerald-50 text-emerald-800 px-2 py-0.5">理想: <strong>{item.idealValue}</strong></span>
              ) : null}
            </div>
          ) : null}
          {item.fixSuggestion ? (
            <div className="rounded-lg bg-brand-50 border border-brand-100 p-2 text-brand-900 whitespace-pre-wrap">
              💡 {item.fixSuggestion}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
