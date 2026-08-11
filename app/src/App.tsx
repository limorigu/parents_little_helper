import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { Navigation } from './components/layout/Navigation'
import { Dashboard } from './pages/Dashboard'
import { Milestones } from './pages/Milestones'
import { MilestoneRecord } from './pages/MilestoneRecord'
import { DailyPlan } from './pages/DailyPlan'
import { Tracker } from './pages/Tracker'
import { GrowthChart } from './pages/GrowthChart'
import { Calendar } from './pages/Calendar'
import { DoctorPrep } from './pages/DoctorPrep'
import { Settings } from './pages/Settings'

function AppShell() {
  const { baby } = useAppStore()

  if (!baby.onboardingComplete) {
    return <Settings />
  }

  return (
    <div className="flex min-h-screen bg-cream-100">
      <Navigation />
      <main className="flex-1 md:ml-60">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/milestones/record" element={<MilestoneRecord />} />
          <Route path="/plan" element={<DailyPlan />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/growth" element={<GrowthChart />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/doctor" element={<DoctorPrep />} />
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
