import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, Loader2, Search, ShieldCheck } from 'lucide-react'

interface AuditReport {
  mode: 'live-public-page' | 'sample'
  requestedUrl: string
  finalUrl: string
  fetchedAt: string
  inspectedPages: number
  page: {
    httpStatus: number
    title: string | null
    description: string | null
    h1: string | null
    lang: string | null
    canonical: string | null
    robots: string | null
    contentCharacters: number
    headings: { h1: number; h2: number; h3: number }
    structuredDataTypes: string[]
    hasViewport: boolean
    internalLinks: number
    images: number
    imagesMissingAlt: number
    imagesLazyLoaded: number
    scriptTags: number
    responseBytes: number
  }
  findings: Array<{
    key: string
    label: string
    status: 'ok' | 'review' | 'missing'
    detail: string
  }>
  systems: {
    googleSeo: {
      label: string
      state: 'automated-public-page'
      httpStatus: number
      redirects: number
      findings: AuditReport['findings']
      sitemap: { state: 'found' | 'not-found' | 'not-checked'; url: string; detail: string }
      limitations: string
    }
    yahooJapan: {
      label: string
      state: 'manual-unconfigured'
      measuredRank: null
      detail: string
      limitations: string
    }
    geo: {
      label: string
      state: 'heuristic-guidance'
      findings: AuditReport['findings']
      limitations: string
    }
  }
  recommendations: Array<{ period: string; action: string; reason: string }>
  disclosure: {
    automated: string
    heuristic: string
    manualReview: string
    noChangesMade: string
  }
}

