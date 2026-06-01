// 画面 3 — キーワード詳細

import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, ChevronUp, CircleDot, Clock, Copy, FileText, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useArticles, useKeyword, useStore } from '../store/StoreProvider'
import { TIER_PROFILES, budgetBreakdown, serviceFeatures, withTax, formatYen } from '../lib/difficulty'
import { generateArticles } from '../lib/aiArticle'
import { buildArticleJsonLd } from '../lib/jsonLd'
import type { GeneratedArticle, Keyword, MonthlyTask } from '../store/types'

const ARTICLE_COUNT_BY_TIER: Record<Keyword['tier'], number> = { easy: 2, medium: 4, hard: 8 }

const PROVIDER_BADGE: Record<string, { label: string; cls: string }> = {
  deepseek: { label: 'DeepSeek 生成', cls: 'bg-brand-100 text-brand-700' },
  claude: { label: 'Claude 生成', cls: 'bg-violet-100 text-violet-700' },
  template: { label: 'プレビュー(API 未接続)', cls: 'bg-slate-100 text-slate-500' },
}

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
      <div className="flex items-center justify-between gap-2">
        <Link to="/" className="inline-flex min-w-0 items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4 shrink-0" />
          <span className="truncate">キーワード一覧に戻る</span>
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
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
          <span className="text-slate-400">
            目標 {profile.targetMonths} ヶ月で 1 ページ目
          </span>
        </div>
      </header>

      <ProgressCard kw={kw} progress={progress} profile={profile} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-3">私たちがやること</h2>
        <ul className="space-y-2">
          {serviceFeatures(kw.tier).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-3.5" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </section>
      <TasksCard kw={kw} onUpdateStatus={updateTaskStatus} />
      <ArticlesCard kw={kw} />
      <BudgetCard breakdown={breakdown} monthlyTotal={kw.monthlyBudgetYen} totalMonths={kw.targetMonths} />
    </div>
  )
}

function ProgressCard({ kw, profile, progress }: {
  kw: Keyword
  profile: (typeof TIER_PROFILES)['easy']
  progress: number
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">目標達成までの進捗</h2>

      <div className="space-y-4">
        <div>
          {/* P1 fix: バー幅・% ラベルともに「経過月数 / 目標月数」で統一(仪表盘と同口径)。
              以前は左ラベルが「開始位→目標位」(順位枠)でバーは時間 = 口径が混在していた。
              順位の推移は下の RankPanel(スパークライン)で別途表示する。 */}
          <div className="flex items-baseline justify-between text-xs mb-1">
            <span className="text-slate-500">
              目標 {profile.targetMonths} ヶ月で 1 ページ目
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
          <RankPanel label="Google Japan" rank={kw.googleRank} history={kw.rankHistory.map(s => s.google)} />
          <RankPanel label="Yahoo Japan"  rank={kw.yahooRank}  history={kw.rankHistory.map(s => s.yahoo)} />
        </div>
      </div>
    </section>
  )
}

