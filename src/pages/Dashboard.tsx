import { Activity, ArrowUpRight, BarChart3, Eye, Link2, Search, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Stat from '../components/Stat'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'

const TRAFFIC = [
  { m: '6月', clicks: 4200, impressions: 138000 },
  { m: '7月', clicks: 5100, impressions: 152000 },
  { m: '8月', clicks: 4800, impressions: 145000 },
  { m: '9月', clicks: 5600, impressions: 168000 },
  { m: '10月', clicks: 6200, impressions: 185000 },
  { m: '11月', clicks: 7100, impressions: 210000 },
  { m: '12月', clicks: 8400, impressions: 248000 },
  { m: '1月', clicks: 8900, impressions: 262000 },
  { m: '2月', clicks: 9300, impressions: 278000 },
  { m: '3月', clicks: 10200, impressions: 302000 },
  { m: '4月', clicks: 11800, impressions: 348000 },
  { m: '5月', clicks: 12500, impressions: 372000 },
]

const INTENT_COLORS: Record<string, string> = {
  informational: '#3563ff',
  commercial: '#10b981',
  navigational: '#f59e0b',
  transactional: '#e11d48',
}

const DEVICE_DATA = [
  { name: 'モバイル', visits: 68 },
  { name: 'PC', visits: 28 },
  { name: 'タブレット', visits: 4 },
]

export default function Dashboard() {
  const { t } = useT()
  const { keywords, articles, backlinks, auditIssues, currentSiteId } = useStore()
  const siteKw = keywords.filter(k => k.siteId === currentSiteId)
  const siteArt = articles.filter(a => a.siteId === currentSiteId)
  const registered = backlinks.filter(b => b.status === 'registered').length
  const top10 = siteKw.filter(k => k.rank !== null && k.rank <= 10).length

  const intentDist = ['informational', 'commercial', 'navigational', 'transactional'].map(it => ({
    name: it,
    value: siteKw.filter(k => k.intent === it).length,
  }))

  return (
    <div>
      <PageHeader
        title={t('page.dashboard.title')}
        subtitle={t('page.dashboard.subtitle')}
        actions={
          <Link to="/report" className="btn-ghost">
            <BarChart3 className="size-4 mr-1" />
            レポート全体表示
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="月間クリック" value="12,500" delta={{ value: 5.9, suffix: '%' }} hint="vs 先月" icon={<Eye className="size-5" />} />
        <Stat label="追跡キーワード" value={`${siteKw.length} 件`} delta={{ value: 1, suffix: ' 件' }} hint="今月追加" icon={<Search className="size-5" />} />
        <Stat label="TOP10 入りキーワード" value={`${top10} 件`} delta={{ value: 0, suffix: ' 件' }} hint="vs 先月" icon={<TrendingUp className="size-5" />} />
        <Stat label="登録済 被リンク先" value={`${registered} / ${backlinks.length} 件`} delta={{ value: 12, suffix: '%' }} hint="進捗" icon={<Link2 className="size-5" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <SectionTitle hint="Google Search Console から取得 (mock)">流入トラフィック</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={TRAFFIC} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3563ff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3563ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="clicks" stroke="#3563ff" strokeWidth={2} fill="url(#clicks)" name="クリック" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <SectionTitle hint="検索意図 (intent)">キーワード分布</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={intentDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={84} paddingAngle={3}>
                {intentDist.map(it => (
                  <Cell key={it.name} fill={INTENT_COLORS[it.name]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11 }}
                formatter={v => (
                  v === 'informational' ? '情報' :
                  v === 'commercial' ? '商業' :
                  v === 'navigational' ? '指名' :
                  v === 'transactional' ? '取引' : String(v)
                )}
              />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <SectionTitle hint="今月の比率">デバイス別流入</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEVICE_DATA} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="visits" fill="#3563ff" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card lg:col-span-2">
          <SectionTitle
            hint="最終更新順"
            actions={
              <Link to="/content" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
                すべて表示 <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            最近のコンテンツ
          </SectionTitle>
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-head">タイトル</th>
                <th className="table-head">キーワード</th>
                <th className="table-head">状態</th>
                <th className="table-head">文字数</th>
                <th className="table-head">スコア</th>
              </tr>
            </thead>
            <tbody>
              {siteArt.slice(0, 5).map(a => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="table-cell font-medium text-slate-900">
                    <span className="line-clamp-1">{a.title}</span>
                  </td>
                  <td className="table-cell text-slate-500">{a.targetKeyword}</td>
                  <td className="table-cell">
                    {a.status === 'published' ? (
                      <span className="badge-green">{t('article.status.published')}</span>
                    ) : a.status === 'in_review' ? (
                      <span className="badge-amber">{t('article.status.in_review')}</span>
                    ) : (
                      <span className="badge-gray">{t('article.status.draft')}</span>
                    )}
                  </td>
                  <td className="table-cell">{a.wordCount.toLocaleString()}</td>
                  <td className="table-cell">
                    <span
                      className={
                        (a.score ?? 0) >= 80
                          ? 'badge-green'
                          : (a.score ?? 0) >= 60
                            ? 'badge-amber'
                            : 'badge-red'
                      }
                    >
                      {a.score ?? '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 card">
        <SectionTitle hint="重要度の高い修正候補から">サイト診断ハイライト</SectionTitle>
        <ul className="space-y-2">
          {auditIssues.slice(0, 3).map(i => (
            <li key={i.id} className="flex items-start gap-3">
              <span
                className={
                  i.severity === 'critical'
                    ? 'badge-red shrink-0'
                    : i.severity === 'warning'
                      ? 'badge-amber shrink-0'
                      : 'badge-blue shrink-0'
                }
              >
                {i.severity}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{i.title}</div>
                <div className="text-xs text-slate-500">{i.description}</div>
              </div>
              <span className="text-xs text-slate-400">{i.affectedPages} ページ</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-right">
          <Link to="/audit" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
            診断全件を見る <Activity className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
