import { type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-stone-600">{label}</label>}
      <input
        id={id}
        {...props}
        className={`w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition ${error ? 'border-blush-400 focus:ring-blush-300' : ''} ${className}`}
      />
      {error && <p className="text-xs text-blush-600">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-sm font-medium text-stone-600">{label}</label>}
      <textarea
        id={id}
        {...props}
        className={`w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition resize-none ${error ? 'border-blush-400 focus:ring-blush-300' : ''} ${className}`}
      />
      {error && <p className="text-xs text-blush-600">{error}</p>}
    </div>
  )
}
