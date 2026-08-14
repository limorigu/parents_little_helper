import { useState, useRef } from 'react'
import { format, parseISO, addDays, addMonths, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Star, Camera, X, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getBabyAgeWeeks, uid, formatDate, normaliseQuotes } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { PageShell } from '../components/layout/PageShell'
import { RepositionControl } from '../components/media/RepositionControl'
import type { CelebrationPhoto } from '../store/useAppStore'

interface CalendarEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'milestone' | 'appointment' | 'custom' | 'birthday'
  isSpecial: boolean
}

function getAutoEvents(birthDate: string): CalendarEvent[] {
  if (!birthDate) return []
  const birth = parseISO(birthDate)
  const events: CalendarEvent[] = [
    { id: 'birth', date: birthDate, title: 'Birth day', description: 'The most important day.', type: 'birthday', isSpecial: true },
  ]
  for (let month = 1; month <= 12; month++) {
    const d = addMonths(birth, month)
    events.push({
      id: `month-${month}`,
      date: format(d, 'yyyy-MM-dd'),
      title: `${month} month${month > 1 ? 's' : ''} old!`,
      description: `${month}-month milestone.`,
      type: 'birthday',
      isSpecial: month % 3 === 0,
    })
  }
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
    type: 'milestone' as const,
    isSpecial: false,
  }))
  const doctorEvents: CalendarEvent[] = doctorVisits.map((v) => ({
    id: `dr-${v.id}`,
    date: v.date,
    title: v.type,
    description: v.notes,
    type: 'appointment' as const,
    isSpecial: false,
  }))
  return [...auto, ...milestoneEvents, ...doctorEvents]
}

// ─── Celebrate modal ─────────────────────────────────────────────────────────

