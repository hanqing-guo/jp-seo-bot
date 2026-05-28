import { Download, FileText } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'

// クリック・Top10 数・累計公開記事数は store のサンプルデータと一致させる。
// 最終月 (2026年5月) は「今月の生成待ち」として履歴行を出さない。
const HISTORY = [
  { id: 'rep-12', period: '2026年4月', generatedAt: '2026-05-02', clicks: 11800, top10: 2, articles: 2 },
  { id: 'rep-11', period: '2026年3月', generatedAt: '2026-04-02', clicks: 10200, top10: 2, articles: 2 },
  { id: 'rep-10', period: '2026年2月', generatedAt: '2026-03-02', clicks: 9300, top10: 2, articles: 2 },
  { id: 'rep-9', period: '2026年1月', generatedAt: '2026-02-02', clicks: 8900, top10: 1, articles: 1 },
  { id: 'rep-8', period: '2025年12月', generatedAt: '2026-01-02', clicks: 8400, top10: 1, articles: 1 },
  { id: 'rep-7', period: '2025年11月', generatedAt: '2025-12-02', clicks: 7100, top10: 1, articles: 1 },
  { id: 'rep-6', period: '2025年10月', generatedAt: '2025-11-02', clicks: 6200, top10: 1, articles: 1 },
  { id: 'rep-5', period: '2025年9月', generatedAt: '2025-10-02', clicks: 5600, top10: 1, articles: 1 },
  { id: 'rep-4', period: '2025年8月', generatedAt: '2025-09-02', clicks: 4800, top10: 1, articles: 0 },
  { id: 'rep-3', period: '2025年7月', generatedAt: '2025-08-02', clicks: 5100, top10: 0, articles: 0 },
  { id: 'rep-2', period: '2025年6月', generatedAt: '2025-07-02', clicks: 4200, top10: 0, articles: 0 },
]

export default function Reports() {
  const { t } = useT()
  const { sites, currentSiteId } = useStore()
  const site = sites.find(s => s.id === currentSiteId)

  return (
    <div>
      <PageHeader
        title={t('page.report.title')}
        subtitle={t('page.report.subtitle')}
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
        <SectionTitle hint={`過去 ${HISTORY.length} ヶ月分(本月分は上部「今月のレポートを生成」ボタンから)`}>レポート履歴</SectionTitle>
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
