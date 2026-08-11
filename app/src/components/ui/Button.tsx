import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

export function Button({ variant = 'primary', size = 'md', children, fullWidth, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-stone-800 text-cream-50 hover:bg-stone-700 focus:ring-stone-400 active:scale-95',
    secondary: 'bg-cream-200 text-stone-700 hover:bg-cream-300 focus:ring-stone-300 active:scale-95',
    ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-stone-200 active:scale-95',
    danger: 'bg-blush-500 text-white hover:bg-blush-600 focus:ring-blush-300 active:scale-95',
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
