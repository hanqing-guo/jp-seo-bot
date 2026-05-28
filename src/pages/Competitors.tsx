import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'

export default function Competitors() {
  const { t } = useT()
  const { competitors } = useStore()

  const chartData = competitors.map(c => ({
    name: c.domain.replace(/^www\./, '').slice(0, 18),
    organic: Math.round(c.organicTraffic / 1000),
  }))

  return (
    <div>
      <PageHeader
        title={t('page.competitor.title')}
        subtitle={t('page.competitor.subtitle')}
        actions={
          <button className="btn-primary">
            <Plus className="size-4 mr-1" />
            競合を追加
          </button>
        }
      />

      <div className="card mb-6">
        <SectionTitle hint="単位 K (千)">月間オーガニック流入</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="organic" name="月間 organic (K)" fill="#3563ff" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitors.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 break-all">{c.domain}</div>
                <div className="text-xs text-slate-400 mt-0.5">{c.organicKeywords.toLocaleString()} キーワードでランクイン</div>
              </div>
              <div
                className={
                  'flex size-12 items-center justify-center rounded-xl font-bold text-lg ' +
                  (c.dr >= 80 ? 'bg-brand-100 text-brand-700' : c.dr >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')
                }
              >
                {c.dr}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] uppercase text-slate-500">月間流入</div>
                <div className="text-sm font-semibold tabular-nums">{c.organicTraffic.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] uppercase text-slate-500">重複率</div>
                <div className="text-sm font-semibold tabular-nums">{c.overlap}%</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mb-1">主要キーワード</div>
            <div className="flex flex-wrap gap-1.5">
              {c.topKeywords.map((kw, i) => (
                <span key={i} className="badge-blue">{kw}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
