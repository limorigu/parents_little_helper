import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-3">
      {icon && <span className="text-4xl mb-1 inline-block animate-float">{icon}</span>}
      <p className="font-display font-black text-stone-700">{title}</p>
      {description && <p className="text-sm font-bold text-stone-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
