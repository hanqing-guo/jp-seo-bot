import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface Props {
  label: string
  value: ReactNode
  delta?: { value: number; suffix?: string; positiveIsGood?: boolean }
  hint?: string
  icon?: ReactNode
  className?: string
}

export default function Stat({ label, value, delta, hint, icon, className }: Props) {
  const positiveIsGood = delta?.positiveIsGood !== false

  let deltaBadge: { tone: 'green' | 'red' | 'neutral'; arrow: string; sign: string; abs: number } | null = null
  if (delta) {
    if (delta.value === 0) {
      deltaBadge = { tone: 'neutral', arrow: '—', sign: '±', abs: 0 }
    } else {
      const positive = delta.value > 0
      const good = positive ? positiveIsGood : !positiveIsGood
      deltaBadge = {
        tone: good ? 'green' : 'red',
        arrow: positive ? '▲' : '▼',
        sign: positive ? '+' : '−',
        abs: Math.abs(delta.value),
      }
    }
  }

  return (
    <div className={cn('card', className)}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        {icon ? <div className="text-slate-300">{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {deltaBadge ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 tabular-nums',
              deltaBadge.tone === 'green' && 'bg-emerald-100 text-emerald-700',
              deltaBadge.tone === 'red' && 'bg-rose-100 text-rose-700',
              deltaBadge.tone === 'neutral' && 'bg-slate-100 text-slate-500',
            )}
            aria-label={
              deltaBadge.tone === 'neutral'
                ? '前回比 変化なし'
                : `前回比 ${deltaBadge.sign}${deltaBadge.abs}${delta?.suffix ?? ''}`
            }
          >
            <span aria-hidden="true">{deltaBadge.arrow}</span>
            {deltaBadge.tone === 'neutral' ? null : <span>{deltaBadge.sign}{deltaBadge.abs}{delta?.suffix ?? ''}</span>}
          </span>
        ) : null}
        {hint ? <span className="text-slate-400">{hint}</span> : null}
      </div>
    </div>
  )
}
