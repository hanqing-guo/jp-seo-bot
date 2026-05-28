import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Play } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import Stat from '../components/Stat'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'

const CATEGORY_KEYS: Record<string, string> = {
  technical: 'audit.category.technical',
  'on-page': 'audit.category.on-page',
  content: 'audit.category.content',
  mobile: 'audit.category.mobile',
  speed: 'audit.category.speed',
}

export default function SiteAudit() {
  const { t } = useT()
  const { auditIssues } = useStore()
  const [filter, setFilter] = useState<string>('all')
  const list = filter === 'all' ? auditIssues : auditIssues.filter(i => i.severity === filter)

  const critical = auditIssues.filter(i => i.severity === 'critical').length
  const warning = auditIssues.filter(i => i.severity === 'warning').length
  const info = auditIssues.filter(i => i.severity === 'info').length
  const auditScore = Math.max(0, 100 - critical * 15 - warning * 5 - info * 1)

  return (
    <div>
      <PageHeader
        title={t('page.audit.title')}
        subtitle={t('page.audit.subtitle')}
        actions={
          <button className="btn-primary">
            <Play className="size-4 mr-1" />
            新規スキャン実行
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="サイトスコア" value={auditScore} hint="100 が満点" />
        <Stat label="重大" value={critical} delta={{ value: -1, positiveIsGood: false }} hint="前回比" />
        <Stat label="警告" value={warning} delta={{ value: 0, positiveIsGood: false }} hint="前回比" />
        <Stat label="情報" value={info} delta={{ value: 0, positiveIsGood: false }} hint="前回比" />
      </div>

      <div className="card">
        <SectionTitle
          hint={`${list.length} 件の問題`}
          actions={
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {[
                { v: 'all', label: 'すべて' },
                { v: 'critical', label: '重大' },
                { v: 'warning', label: '警告' },
                { v: 'info', label: '情報' },
              ].map(o => (
                <button
                  key={o.v}
                  onClick={() => setFilter(o.v)}
                  className={'px-3 py-1 rounded-md transition-colors ' + (filter === o.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}
                >
                  {o.label}
                </button>
              ))}
            </div>
          }
        >
          検出された問題
        </SectionTitle>

        <ul className="space-y-3">
          {list.map(i => (
            <li key={i.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50/50">
              <div
                className={
                  'mt-0.5 flex size-8 items-center justify-center rounded-lg shrink-0 ' +
                  (i.severity === 'critical' ? 'bg-rose-100 text-rose-700' : i.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700')
                }
              >
                {i.severity === 'info' ? <Info className="size-4" /> : <AlertTriangle className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-900">{i.title}</h4>
                  <span className="badge-gray">{t(CATEGORY_KEYS[i.category] ?? i.category)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{i.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-slate-900">{i.affectedPages}</div>
                <div className="text-[10px] text-slate-400">ページ</div>
              </div>
            </li>
          ))}
        </ul>
        {list.length === 0 ? (
          <div className="py-8 text-center text-sm text-emerald-600">
            <CheckCircle2 className="size-6 mx-auto mb-2" />
            この条件では問題は検出されませんでした。
          </div>
        ) : null}
      </div>
    </div>
  )
}
