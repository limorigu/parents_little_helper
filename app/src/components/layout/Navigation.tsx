import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Star, ListChecks, Heart, TrendingUp, Stethoscope, Settings } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/milestones', label: 'Milestones', icon: Star },
  { to: '/plan', label: 'Day Plan', icon: ListChecks },
  { to: '/tracker', label: 'Tracker', icon: Heart },
  { to: '/growth', label: 'Growth', icon: TrendingUp },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/doctor', label: 'Doctor', icon: Stethoscope },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Navigation() {
  const location = useLocation()

  return (
    <>
      {/* Sidebar – desktop */}
      <nav className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-stone-100 min-h-screen py-8 px-4 fixed left-0 top-0 bottom-0 z-40">
        <div className="px-3 mb-8">
          <span className="font-display italic text-stone-800 text-xl leading-tight block">Parents'</span>
          <span className="font-display text-stone-800 text-xl leading-tight block">little helper</span>
          <div className="w-6 h-0.5 bg-blush-300 mt-2 rounded-full" />
        </div>
        <div className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-cream-200 text-stone-800' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                {label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Bottom bar – mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 z-40 flex items-center justify-around px-2 py-2 safe-area-bottom">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${active ? 'text-stone-800' : 'text-stone-400'}`}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
