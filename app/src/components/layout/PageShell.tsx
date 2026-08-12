import { type ReactNode } from 'react'

interface PageShellProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function PageShell({ title, subtitle, action, children }: PageShellProps) {
  return (
    <div className="flex-1 min-h-screen">
      <div className="sticky top-0 bg-cream-100/90 backdrop-blur-md z-30 px-5 md:px-8 py-4 border-b-4 border-stone-800">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div>
            <h1 className="font-display font-black text-2xl text-stone-800 leading-tight">{title}</h1>
            {subtitle && <p className="text-sm font-bold text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="px-5 md:px-8 py-6 max-w-3xl mx-auto pb-28 md:pb-8">
        {children}
      </div>
    </div>
  )
}
