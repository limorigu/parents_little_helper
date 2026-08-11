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
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[1.25rem] border border-stone-100 shadow-[0_2px_12px_0_rgba(44,38,30,0.07)] ${padMap[padding]} ${hover ? 'transition-all duration-200 hover:shadow-[0_8px_28px_0_rgba(44,38,30,0.11)] hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