const SAMPLE_REPORT: AuditReport = {
  mode: 'sample',
  requestedUrl: 'https://example.jp/',
  finalUrl: 'https://example.jp/',
  fetchedAt: 'サンプルデータ',
  inspectedPages: 1,
  page: {
    httpStatus: 200,
    title: '地域のお客様を支えるサンプルサービス',
    description: null,
    h1: '地域密着のサンプルサービス',
    lang: 'ja',
    canonical: 'https://example.jp/',
    robots: null,
    contentCharacters: 438,
    headings: { h1: 1, h2: 2, h3: 0 },
    structuredDataTypes: [],
    hasViewport: true,
    internalLinks: 6,
    images: 2,
    imagesMissingAlt: 1,
    imagesLazyLoaded: 1,
    scriptTags: 3,
    responseBytes: 18_400,
  },
  findings: [
    { key: 'title', label: 'ページタイトル', status: 'ok', detail: '19文字です。内容と検索意図の一致は人による確認が必要です。' },
    { key: 'description', label: 'メタ説明', status: 'missing', detail: 'メタ説明が見つかりません。' },
    { key: 'h1', label: '主見出し（H1）', status: 'ok', detail: '14文字です。内容と検索意図の一致は人による確認が必要です。' },
    { key: 'canonical', label: 'canonical', status: 'ok', detail: 'canonical URL が指定されています。' },
    { key: 'robots', label: 'インデックス指示', status: 'ok', detail: 'HTML上に noindex 指示は見つかりませんでした。' },
    { key: 'content', label: '本文量（簡易）', status: 'review', detail: '可視テキストを約438文字として検出しました。内容の有用性は人による確認が必要です。' },
    { key: 'headings', label: '見出し構造', status: 'ok', detail: 'H1 1件、H2 2件、H3 0件を検出しました。' },
    { key: 'structured-data', label: '構造化データ', status: 'review', detail: 'JSON-LDの@typeを検出できませんでした。' },
    { key: 'lang-viewport', label: '言語・viewport', status: 'ok', detail: 'lang: ja、viewport: あり。' },
    { key: 'internal-links', label: '内部リンク', status: 'ok', detail: '同一オリジンへのリンクを6件検出しました。' },
    { key: 'performance-hints', label: '表示性能の安全なヒント', status: 'ok', detail: 'HTML約18KB、script 3件、画像2件（loading=lazy 1件）。速度やCore Web Vitalsは計測していません。' },
  ],
  systems: {
    googleSeo: {
      label: 'Google SEO',
      state: 'automated-public-page',
      httpStatus: 200,
      redirects: 0,
      findings: [],
      sitemap: { state: 'not-checked', url: 'https://example.jp/sitemap.xml', detail: 'サンプルではsitemap.xmlへ通信していません。' },
      limitations: 'サンプルHTMLだけの表示例です。Googleのインデックス登録、検索順位、Core Web Vitalsは測定していません。',
    },
    yahooJapan: {
      label: 'Yahoo! JAPAN',
      state: 'manual-unconfigured',
      measuredRank: null,
      detail: '順位計測は未接続です。サンプル順位を実測として扱いません。',
      limitations: '対象キーワード・地域・日時を定めた別の手動確認または正式な計測接続が必要です。',
    },
    geo: {
      label: 'GEO（生成AI向け情報設計）',
      state: 'heuristic-guidance',
      findings: [
        { key: 'answer-first', label: '結論先行の要約', status: 'review', detail: '冒頭で対象・結論・提供価値を短く明示する余地があります。' },
        { key: 'entity-clarity', label: '組織・著者の明確さ', status: 'review', detail: '運営組織、著者、専門性、問い合わせ先を明確にしてください。' },
        { key: 'dates-sources', label: '日付・根拠・出典', status: 'review', detail: '重要な主張には日付と一次情報への参照を添えてください。' },
        { key: 'geo-structured-data', label: '意味構造・構造化データ', status: 'review', detail: '内容に合う構造化データを事実と一致する場合だけ検討してください。' },
        { key: 'faq-freshness', label: 'FAQ適性・鮮度', status: 'review', detail: '顧客の質問と更新履歴を人が確認してください。' },
      ],
      limitations: '改善候補の表示例です。生成AIでの表示、引用、参照、可視性を測定・保証しません。',
    },
  },
  recommendations: [
    { period: '1〜3日目', action: 'Search Consoleで対象ページのインデックス状況と検索クエリを確認する', reason: '公開HTMLだけではGoogleの登録状況や流入クエリを確定できないため' },
    { period: '4〜10日目', action: '検索結果に表示したい説明文を整理し、メタ説明を追加する', reason: '検索結果でページの内容を伝わりやすくするため' },
    { period: '11〜20日目', action: '顧客の疑問、選び方、料金・対応範囲など不足情報を補う', reason: '訪問者が判断に必要な情報へ到達しやすくするため' },
    { period: '21〜30日目', action: '変更日を記録し、Search Consoleで表示回数・クリック・掲載順位の変化を比較する', reason: '実データで次の改善優先度を決めるため' },
  ],
  disclosure: {
    automated: 'これは画面確認用のサンプルです。実際のサイトへのアクセスは行っていません。',
    heuristic: '文字数やタグ有無に基づく簡易判定の表示例です。',
    manualReview: '30日計画を確定するには、Search Consoleの閲覧専用データと担当者による確認が必要です。',
    noChangesMade: '対象サイトへのログイン、書き込み、設定変更は一切行いません。',
  },
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_URL: 'http:// または https:// で始まるサイトURLを入力してください。',
  URL_NOT_PUBLIC: '公開インターネットから到達できる通常のサイトURLのみ確認できます。',
  FETCH_FAILED: 'ページを取得できませんでした。URLと公開状態を確認してください。',
  UNSUPPORTED_PAGE: 'HTMLページのみ確認できます。PDFや画像は対象外です。',
  PAGE_TOO_LARGE: 'ページが確認上限（512 KB）を超えています。',
  RATE_LIMITED: '短時間の確認回数が上限に達しました。15分ほど待ってからお試しください。',
}

