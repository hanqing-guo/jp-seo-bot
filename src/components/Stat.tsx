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
  const isGreen = delta ? (delta.value >= 0 ? positiveIsGood : !positiveIsGood) : false
  return (
    <div className={cn('card', className)}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        {icon ? <div className="text-slate-300">{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5',
              isGreen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
            )}
          >
            {delta.value >= 0 ? '▲' : '▼'} {Math.abs(delta.value)}
            {delta.suffix ?? ''}
          </span>
        ) : null}
        {hint ? <span className="text-slate-400">{hint}</span> : null}
      </div>
    </div>
  )
}
