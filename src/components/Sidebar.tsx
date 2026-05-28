import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  CalendarRange,
  FileText,
  Gauge,
  Globe2,
  LineChart,
  Link2,
  MapPin,
  PenLine,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  Tag,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { cn } from '../lib/cn'

interface Item {
  to: string
  labelKey: string
  Icon: typeof Activity
}

const CORE: Item[] = [
  { to: '/', labelKey: 'nav.dashboard', Icon: Gauge },
  { to: '/keywords', labelKey: 'nav.keywords', Icon: Search },
  { to: '/content', labelKey: 'nav.content', Icon: PenLine },
  { to: '/rank', labelKey: 'nav.rank', Icon: LineChart },
  { to: '/audit', labelKey: 'nav.audit', Icon: Activity },
  { to: '/competitor', labelKey: 'nav.competitor', Icon: BarChart3 },
  { to: '/report', labelKey: 'nav.report', Icon: FileText },
  { to: '/settings', labelKey: 'nav.settings', Icon: Settings },
]

const JP: Item[] = [
  { to: '/diagnosis', labelKey: 'nav.diagnosis', Icon: Stethoscope },
  { to: '/backlinks', labelKey: 'nav.backlinks', Icon: Link2 },
  { to: '/meo', labelKey: 'nav.meo', Icon: MapPin },
  { to: '/wordpress', labelKey: 'nav.wordpress', Icon: Globe2 },
  { to: '/calendar', labelKey: 'nav.calendar', Icon: CalendarRange },
  { to: '/schema', labelKey: 'nav.schema', Icon: Tag },
]

function Group({ titleKey, items }: { titleKey: string; items: Item[] }) {
  const { t } = useT()
  return (
    <div className="mb-6">
      <div className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t(titleKey)}
      </div>
      <nav className="space-y-0.5">
        {items.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function Sidebar() {
  const { t } = useT()
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-100">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-900">{t('app.title')}</div>
          <div className="text-[11px] text-slate-500">{t('app.tagline')}</div>
        </div>
      </div>

      <div className="py-4">
        <Group titleKey="group.core" items={CORE} />
        <Group titleKey="group.jp" items={JP} />
      </div>
    </aside>
  )
}
