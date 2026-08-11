import { useState } from 'react'
import { format, parseISO, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getBabyAgeWeeks, uid, formatDate } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { PageShell } from '../components/layout/PageShell'

interface CalendarEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'milestone' | 'appointment' | 'custom' | 'birthday'
  isSpecial: boolean
}

// Generate automatic key dates from birth date
function getAutoEvents(birthDate: string): CalendarEvent[] {
  if (!birthDate) return []
  const birth = parseISO(birthDate)
  const events: CalendarEvent[] = [
    { id: 'birth', date: birthDate, title: 'Birth day', description: 'The most important day.', type: 'birthday', isSpecial: true },
  ]
  // Monthly anniversaries for first year
  for (let month = 1; month <= 12; month++) {
    const d = addDays(birth, month * 30)
    events.push({
      id: `month-${month}`,
      date: format(d, 'yyyy-MM-dd'),
      title: `${month} month${month > 1 ? 's' : ''} old!`,
      description: `${month}-month milestone.`,
      type: 'birthday',
      isSpecial: month % 3 === 0,
    })
  }
  // 100 days
  events.push({
    id: 'day100',
    date: format(addDays(birth, 100), 'yyyy-MM-dd'),
    title: '100 days! 🎉',
    description: 'A traditional and joyful milestone in many cultures.',
    type: 'milestone',
    isSpecial: true,
  })
  return events
}

function useCalendarEvents() {
  const { baby, recordedMilestones, doctorVisits } = useAppStore()
  const auto = getAutoEvents(baby.birthDate)
  const milestoneEvents: CalendarEvent[] = recordedMilestones.map((r) => ({
    id: `rm-${r.id}`,
    date: r.date,
    title: r.title,
    description: r.notes,
    type: 'milestone',
    isSpecial: false,
  }))
  const doctorEvents: CalendarEvent[] = doctorVisits.map((v) => ({
    id: `dr-${v.id}`,
    date: v.date,
    title: v.type,
    description: v.notes,
    type: 'appointment',
    isSpecial: false,
  }))
  return [...auto, ...milestoneEvents, ...doctorEvents]
}

export function Calendar() {
  const { baby } = useAppStore()
  const [viewDate, setViewDate] = useState(new Date())
  const [addModal, setAddModal] = useState(false)
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newDesc, setNewDesc] = useState('')

  const allEvents = [...useCalendarEvents(), ...customEvents]
  const weeks = getBabyAgeWeeks(baby.birthDate)

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const e of allEvents) {
    const key = e.date.slice(0, 10)
    if (!eventsByDate.has(key)) eventsByDate.set(key, [])
    eventsByDate.get(key)!.push(e)
  }

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []

  function addCustomEvent() {
    if (!newTitle.trim()) return
    setCustomEvents((prev) => [
      ...prev,
      { id: uid(), date: newDate, title: newTitle.trim(), description: newDesc.trim(), type: 'custom', isSpecial: false },
    ])
    setNewTitle(''); setNewDesc('')
    setAddModal(false)
  }

  const upcomingEvents = allEvents
    .filter((e) => {
      const d = parseISO(e.date)
      return d >= new Date() && d <= addDays(new Date(), 30)
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <PageShell
      title="Calendar"
      subtitle={`Week ${weeks} · key dates & events`}
      action={<Button size="sm" onClick={() => setAddModal(true)}><Plus size={15} /> Add event</Button>}
    >
      <div className="space-y-5">
        {/* Month grid */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
            <button onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="text-stone-400 hover:text-stone-700">
              <ChevronLeft size={18} />
            </button>
            <p className="font-medium text-stone-700 text-sm">{format(viewDate, 'MMMM yyyy')}</p>
            <button onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="text-stone-400 hover:text-stone-700">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-stone-50">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-2 text-center text-xs text-stone-400 font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {/* Empty leading cells */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const events = eventsByDate.get(key) ?? []
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate === key
              const hasSpecial = events.some((e) => e.isSpecial)
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`h-10 flex flex-col items-center justify-center gap-0.5 relative transition-all ${isSelected ? 'bg-cream-200' : 'hover:bg-stone-50'}`}
                >
                  <span className={`text-sm leading-none ${isToday ? 'font-bold text-stone-800' : 'text-stone-600'}`}>{day.getDate()}</span>
                  {events.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-blush-400' : 'bg-periwinkle-300'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Selected date events */}
        {selectedDate && (
          <div>
            <p className="text-sm font-medium text-stone-600 mb-2">{formatDate(selectedDate)}</p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-stone-400">No events on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e) => (
                  <Card key={e.id} padding="sm" className="flex items-start gap-3">
                    <span className="text-base mt-0.5">
                      {e.type === 'birthday' ? '🎂' : e.type === 'milestone' ? '⭐' : e.type === 'appointment' ? '🩺' : '📌'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-stone-700">{e.title}</p>
                      {e.description && <p className="text-xs text-stone-400">{e.description}</p>}
                    </div>
                    {e.isSpecial && <Badge className="bg-blush-100 text-blush-600 ml-auto shrink-0">special</Badge>}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-stone-700 mb-3">Coming up (next 30 days)</h2>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 6).map((e) => {
                const daysUntil = differenceInDays(parseISO(e.date), new Date())
                return (
                  <Card key={e.id} padding="sm" className="flex items-center gap-3">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-base font-display text-stone-700">{daysUntil === 0 ? 'Today' : daysUntil}</p>
                      {daysUntil > 0 && <p className="text-xs text-stone-400">days</p>}
                    </div>
                    <div className="w-px h-8 bg-stone-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{e.title}</p>
                      <p className="text-xs text-stone-400">{format(parseISO(e.date), 'd MMM yyyy')}</p>
                    </div>
                    {e.isSpecial && <Star size={14} className="text-blush-400 shrink-0" />}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add an event">
        <div className="space-y-4">
          <Input label="Event name" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. First swimming class" />
          <Input label="Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Textarea label="Notes (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Any details…" />
          <Button fullWidth onClick={addCustomEvent}>Add to calendar</Button>
        </div>
      </Modal>
    </PageShell>
  )
}
