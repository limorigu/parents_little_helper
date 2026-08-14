import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Star, ListChecks, Heart, TrendingUp, Stethoscope, MapPin, Settings } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/milestones', label: 'Milestones', icon: Star },
  { to: '/plan', label: 'Day Plan', icon: ListChecks },
  { to: '/tracker', label: 'Tracker', icon: Heart },
  { to: '/growth', label: 'Growth', icon: TrendingUp },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/doctor', label: 'Doctor', icon: Stethoscope },
  { to: '/events', label: 'Local Events', icon: MapPin },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Navigation() {
  const location = useLocation()

  return (
    <>
      {/* Sidebar – desktop */}
      <nav className="hidden md:flex flex-col w-60 shrink-0 bg-cream-50 border-r-4 border-stone-800 min-h-screen py-8 px-4 fixed left-0 top-0 bottom-0 z-40">
        {/* See Dashboard.tsx — the wordmark is charcoal inside the PNG, so it needs
            the always-light `cream` token behind it to survive Night Owl mode. */}
        <div className="px-1 mb-8">
          <span className="bg-cream rounded-xl px-2 py-1.5 inline-flex">
            <img src="/logo-horizontal.png" alt="Parents' Little Helper" className="h-10 w-auto" />
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? 'bg-sage-100 border-stone-800 text-stone-800 shadow-brutal-sm' : 'border-transparent text-stone-500 hover:border-stone-800 hover:-translate-y-0.5 hover:text-stone-700'}`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Bottom bar – mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-cream-50 border-t-4 border-stone-800 z-40 flex items-center justify-around px-2 py-2 safe-area-bottom">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl border-2 transition-all ${active ? 'text-stone-800 bg-sage-100 border-stone-800' : 'text-stone-400 border-transparent'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-bold">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
