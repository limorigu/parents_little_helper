import { type ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ children, className = '', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg border-2 border-current/25 ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