export default function UrlAudit() {
  const [url, setUrl] = useState('https://enkiseojp.com/')
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const response = await fetch('/api/url-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await response.json() as AuditReport | { error?: string }
      if (!response.ok) {
        const code = 'error' in data ? data.error ?? '' : ''
        throw new Error(ERROR_MESSAGES[code] ?? '確認に失敗しました。時間をおいて再度お試しください。')
      }
      setReport(data as AuditReport)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '確認に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-10 md:py-14">
      <div className="rounded-3xl bg-slate-900 px-6 py-8 text-white md:px-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          <Search className="size-3.5" /> 公開ページ簡易診断
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">サイトURLから、最初の改善候補を確認</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          指定した公開ページ1件のHTMLだけを読み取り、基本的なSEO設定と30日間の改善案を表示します。ログイン情報は入力しないでください。
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="audit-url" className="sr-only">確認する公開ページURL</label>
          <input
            id="audit-url"
            type="url"
            required
            maxLength={2048}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.jp/"
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-900 outline-hidden focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" disabled={loading} className="btn bg-brand-500 px-5 py-3 font-bold text-white hover:bg-brand-400 disabled:opacity-60">
            {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />確認中…</> : '公開ページを確認'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => { setError(null); setReport(SAMPLE_REPORT) }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-white"
        >
          <FlaskConical className="size-3.5" /> 通信せずサンプル結果を見る
        </button>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <TrustItem icon={<ShieldCheck className="size-5" />} text="公開HTMLのみ・最大1ページ" />
        <TrustItem icon={<ShieldCheck className="size-5" />} text="ID・パスワードは不要" />
        <TrustItem icon={<ShieldCheck className="size-5" />} text="対象サイトを変更しません" />
      </div>

      {error ? (
        <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />{error}
        </div>
      ) : null}

      {report ? <ReportView report={report} /> : null}
    </div>
  )
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700">{icon}{text}</div>
}

function ReportView({ report }: { report: AuditReport }) {
  return (
    <section className="mt-8 space-y-6" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className={report.mode === 'sample' ? 'badge badge-amber' : 'badge badge-green'}>
            {report.mode === 'sample' ? 'サンプルデータ（通信なし）' : 'ライブ取得（公開HTML）'}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">簡易診断レポート</h2>
          <p className="mt-1 text-xs text-slate-500">確認ページ数: {report.inspectedPages} / 上限1ページ</p>
        </div>
        <a href={report.finalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
          対象ページ <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="card grid gap-4 text-sm sm:grid-cols-2">
        <Data label="HTTP" value={String(report.page.httpStatus)} />
        <Data label="言語指定" value={report.page.lang ?? '検出なし'} />
        <Data label="タイトル" value={report.page.title ?? '検出なし'} />
        <Data label="H1" value={report.page.h1 ?? '検出なし'} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">{report.systems.googleSeo.label}</h3>
          <span className="badge badge-green">公開HTMLを自動確認</span>
        </div>
        <Findings findings={report.systems.googleSeo.findings.length ? report.systems.googleSeo.findings : report.findings} />
        <p className="mt-3 text-sm text-slate-700">HTTP {report.systems.googleSeo.httpStatus}・リダイレクト {report.systems.googleSeo.redirects} 回</p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-bold">sitemap.xml: {report.systems.googleSeo.sitemap.state === 'found' ? '候補あり' : report.systems.googleSeo.sitemap.state === 'not-found' ? '標準位置で未検出' : '未確認'}</div>
          <p className="mt-1 leading-6">{report.systems.googleSeo.sitemap.detail}</p>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">制限: {report.systems.googleSeo.limitations}</p>
      </div>

      <div className="card border-amber-200">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">{report.systems.yahooJapan.label}</h3>
          <span className="badge badge-amber">手動確認・未接続</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-700">{report.systems.yahooJapan.detail}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">制限: {report.systems.yahooJapan.limitations}</p>
        <div className="mt-3 text-sm font-bold text-slate-900">実測順位: 取得していません</div>
      </div>

      <div className="card border-violet-200">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">{report.systems.geo.label}</h3>
          <span className="badge bg-violet-100 text-violet-700">ヒューリスティック案内</span>
        </div>
        <Findings findings={report.systems.geo.findings} />
        <p className="mt-4 text-xs leading-5 text-slate-500">制限: {report.systems.geo.limitations}</p>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-slate-900">30日間の改善案（たたき台）</h3>
        <p className="mt-1 text-xs text-slate-500">公開ページの簡易判定から作った一般的な案です。実施前に担当者が確認してください。</p>
        <ol className="mt-5 space-y-4">
          {report.recommendations.map((item) => (
            <li key={item.period} className="grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-[7rem_1fr]">
              <div className="text-sm font-bold text-brand-700">{item.period}</div>
              <div><div className="text-sm font-bold text-slate-900">{item.action}</div><p className="mt-1 text-xs leading-5 text-slate-500">理由: {item.reason}</p></div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
        <h3 className="font-bold">このレポートで分かること・分からないこと</h3>
        <dl className="mt-3 space-y-2 leading-6">
          <Disclosure label="自動" value={report.disclosure.automated} />
          <Disclosure label="簡易判定" value={report.disclosure.heuristic} />
          <Disclosure label="人の確認" value={report.disclosure.manualReview} />
          <Disclosure label="変更操作" value={report.disclosure.noChangesMade} />
        </dl>
      </div>
    </section>
  )
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{value}</dd></div>
}

function Disclosure({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 sm:grid-cols-[5rem_1fr]"><dt className="font-bold">{label}</dt><dd>{value}</dd></div>
}

function Findings({ findings }: { findings: AuditReport['findings'] }) {
  return (
    <div className="mt-4 divide-y divide-slate-100">
      {findings.map((finding) => (
        <div key={finding.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          {finding.status === 'ok' ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}
          <div><div className="text-sm font-bold text-slate-900">{finding.label}</div><p className="mt-0.5 text-sm leading-6 text-slate-600">{finding.detail}</p></div>
        </div>
      ))}
    </div>
  )
}
