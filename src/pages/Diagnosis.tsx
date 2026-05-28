// 無料 SEO 診断ページ
// DIAGNOSIS_SPEC.md §10.1 / §10.2 ベース。
// Phase 2 完了:IDLE → LOADING (8 ステップ) → RESULT の全状態。
// fetch /api/diagnose (Edge Function 未デプロイ環境では mock fallback)。
// Phase 3-4: AI サマリー / CTA / シェア機能 / DB 履歴。

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Globe2,
  Info, Lock, RefreshCcw, Sparkles, Stethoscope, XCircle,
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
        spec="DIAGNOSIS_SPEC §10 / Phase 2"
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
            <h3 className="text-sm font-bold text-slate-900 mb-2">Phase 2 実装状況</h3>
            <ul className="space-y-1.5 text-xs">
              {[
                'Module A (テクニカル): HTTPS / robots / sitemap / CWV / 構造化データ',
                'Module B (オンページ): title / meta / H1 / alt / 文字数 / 薬機法',
                'スコアリング (6 カテゴリ加重 + Google/Yahoo 専用)',
                'LOADING 8 ステップアニメーション + RESULT 表示',
              ].map((l, i) => (
                <li key={i} className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Phase 3 で Module C/D/E + Claude AI サマリーを実装。
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

        <div className="flex flex-wrap gap-2 justify-between">
          <button onClick={reset} className="btn-ghost">
            <RefreshCcw className="size-4 mr-1" />
            別の URL を診断
          </button>
          <button className="btn-primary">
            <ArrowRight className="size-4 mr-1" />
            検出された問題を自動で修正する (Phase 4 で実装)
          </button>
        </div>
      </div>
    )
  }
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