function CelebrateModal({
  open,
  onClose,
  event,
  existing,
}: {
  open: boolean
  onClose: () => void
  event: CalendarEvent | null
  existing: CelebrationPhoto | undefined
}) {
  const { addCelebration, updateCelebration, deleteCelebration } = useAppStore()
  const [mediaUrl, setMediaUrl] = useState<string | null>(existing?.mediaUrl ?? null)
  const [mediaType, setMediaType] = useState<'photo' | 'video'>(existing?.mediaType ?? 'photo')
  const [note, setNote] = useState(existing?.note ?? '')
  const [focalX, setFocalX] = useState(existing?.focalX ?? 50)
  const [focalY, setFocalY] = useState(existing?.focalY ?? 50)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!event) return null

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setMediaUrl(ev.target?.result as string)
      setMediaType(file.type.startsWith('video') ? 'video' : 'photo')
      setFocalX(50)
      setFocalY(50)
    }
    reader.readAsDataURL(file)
  }

  function save() {
    if (!mediaUrl) return
    if (existing && existing.mediaUrl === mediaUrl) {
      // Same photo, just repositioned/re-captioned — update in place rather
      // than delete+recreate, so the entry keeps its id and capturedAt.
      updateCelebration(existing.id, { note: normaliseQuotes(note), focalX, focalY })
      onClose()
      return
    }
    if (existing) deleteCelebration(existing.id)
    addCelebration({
      id: uid(),
      eventId: event!.id,
      mediaUrl,
      mediaType,
      note: normaliseQuotes(note),
      capturedAt: new Date().toISOString(),
      focalX,
      focalY,
    })
    onClose()
  }

  function handleDelete() {
    if (existing) deleteCelebration(existing.id)
    setMediaUrl(null)
    setNote('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Celebrate: ${event.title}`}>
      <div className="space-y-4">
        <p className="text-sm text-stone-500">
          Capture this special moment with a photo or video — you'll treasure it forever.
        </p>

        {/* Media preview / upload zone */}
        {mediaUrl ? (
          <div className="relative">
            <RepositionControl
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              focalX={focalX}
              focalY={focalY}
              onChange={(x, y) => { setFocalX(x); setFocalY(y) }}
              heightClassName="max-h-64 h-64"
            />
            <button
              onClick={() => { setMediaUrl(null); setFocalX(50); setFocalY(50) }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-40 rounded-2xl border-2 border-dashed border-blush-200 bg-blush-50 flex flex-col items-center justify-center gap-2 text-blush-400 hover:border-blush-300 hover:text-blush-500 transition-all"
          >
            <Camera size={28} strokeWidth={1.5} />
            <p className="text-sm font-medium">Add a photo or video</p>
            <p className="text-xs">tap to choose from your library</p>
          </button>
        )}

        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />

        <Textarea
          label="Caption (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="A note to remember this moment…"
        />

        <div className="flex gap-3">
          {existing && (
            <button
              onClick={handleDelete}
              className="text-stone-400 hover:text-blush-500 transition-colors p-2"
              title="Remove photo"
            >
              <Trash2 size={16} />
            </button>
          )}
          <Button fullWidth onClick={save} disabled={!mediaUrl}>
            {existing ? 'Update photo' : 'Save celebration photo'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Calendar() {
  const { baby, celebrations, recordedMilestones } = useAppStore()
  const [viewDate, setViewDate] = useState(new Date())
  const [addModal, setAddModal] = useState(false)
  const [celebrateEvent, setCelebrateEvent] = useState<CalendarEvent | null>(null)
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
      { id: uid(), date: newDate, title: normaliseQuotes(newTitle.trim()), description: normaliseQuotes(newDesc.trim()), type: 'custom', isSpecial: false },
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

  function celebrationFor(eventId: string) {
    return celebrations.find((c) => c.eventId === eventId)
  }

  // A "celebration photo" can come from two places: the Calendar's own
  // Celebrate flow (a CelebrationPhoto, keyed by event id) for birthdays/
  // month markers, or — for milestone events — the photo already captured
  // when that milestone was recorded via the Milestone Recorder. Merge both
  // sources so anywhere on the calendar that shows "the photo for this day"
  // picks up either one automatically, without milestone events needing
  // their own separate Celebrate flow.
  function photoFor(e: CalendarEvent): { mediaUrl: string; mediaType: 'photo' | 'video'; note: string; focalX?: number; focalY?: number } | undefined {
    const celebration = celebrationFor(e.id)
    if (celebration) return celebration
    if (e.id.startsWith('rm-')) {
      const rm = recordedMilestones.find((r) => r.id === e.id.slice(3))
      if (rm?.mediaUrl) return { mediaUrl: rm.mediaUrl, mediaType: rm.mediaType ?? 'photo', note: rm.notes, focalX: rm.focalX, focalY: rm.focalY }
    }
    return undefined
  }

  const eventTypeIcon = (type: CalendarEvent['type']) =>
    type === 'birthday' ? '🎂' : type === 'milestone' ? '⭐' : type === 'appointment' ? '🩺' : '📌'

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
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const events = eventsByDate.get(key) ?? []
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate === key
              const hasSpecial = events.some((e) => e.isSpecial)
              const hasCelebration = events.some((e) => photoFor(e))
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`h-10 flex flex-col items-center justify-center gap-0.5 relative transition-all ${isSelected ? 'bg-cream-200' : 'hover:bg-stone-50'}`}
                >
                  <span className={`text-sm leading-none ${isToday ? 'font-bold text-stone-800' : 'text-stone-600'}`}>{day.getDate()}</span>
                  {events.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${hasCelebration ? 'bg-blush-500' : hasSpecial ? 'bg-blush-400' : 'bg-periwinkle-400'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Dot legend */}
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blush-500" /><span className="text-xs text-stone-400">photo saved</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blush-400" /><span className="text-xs text-stone-400">special day</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-periwinkle-400" /><span className="text-xs text-stone-400">event</span></div>
        </div>

        {/* Selected date events */}
        {selectedDate && (
          <div>
            <p className="text-sm font-medium text-stone-600 mb-2">{formatDate(selectedDate)}</p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-stone-400">No events on this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((e) => {
                  const photo = photoFor(e)
                  return (
                    <Card key={e.id} padding="sm" className={e.isSpecial ? 'border-blush-100' : ''}>
                      {/* Photo if saved */}
                      {photo && (
                        <div className="relative rounded-xl overflow-hidden mb-3 -mt-1">
                          {photo.mediaType === 'video' ? (
                            <video
                              src={photo.mediaUrl}
                              controls
                              className="w-full max-h-48 object-cover rounded-xl"
                              style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
                            />
                          ) : (
                            <img
                              src={photo.mediaUrl}
                              alt="celebration"
                              className="w-full max-h-48 object-cover rounded-xl"
                              style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
                            />
                          )}
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5">{eventTypeIcon(e.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-700">{e.title}</p>
                          {photo?.note
                            ? <p className="text-xs text-stone-500 mt-0.5 italic">"{photo.note}"</p>
                            : e.description
                            ? <p className="text-xs text-stone-400 mt-0.5">{e.description}</p>
                            : null}
                        </div>
                        {e.isSpecial && <Badge className="bg-blush-100 text-blush-600 shrink-0">special</Badge>}
                      </div>

                      {/* Celebrate CTA for special events */}
                      {e.isSpecial && (
                        <button
                          onClick={() => setCelebrateEvent(e)}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blush-50 border border-blush-100 text-blush-600 text-xs font-medium hover:bg-blush-100 transition-all"
                        >
                          <Camera size={13} />
                          {photo ? 'Update celebration photo' : 'Add a celebration photo'}
                        </button>
                      )}
                    </Card>
                  )
                })}
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
                const photo = photoFor(e)
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
                    {photo && (
                      <img
                        src={photo.mediaUrl}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                        style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
                      />
                    )}
                    {e.isSpecial && !photo && (
                      <button
                        onClick={() => { setSelectedDate(e.date.slice(0, 10)); setCelebrateEvent(e) }}
                        className="shrink-0 text-blush-400 hover:text-blush-600 transition-colors"
                        title="Add celebration photo"
                      >
                        <Camera size={16} />
                      </button>
                    )}
                    {e.isSpecial && <Star size={14} className="text-blush-300 shrink-0" />}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add event modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add an event">
        <div className="space-y-4">
          <Input label="Event name" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. First swimming class" />
          <Input label="Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Textarea label="Notes (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Any details…" />
          <Button fullWidth onClick={addCustomEvent}>Add to calendar</Button>
        </div>
      </Modal>

      {/* Celebrate modal */}
      <CelebrateModal
        open={!!celebrateEvent}
        onClose={() => setCelebrateEvent(null)}
        event={celebrateEvent}
        existing={celebrateEvent ? celebrationFor(celebrateEvent.id) : undefined}
      />
    </PageShell>
  )
}
