import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  hint?: string
  actions?: ReactNode
}

export default function SectionTitle({ children, hint, actions }: Props) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{children}</h2>
        {hint ? <p className="text-xs text-slate-400 mt-0.5">{hint}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
