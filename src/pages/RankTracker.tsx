import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'

const MONTHS = ['6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月']

export default function RankTracker() {
  const { keywords, currentSiteId } = useStore()
  const list = keywords.filter(k => k.siteId === currentSiteId && k.rank !== null)

  const chartData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const row: Record<string, number | string> = { month: m }
      list.slice(0, 4).forEach(k => {
        row[k.keyword] = [...k.trend].reverse()[i]
      })
      return row
    })
  }, [list])

  const colors = ['#3563ff', '#10b981', '#f59e0b', '#e11d48']

  return (
    <div>
      <PageHeader title="ランキング追跡" subtitle="月次の検索順位推移" />

      <div className="card mb-6">
        <SectionTitle hint="主要 4 キーワード">12 ヶ月推移</SectionTitle>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis reversed domain={[1, 50]} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {list.slice(0, 4).map((k, i) => (
              <Line key={k.id} type="monotone" dataKey={k.keyword} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <SectionTitle hint="現在の順位と前月差">追跡中キーワード</SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">キーワード</th>
              <th className="table-head text-right">月間検索数</th>
              <th className="table-head text-right">前月順位</th>
              <th className="table-head text-right">今月順位</th>
              <th className="table-head text-right">変動</th>
              <th className="table-head">URL</th>
            </tr>
          </thead>
          <tbody>
            {list.map(k => {
              const prev = [...k.trend][1] ?? k.rank ?? 0
              const cur = k.rank ?? 0
              const diff = prev - cur
              return (
                <tr key={k.id} className="border-t border-slate-100">
                  <td className="table-cell font-medium text-slate-900">{k.keyword}</td>
                  <td className="table-cell text-right tabular-nums">{k.searchVolume.toLocaleString()}</td>
                  <td className="table-cell text-right tabular-nums text-slate-500">{prev}</td>
                  <td className="table-cell text-right tabular-nums font-bold">{cur}</td>
                  <td className="table-cell text-right">
                    {diff > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                        <ArrowUpRight className="size-3" /> +{diff}
                      </span>
                    ) : diff < 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
                        <ArrowDownRight className="size-3" /> {diff}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                        <Minus className="size-3" />0
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-xs text-slate-400 font-mono truncate max-w-[200px]">
                    /seo/{k.keyword.replace(/\s+/g, '-').slice(0, 24)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
