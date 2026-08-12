import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

export function Button({ variant = 'primary', size = 'md', children, fullWidth, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-bold rounded-2xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-sage-500 text-cream-50 border-4 border-stone-800 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 active:translate-y-1 active:shadow-brutal-sm',
    secondary: 'bg-cream-50 text-stone-800 border-4 border-stone-800 shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 active:translate-y-1 active:shadow-none',
    ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 hover:-translate-y-0.5 active:translate-y-0',
    danger: 'bg-blush-500 text-cream-50 border-4 border-stone-800 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 active:translate-y-1 active:shadow-brutal-sm',
  }

  const sizes = {
    sm: 'text-sm px-4 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-6 py-3',
  }

  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
