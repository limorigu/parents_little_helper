import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ children, className = '', hover = false, onClick, padding = 'md' }: CardProps) {
  const padMap = { sm: 'p-4', md: 'p-5', lg: 'p-6', none: '' }
  const shadow = padding === 'sm' ? 'shadow-brutal-sm' : 'shadow-brutal'
  return (
    <div
      onClick={onClick}
      className={`bg-cream-50 rounded-[1.75rem] border-4 border-stone-800 ${shadow} transition-all duration-200 ${padMap[padding]} ${hover ? 'hover:shadow-brutal-lg hover:-translate-y-1 active:translate-y-0.5 active:shadow-brutal-sm cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
