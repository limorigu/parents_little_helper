import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

/**
 * Floating "Zen Mode" toggle — reachable from every page (including the
 * mobile bottom-tab layout, which has no spare slot) so a bleary-eyed parent
 * can flip to a dark, high-contrast theme at 3am without hunting through
 * Settings.
 */
export function DarkModeToggle() {
  const { darkMode, setDarkMode } = useAppStore()

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to Night Owl (dark) mode'}
      title={darkMode ? 'Switch to light mode' : 'Night Owl mode'}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center bg-cream-50 border-[3px] border-stone-800 shadow-brutal-sm text-stone-800 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all"
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
