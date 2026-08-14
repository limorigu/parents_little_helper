import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { useGoogleAutoSync } from './hooks/useGoogleAutoSync'
import { useLocalEventsAutoRefresh } from './hooks/useLocalEventsAutoRefresh'
import { Navigation } from './components/layout/Navigation'
import { DarkModeToggle } from './components/ui/DarkModeToggle'
import { Dashboard } from './pages/Dashboard'
import { Milestones } from './pages/Milestones'
import { MilestoneRecord } from './pages/MilestoneRecord'
import { DailyPlan } from './pages/DailyPlan'
import { Tracker } from './pages/Tracker'
import { GrowthChart } from './pages/GrowthChart'
import { Calendar } from './pages/Calendar'
import { DoctorPrep } from './pages/DoctorPrep'
import { LocalEvents } from './pages/LocalEvents'
import { Settings } from './pages/Settings'

function AppShell() {
  const { baby, darkMode } = useAppStore()
  useGoogleAutoSync()
  useLocalEventsAutoRefresh()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  if (!baby.onboardingComplete) {
    return (
      <>
        <DarkModeToggle />
        <Settings />
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-cream-100">
      <DarkModeToggle />
      <Navigation />
      {/* min-w-0 is load-bearing: a flex item defaults to min-width:auto, so the
          wide tracker sheet tables (which scroll internally) would otherwise push
          this <main> past the viewport and give the whole app a horizontal
          scrollbar on mobile. */}
      <main className="flex-1 min-w-0 md:ml-60">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/milestones/record" element={<MilestoneRecord />} />
          <Route path="/plan" element={<DailyPlan />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/growth" element={<GrowthChart />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/doctor" element={<DoctorPrep />} />
          <Route path="/events" element={<LocalEvents />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