function RankPanel({ label, rank, history }: {
  label: string
  rank: number | null
  history: (number | null)[]
}) {
  // P2 fix: 順位の色は媒体(Google/Yahoo)で変えず意味で統一する。
  // 1 ページ目(10 位以内)= 緑 / それ以外 = スレート。スパークラインも中立色。
  const rankColor = rank !== null && rank <= 10 ? '#16a34a' : '#0f172a'
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums" style={{ color: rankColor }}>
        {rank === null ? '計測中' : `${rank} 位`}
      </div>
      {history.length >= 2 ? (
        <Spark history={history} color="#94a3b8" />
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
      // P1 fix: 順位は小さいほど上位。改善(数値↓)を視覚的に「上向き」に見せるため
      // y 軸を反転 — 最良順位(minRank)を上、最悪(maxRank)を下に配置する。
      // これで「線が上がる = 順位が良くなった」と直感的に読める。
      const y = (((p.y as number) - minRank) / range) * (h - 4) + 2
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // レスポンシブ: 固定 200px だと狭い画面で横はみ出し → 削除ボタンが見切れる原因。
  // viewBox + width:100% でセル幅に追従させる(線幅は non-scaling-stroke で一定)。
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="mt-2 block w-full">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
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
        {formatYen(task.budgetYen)}
      </span>
    </li>
  )
}

function BudgetCard({ breakdown, monthlyTotal, totalMonths }: {
  breakdown: { label: string; yen: number }[]
  monthlyTotal: number
  totalMonths: number
}) {
  const monthlyTaxIncl = withTax(monthlyTotal)
  const totalCost = monthlyTaxIncl * totalMonths
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">費用の内訳</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500">月額予算(税込)</div>
          <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
            {formatYen(monthlyTaxIncl)}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {breakdown.map(b => (
              <li key={b.label} className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-600">{b.label}<span className="text-[10px] text-slate-400 ml-1">(税抜)</span></span>
                <span className="tabular-nums text-slate-900 font-semibold">{formatYen(b.yen)}</span>
              </li>
            ))}
            <li className="flex justify-between pt-1 text-slate-600">
              <span>小計(税抜)</span>
              <span className="tabular-nums">{formatYen(monthlyTotal)}</span>
            </li>
            <li className="flex justify-between pt-1 text-xs text-slate-500">
              <span>消費税(10%)</span>
              <span className="tabular-nums">{formatYen(monthlyTaxIncl - monthlyTotal)}</span>
            </li>
            <li className="flex justify-between pt-1 font-bold text-slate-900">
              <span>合計(税込)</span>
              <span className="tabular-nums">{formatYen(monthlyTaxIncl)} / 月</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="text-xs text-slate-500">1 ページ目到達までの総額(税込)</div>
          <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
            {formatYen(totalCost)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {formatYen(monthlyTaxIncl)}/月 × {totalMonths} ヶ月
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

function ArticlesCard({ kw }: { kw: Keyword }) {
  const articles = useArticles(kw.id)
  const { replaceArticles, deleteArticle } = useStore()
  const profile = TIER_PROFILES[kw.tier]
  const count = ARTICLE_COUNT_BY_TIER[kw.tier]
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // 生成中の経過秒カウンタ。「固まった?」という誤解を防ぎ、進行中だと一目で伝える。
  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [loading])

  async function handleGenerate() {
    setLoading(true)
    try {
      const drafts = await generateArticles({ keyword: kw.keyword, tier: kw.tier, count })
      replaceArticles(kw.id, drafts)
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : String(e)
      alert(
        `記事生成に失敗しました。\n${msg}\n\n` +
          '生成バックエンドが起動しているかご確認のうえ、もう一度お試しください。',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-slate-900">AI 記事ドラフト</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            今月の目標: {count} 本({profile.emoji} {profile.label})
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              生成中…({count} 本)
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              今月の AI 記事を生成({count} 本)
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 py-10 text-center">
          <Loader2 className="mx-auto mb-3 size-8 animate-spin text-brand-600" />
          <p className="text-sm font-semibold text-slate-800">
            AI が「{kw.keyword}」向けの記事を {count} 本 生成しています…
          </p>
          <p className="mt-1 text-xs text-slate-500">
            通常 20〜40 秒ほどかかります(経過 {elapsed} 秒)。このページを閉じずにお待ちください。
          </p>
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <FileText className="mx-auto mb-2 size-8 text-slate-300" />
          <p className="text-sm text-slate-500">まだ記事がありません。</p>
          <p className="mt-1 text-xs text-slate-400">
            「今月の AI 記事を生成」を押すと、{kw.keyword} 向けの日本語 SEO 記事の下書きが作成されます。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {articles.map(a => (
            <ArticleRow key={a.id} article={a} onDelete={() => deleteArticle(kw.id, a.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ArticleRow({ article, onDelete }: { article: GeneratedArticle; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedLd, setCopiedLd] = useState(false)
  const badge = PROVIDER_BADGE[article.provider] ?? PROVIDER_BADGE.template
  const hasSchema = !!(article.metaDescription || (article.faq && article.faq.length > 0))

  async function copy() {
    try {
      await navigator.clipboard.writeText(article.markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard 不可
    }
  }

  async function copyJsonLd() {
    try {
      await navigator.clipboard.writeText(buildArticleJsonLd(article))
      setCopiedLd(true)
      setTimeout(() => setCopiedLd(false), 1500)
    } catch {
      // clipboard 不可
    }
  }

  return (
    <li className="rounded-xl border border-slate-100">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? <ChevronUp className="size-4 shrink-0 text-slate-400" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
          <span className="truncate text-sm font-medium text-slate-900">{article.title}</span>
        </button>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${badge.cls}`}>{badge.label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        >
          <Copy className="size-3.5" />
          {copied ? 'コピー済' : 'コピー'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex shrink-0 items-center rounded-md px-1.5 py-1 text-rose-500 hover:bg-rose-50"
          aria-label="削除"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
          {article.metaDescription ? (
            <div className="text-xs">
              <div className="font-bold text-slate-500 mb-0.5">メタディスクリプション</div>
              <p className="text-slate-700 leading-relaxed">{article.metaDescription}</p>
            </div>
          ) : null}
          <pre className="max-h-96 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
            {article.markdown}
          </pre>
          {article.faq && article.faq.length > 0 ? (
            <div className="text-xs">
              <div className="font-bold text-slate-500 mb-1">FAQ</div>
              <ul className="space-y-1.5">
                {article.faq.map((f, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="font-semibold text-slate-700">Q. {f.q}</span>
                    <br />
                    <span className="text-slate-600">A. {f.a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {article.relatedKeywords && article.relatedKeywords.length > 0 ? (
            <div className="text-xs">
              <div className="font-bold text-slate-500 mb-1">関連キーワード(内部リンク候補)</div>
              <div className="flex flex-wrap gap-1.5">
                {article.relatedKeywords.map((k, i) => (
                  <span key={i} className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">{k}</span>
                ))}
              </div>
            </div>
          ) : null}
          {hasSchema ? (
            <button
              type="button"
              onClick={copyJsonLd}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              <Copy className="size-3.5" />
              {copiedLd ? 'JSON-LD コピー済' : 'JSON-LD(構造化データ)をコピー'}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
