// 無料 SEO 診断ページ
// DIAGNOSIS_SPEC.md §10.1 ベース。
// Phase 1: IDLE 状態の URL 入力フォームのみ。
// Phase 2: LOADING(8 ステップアニメーション)を追加。
// Phase 3: RESULT(スコアカード + 詳細 + CTA)を追加。

import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Globe2, Lock, Sparkles, Stethoscope } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useT } from '../lib/i18n'

type UIState =
  | { kind: 'idle' }
  | { kind: 'submitted'; url: string }

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

  const valid = useMemo(() => isLikelyValidUrl(url), [url])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!url.trim()) {
      setError(t('diagnosis.input.required'))
      return
    }
    if (!valid) {
      setError(t('diagnosis.input.invalid'))
      return
    }
    setState({ kind: 'submitted', url: url.trim() })
  }

  function reset() {
    setState({ kind: 'idle' })
    setError(null)
  }

  return (
    <div>
      <PageHeader
        title={t('page.diagnosis.title')}
        subtitle={t('page.diagnosis.subtitle')}
        spec="DIAGNOSIS_SPEC §10.1 / Phase 1"
      />

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

          {state.kind === 'idle' ? (
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
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                  <CheckCircle2 className="size-4" />
                  URL を受け付けました
                </div>
                <code className="mt-2 block break-all text-xs font-mono text-brand-900 bg-white/60 rounded px-2 py-1.5">
                  {state.url}
                </code>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold mb-1">Phase 1 (スケルトン)</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {t('diagnosis.phase1.notice')}
                </p>
              </div>

              <button onClick={reset} className="btn-ghost w-full">
                別の URL を診断
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-bold text-slate-900 mb-3">診断で見える 6 項目</h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="badge-blue shrink-0">A</span>
                <span className="text-slate-700">テクニカル SEO (HTTPS / CWV / robots / sitemap)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="badge-blue shrink-0">B</span>
                <span className="text-slate-700">オンページ SEO (title / meta / H1 / 文字数)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="badge-blue shrink-0">C</span>
                <span className="text-slate-700">Google Japan (GBP / インデックス / AI Overview)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="badge-blue shrink-0">D</span>
                <span className="text-slate-700">Yahoo Japan (ロコ / 知恵袋 / ディレクトリ)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="badge-blue shrink-0">E</span>
                <span className="text-slate-700">被リンク (ドメインエイジ / 日本ディレクトリ)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="badge-blue shrink-0">F</span>
                <span className="text-slate-700">AI サマリー (Claude による日本語要約)</span>
              </li>
            </ul>
          </div>

          <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Phase 1 実装状況</h3>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                DB マイグレーション (sessions / items 2 表)
              </li>
              <li className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                Edge Function 骨架 (site-diagnosis/index.ts)
              </li>
              <li className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                HTML 取得・パース基盤 (fetchHtml + linkedom)
              </li>
              <li className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                URL 入力フォーム (this page)
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Phase 2 で Module A-B + scoring + ローディングアニメーションを実装。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
