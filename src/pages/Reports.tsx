import { Download, FileText } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'

const HISTORY = [
  { id: 'rep-1', period: '2026年4月', generatedAt: '2026-05-02', clicks: 11800, top10: 24, articles: 6 },
  { id: 'rep-2', period: '2026年3月', generatedAt: '2026-04-02', clicks: 10200, top10: 22, articles: 5 },
  { id: 'rep-3', period: '2026年2月', generatedAt: '2026-03-02', clicks: 9300, top10: 20, articles: 4 },
  { id: 'rep-4', period: '2026年1月', generatedAt: '2026-02-02', clicks: 8900, top10: 18, articles: 4 },
]

export default function Reports() {
  const { sites, currentSiteId } = useStore()
  const site = sites.find(s => s.id === currentSiteId)

  return (
    <div>
      <PageHeader
        title="レポート"
        subtitle="月次・週次サマリーの自動生成と配信"
        actions={
          <button className="btn-primary">
            <FileText className="size-4 mr-1" />
            今月のレポートを生成
          </button>
        }
      />

      <div className="card mb-6 bg-gradient-to-br from-brand-50 to-white border-brand-100">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-brand-600 flex items-center justify-center text-white">
            <FileText className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">月次 SEO レポート — {site?.name}</h2>
            <p className="text-xs text-slate-500 mt-1">
              ダッシュボード KPI + キーワード推移 + 競合変化 + サイト診断 + 被リンク + コンテンツ実績 を PDF で配信
            </p>
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost text-xs">
                <Download className="size-3.5 mr-1" />
                サンプル PDF
              </button>
              <button className="btn-ghost text-xs">配信先メール設定</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionTitle hint="過去 12 ヶ月分">レポート履歴</SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">期間</th>
              <th className="table-head">生成日</th>
              <th className="table-head text-right">クリック</th>
              <th className="table-head text-right">Top10 KW</th>
              <th className="table-head text-right">公開記事</th>
              <th className="table-head text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="table-cell font-medium text-slate-900">{r.period}</td>
                <td className="table-cell text-slate-500">{r.generatedAt}</td>
                <td className="table-cell text-right tabular-nums">{r.clicks.toLocaleString()}</td>
                <td className="table-cell text-right tabular-nums">{r.top10}</td>
                <td className="table-cell text-right tabular-nums">{r.articles}</td>
                <td className="table-cell text-right">
                  <button className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
                    <Download className="size-3" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
