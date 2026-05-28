import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  spec?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, spec, actions }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {spec ? (
            <span className="text-[11px] font-mono text-slate-400 rounded bg-slate-100 px-2 py-0.5">
              {spec}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
