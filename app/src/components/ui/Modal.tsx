import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" aria-modal="true">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-cream-50 border-4 border-stone-800 rounded-[1.75rem] shadow-brutal-lg max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-stone-800">
          <h2 className="font-display font-black text-lg text-stone-800">{title}</h2>
          <button onClick={onClose} className="text-stone-800 rounded-full p-1 border-2 border-stone-800 bg-cream-100 hover:bg-marigold-100 active:translate-y-0.5 transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
