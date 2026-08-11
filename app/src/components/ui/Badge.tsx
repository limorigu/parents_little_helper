import { type ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ children, className = '', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
