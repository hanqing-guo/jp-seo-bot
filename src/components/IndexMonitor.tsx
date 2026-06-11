// 収録(インデックス)モニター — sitemap の全ページが Google に収録済みかを GSC で照会。
// 新規サイトは「収録されているか」が順位以前のボトルネック。ボタンで都度実行
// (GSC URL Inspection API のクォータ節約のため自動実行はしない)。

import { useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { fetchIndexStatus, type IndexStatusResult } from '../lib/indexStatus'

export default function IndexMonitor() {
  const [result, setResult] = useState<IndexStatusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      setResult(await fetchIndexStatus())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Google 収録モニター</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            サイト全ページの収録(インデックス)状況を Search Console で照会します。
            収録されていないページは順位が付きません。
          </p>
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {loading ? '照会中…(数十秒かかります)' : '収録状況をチェック'}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-500">{error}</p> : null}

      {result && !result.configured ? (
        <p className="mt-3 text-xs text-slate-400">
          未接続です(管理者: GSC_SA_KEY_B64 / GSC_SITE_URL を設定すると有効になります)
        </p>
      ) : null}

      {result?.configured ? (
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-800">
            収録済み{' '}
            <span
              className={
                'tabular-nums text-lg font-bold ' +
                (result.indexedCount === result.total ? 'text-emerald-600' : 'text-amber-600')
              }
            >
              {result.indexedCount} / {result.total}
            </span>{' '}
            ページ
          </div>
          <ul className="mt-3 space-y-1 max-h-64 overflow-y-auto pr-1">
            {/* 未収録を先に表示(対応すべきものから) */}
            {[...result.pages]
              .sort((a, b) => Number(a.indexed) - Number(b.indexed))
              .map((p) => (
                <li key={p.url} className="flex items-center gap-2 text-xs">
                  {p.indexed ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 shrink-0 text-rose-400" />
                  )}
                  <span className="truncate text-slate-600" title={p.url}>
                    {p.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </span>
                  {!p.indexed ? <span className="shrink-0 text-slate-400">({p.state})</span> : null}
                </li>
              ))}
          </ul>
          {result.indexedCount < result.total ? (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              未収録のページは Search Console の URL 検査から「インデックス登録をリクエスト」すると
              収録が早まります(1 日あたりの上限あり・数日かかることがあります)。
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
