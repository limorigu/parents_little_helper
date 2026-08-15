import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, today, uid, toDateTimeInput, localDayKey, defaultEndFor, elapsedSince, getBabyAgeWeeks } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { SheetTable, SheetChip, type SheetColumn, type SheetRow } from '../components/ui/SheetTable'
import { PageShell } from '../components/layout/PageShell'
import { TrackerInsights } from '../components/tracker/TrackerInsights'
import { TodaySchedule } from '../components/tracker/TodaySchedule'
import { NextRecordCard } from '../components/tracker/NextRecordCard'
import { ECNudgeCard } from '../components/tracker/ECNudgeCard'
import { QuickLog } from '../components/dashboard/QuickLog'
import {
  getTimeBucket,
  computeGapStats,
  computeSessionGapStats,
  getExpectedGap,
  computeSequencesFrom,
  computeECStats,
  computeECTriggerStats,
  minutesSinceLastWake,
  minutesSinceLastFeed,
} from '../lib/insights'
import type { FeedEntry, SleepEntry, DiaperEntry, PlayEntry } from '../store/useAppStore'

const SHEET_COLUMNS: SheetColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'activity', label: 'Activity' },
  { key: 'start', label: 'Start Time' },
  { key: 'end', label: 'End Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'notes', label: 'Notes', expandable: true },
]

// Diaper tab only — the EC/potty column sits before Notes (rather than the
// shared SHEET_COLUMNS' trailing Notes), and the other tabs' rows simply omit
// the 'potty' key, which SheetTable renders as a blank cell.
const DIAPER_SHEET_COLUMNS: SheetColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'activity', label: 'Activity' },
  { key: 'start', label: 'Start Time' },
  { key: 'end', label: 'End Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'potty', label: 'Potty (EC)' },
  { key: 'notes', label: 'Notes', expandable: true },
]

type Tab = 'feed' | 'sleep' | 'diaper' | 'play' | 'insights'

const FEED_TYPES: Array<{ value: FeedEntry['type']; label: string; icon: string }> = [
  { value: 'breast-left', label: 'Left breast', icon: '🤱' },
  { value: 'breast-right', label: 'Right breast', icon: '🤱' },
  { value: 'breast-both', label: 'Both breasts', icon: '🤱' },
  { value: 'bottle-formula', label: 'Formula', icon: '🍼' },
  { value: 'bottle-pumped', label: 'Pumped milk', icon: '🍼' },
  { value: 'solid', label: 'Solid food', icon: '🥣' },
  { value: 'unspecified', label: 'Not sure yet', icon: '❓' },
]

const DIAPER_TYPES: Array<{ value: DiaperEntry['type']; label: string; icon: string }> = [
  { value: 'wet', label: 'Wet', icon: '💧' },
  { value: 'dirty', label: 'Dirty', icon: '💩' },
  { value: 'both', label: 'Both', icon: '🔄' },
  { value: 'clean', label: 'Clean (EC success)', icon: '✨' },
  { value: 'unknown', label: "Not sure", icon: '❓' },
]

// ── Feed modal ───────────────────────────────────────────────────────────────

function FeedModal({ open, onClose, editEntry }: { open: boolean; onClose: () => void; editEntry?: FeedEntry | null }) {
  const { addFeed, updateFeed } = useAppStore()
  const [type, setType] = useState<FeedEntry['type']>('breast-left')
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [time, setTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [end, setEnd] = useState('')
  const [endError, setEndError] = useState('')

  useEffect(() => {
    if (!open) return
    setEndError('')
    if (editEntry) {
      setType(editEntry.type)
      setDuration(editEntry.durationMinutes ? String(editEntry.durationMinutes) : '')
      setAmount(editEntry.amountMl ? String(editEntry.amountMl) : '')
      setNotes(editEntry.notes)
      setTime(toDateTimeInput(editEntry.date))
      setEnd(toDateTimeInput(editEntry.endTime))
    } else {
      setType('breast-left')
      setDuration('')
      setAmount('')
      setNotes('')
      setTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEnd('')
    }
  }, [open, editEntry])

  function save() {
    if (end && new Date(end).getTime() <= new Date(time).getTime()) {
      setEndError("End time can't be before the start time")
      return
    }
    setEndError('')
    // If the user gave an explicit end time but no manual duration, derive the
    // breastfeeding duration from the gap rather than leaving it blank.
    const derivedDuration =
      end && !duration ? Math.round((new Date(end).getTime() - new Date(time).getTime()) / 60_000) : null
    const fields = {
      date: time,
      endTime: end || null,
      type,
      durationMinutes: duration ? Number(duration) : type.startsWith('breast') ? derivedDuration : null,
      amountMl: amount ? Number(amount) : null,
      notes,
    }
    if (editEntry) {
      updateFeed(editEntry.id, fields)
    } else {
      addFeed({ id: uid(), ...fields })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit feed' : 'Log a feed'}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-stone-600 mb-2">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {FEED_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setType(ft.value)}
                className={`p-3 rounded-xl border text-sm text-left transition-all ${type === ft.value ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
              >
                <span className="mr-1">{ft.icon}</span> {ft.label}
              </button>
            ))}
          </div>
        </div>
        <Input label="Start time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        <Input
          label="End time (optional)"
          type="datetime-local"
          value={end}
          onFocus={() => { if (!end) setEnd(defaultEndFor(time)) }}
          onChange={(e) => { setEnd(e.target.value); setEndError('') }}
          error={endError}
        />
        {type.startsWith('breast') ? (
          <Input label="Duration (minutes, optional)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 12 — or just set an end time above" />
        ) : (
          <Input label="Amount (ml)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 90" />
        )}
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any observations…" />
        <Button fullWidth onClick={save}>{editEntry ? 'Save changes' : 'Save feed'}</Button>
      </div>
    </Modal>
  )
}

// ── Sleep modal ──────────────────────────────────────────────────────────────

function SleepModal({
  open,
  onClose,
  active,
  editEntry,
}: {
  open: boolean
  onClose: () => void
  active: SleepEntry | null
  editEntry?: SleepEntry | null
}) {
  const { addSleep, updateSleep } = useAppStore()
  const [type, setType] = useState<SleepEntry['type']>('nap')
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [endError, setEndError] = useState('')

  useEffect(() => {
    if (!open) return
    setEndError('')
    if (editEntry) {
      setType(editEntry.type)
      setStart(toDateTimeInput(editEntry.startTime))
      setEnd(toDateTimeInput(editEntry.endTime))
      setLocation(editEntry.location)
      setNotes(editEntry.notes)
    } else if (active) {
      setEnd('')
    } else {
      setType('nap')
      setStart(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEnd('')
      setLocation('')
      setNotes('')
    }
  }, [open, editEntry, active])

  function save() {
    const startTime = active && !editEntry ? active.startTime : start
    if (end && new Date(end).getTime() <= new Date(startTime).getTime()) {
      setEndError("End time can't be before the start time")
      return
    }
    setEndError('')
    if (editEntry) {
      updateSleep(editEntry.id, { startTime: start, endTime: end || null, type, location, notes })
    } else if (active) {
      updateSleep(active.id, { endTime: end || null })
    } else {
      addSleep({ id: uid(), startTime: start, endTime: end || null, type, location, notes })
    }
    onClose()
  }

  const showFullForm = !active || Boolean(editEntry)

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit sleep' : active ? 'End sleep session' : 'Log sleep'}>
      <div className="space-y-4">
        {showFullForm && (
          <>
            <div className="flex gap-2">
              {(['night', 'nap', 'unspecified'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${type === t ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
                >
                  {t === 'night' ? '🌙 Night sleep' : t === 'nap' ? '☀️ Nap' : '❓ Not sure yet'}
                </button>
              ))}
            </div>
            <Input label="Start time" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input label="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. cot, pram, arms" />
          </>
        )}
        <Input
          label={active && !editEntry ? 'End time' : 'End time (optional — leave blank if still sleeping)'}
          type="datetime-local"
          value={end}
          onFocus={() => { if (!end) setEnd(defaultEndFor(active && !editEntry ? active.startTime : start)) }}
          onChange={(e) => { setEnd(e.target.value); setEndError('') }}
          error={endError}
        />
        {showFullForm && (
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any observations…" />
        )}
        <Button fullWidth onClick={save}>{editEntry ? 'Save changes' : active ? 'End session' : 'Save sleep'}</Button>
      </div>
    </Modal>
  )
}

// ── Diaper modal ─────────────────────────────────────────────────────────────

const POTTY_OPTIONS: Array<{ value: NonNullable<DiaperEntry['pottyResult']>; label: string; icon: string }> = [
  { value: 'pee', label: 'Pee', icon: '💧' },
  { value: 'poop', label: 'Poop', icon: '💩' },
  { value: 'both', label: 'Both', icon: '🔄' },
]

function DiaperModal({ open, onClose, editEntry }: { open: boolean; onClose: () => void; editEntry?: DiaperEntry | null }) {
  const { addDiaper, updateDiaper } = useAppStore()
  const [dtype, setDtype] = useState<DiaperEntry['type']>('wet')
  const [time, setTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [endError, setEndError] = useState('')
  const [pottyResult, setPottyResult] = useState<DiaperEntry['pottyResult']>(undefined)

  useEffect(() => {
    if (!open) return
    setEndError('')
    if (editEntry) {
      setDtype(editEntry.type)
      setTime(toDateTimeInput(editEntry.startTime))
      setEnd(toDateTimeInput(editEntry.endTime))
      setNotes(editEntry.notes)
      setPottyResult(editEntry.pottyResult)
    } else {
      setDtype('wet')
      setTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEnd('')
      setNotes('')
      setPottyResult(undefined)
    }
  }, [open, editEntry])

  function save() {
    if (end && new Date(end).getTime() <= new Date(time).getTime()) {
      setEndError("End time can't be before the start time")
      return
    }
    setEndError('')
    if (editEntry) {
      updateDiaper(editEntry.id, { startTime: time, endTime: end || null, type: dtype, notes, pottyResult })
    } else {
      addDiaper({ id: uid(), startTime: time, endTime: end || null, type: dtype, notes, pottyResult })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit nappy change' : 'Log a nappy change'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {DIAPER_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => setDtype(dt.value)}
              className={`p-3 rounded-xl border text-sm text-left transition-all ${dtype === dt.value ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
            >
              <span className="mr-1">{dt.icon}</span> {dt.label}
            </button>
          ))}
        </div>
        <Input label="Time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        <Input
          label="End time (optional)"
          type="datetime-local"
          value={end}
          onFocus={() => { if (!end) setEnd(defaultEndFor(time)) }}
          onChange={(e) => { setEnd(e.target.value); setEndError('') }}
          error={endError}
        />
        <div>
          <p className="text-sm font-medium text-stone-600 mb-2">Went in the potty too? (elimination communication — optional)</p>
          <div className="grid grid-cols-3 gap-2">
            {POTTY_OPTIONS.map((po) => (
              <button
                key={po.value}
                onClick={() => setPottyResult((cur) => (cur === po.value ? undefined : po.value))}
                className={`p-2 rounded-xl border text-sm text-center transition-all ${pottyResult === po.value ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
              >
                <span className="mr-1">{po.icon}</span> {po.label}
              </button>
            ))}
          </div>
        </div>
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Colour, rash, anything notable…" />
        <Button fullWidth onClick={save}>{editEntry ? 'Save changes' : 'Save nappy change'}</Button>
      </div>
    </Modal>
  )
}

// ── Play modal ───────────────────────────────────────────────────────────────

function PlayModal({ open, onClose, editEntry }: { open: boolean; onClose: () => void; editEntry?: PlayEntry | null }) {
  const { addPlay, updatePlay } = useAppStore()
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [endError, setEndError] = useState('')

  useEffect(() => {
    if (!open) return
    setEndError('')
    if (editEntry) {
      setStart(toDateTimeInput(editEntry.startTime))
      setEnd(toDateTimeInput(editEntry.endTime))
      setNotes(editEntry.notes)
    } else {
      setStart(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEnd('')
      setNotes('')
    }
  }, [open, editEntry])

  function save() {
    if (end && new Date(end).getTime() <= new Date(start).getTime()) {
      setEndError("End time can't be before the start time")
      return
    }
    setEndError('')
    if (editEntry) {
      updatePlay(editEntry.id, { startTime: start, endTime: end || null, notes })
    } else {
      addPlay({ id: uid(), startTime: start, endTime: end || null, notes })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit play session' : 'Log play'}>
      <div className="space-y-4">
        <Input label="Start time" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input
          label="End time (optional)"
          type="datetime-local"
          value={end}
          onFocus={() => { if (!end) setEnd(defaultEndFor(start)) }}
          onChange={(e) => { setEnd(e.target.value); setEndError('') }}
          error={endError}
        />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What did you get up to?" />
        <Button fullWidth onClick={save}>{editEntry ? 'Save changes' : 'Save play session'}</Button>
      </div>
    </Modal>
  )
}

// ── Shared label maps ─────────────────────────────────────────────────────────

const FEED_LABELS: Record<string, string> = {
  'breast-left': '🤱 Left',
  'breast-right': '🤱 Right',
  'breast-both': '🤱 Both',
  'bottle-formula': '🍼 Formula',
  'bottle-pumped': '🍼 Pumped',
  solid: '🥣 Solid',
  unspecified: '❓ Not sure yet',
}

const POTTY_LABELS: Record<NonNullable<DiaperEntry['pottyResult']>, string> = {
  pee: '💧 Pee',
  poop: '💩 Poop',
  both: '🔄 Both',
}

const DIAPER_LABELS: Record<DiaperEntry['type'], string> = {
  wet: '💧 Wet',
  dirty: '💩 Dirty',
  both: '🔄 Both',
  clean: '✨ Clean',
  unknown: '❓ Unknown',
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Tracker() {
  const { feeds, sleep, diaper, play, baby, activeFeedId, deleteFeed, deleteSleep, deleteDiaper, deletePlay } = useAppStore()
  const [tab, setTab] = useState<Tab>('feed')
  const [feedModal, setFeedModal] = useState(false)
  const [sleepModal, setSleepModal] = useState(false)
  const [diaperModal, setDiaperModal] = useState(false)
  const [playModal, setPlayModal] = useState(false)
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null)
  const [editFeed, setEditFeed] = useState<FeedEntry | null>(null)
  const [editSleepEntry, setEditSleepEntry] = useState<SleepEntry | null>(null)
  const [editDiaperEntry, setEditDiaperEntry] = useState<DiaperEntry | null>(null)
  const [editPlayEntry, setEditPlayEntry] = useState<PlayEntry | null>(null)

  function openEditFeed(id: string) {
    const entry = feeds.find((f) => f.id === id)
    if (entry) {
      setEditFeed(entry)
      setFeedModal(true)
    }
  }

  function openEditSleep(id: string) {
    const entry = sleep.find((s) => s.id === id)
    if (entry) {
      setActiveSleep(null)
      setEditSleepEntry(entry)
      setSleepModal(true)
    }
  }

  function openEditDiaper(id: string) {
    const entry = diaper.find((d) => d.id === id)
    if (entry) {
      setEditDiaperEntry(entry)
      setDiaperModal(true)
    }
  }

  function openEditPlay(id: string) {
    const entry = play.find((p) => p.id === id)
    if (entry) {
      setEditPlayEntry(entry)
      setPlayModal(true)
    }
  }

  const todayStr = today()
  const recent = subDays(new Date(), 3)

  const recentFeeds = feeds
    .filter((f) => new Date(f.date) >= recent)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const recentSleep = sleep
    .filter((s) => new Date(s.startTime) >= recent)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const recentDiaper = diaper
    .filter((d) => new Date(d.startTime) >= recent)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const recentPlay = play
    .filter((p) => new Date(p.startTime) >= recent)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const todayFeeds = feeds.filter((f) => localDayKey(f.date) === todayStr)
  const todayDiapers = diaper.filter((d) => localDayKey(d.startTime) === todayStr)

  // "In progress" sessions — same reasoning as QuickLog on the Dashboard: if
  // more than one entry is somehow left open, prefer whichever started most
  // recently rather than array order. Surfacing these here (rather than only
  // as a ticking dashboard tile) is what makes it obvious *how* to close a
  // session with a specific, manually-entered end time — tap the card below,
  // not "Log a new one".
  const activeFeed = activeFeedId ? feeds.find((f) => f.id === activeFeedId && !f.endTime) ?? null : null
  const activeSleepSession = sleep
    .filter((s) => !s.endTime)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] ?? null
  const activePlaySession = play
    .filter((p) => !p.endTime)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] ?? null

  const subtitleParts = [
    todayFeeds.length ? `${todayFeeds.length} feed${todayFeeds.length !== 1 ? 's' : ''}` : null,
    todayDiapers.length ? `${todayDiapers.length} nappy${todayDiapers.length !== 1 ? ' changes' : ' change'}` : null,
  ].filter(Boolean)

  // "Next record" estimates — own historical gaps (bucketed by time of day) plus,
  // where this app actually has a research-backed reference (Feed, Sleep), an
  // age-banded literature range. Nappy/Play are shown with an explicit "no
  // benchmark available" note rather than a fabricated one.
  const weeks = getBabyAgeWeeks(baby.birthDate)
  const nowBucket = getTimeBucket(new Date().getHours())

  const feedGapStats = useMemo(() => computeGapStats(feeds.map((f) => parseISO(f.date))), [feeds])
  const diaperGapStats = useMemo(() => computeGapStats(diaper.map((d) => parseISO(d.startTime))), [diaper])
  const sleepGapStats = useMemo(() => computeSessionGapStats(sleep), [sleep])
  const playGapStats = useMemo(() => computeSessionGapStats(play), [play])

  const expectedFeedGap = useMemo(() => getExpectedGap('Feed', weeks), [weeks])
  const expectedSleepGap = useMemo(() => getExpectedGap('Sleep', weeks), [weeks])
  const expectedNappyGap = useMemo(() => getExpectedGap('Nappy', weeks), [weeks])
  const expectedPlayGap = useMemo(() => getExpectedGap('Play', weeks), [weeks])

  const feedSequenceHint = useMemo(() => computeSequencesFrom(feeds, sleep, diaper, play, 'Feed')[nowBucket], [feeds, sleep, diaper, play, nowBucket])
  const sleepSequenceHint = useMemo(() => computeSequencesFrom(feeds, sleep, diaper, play, 'Sleep')[nowBucket], [feeds, sleep, diaper, play, nowBucket])
  const nappySequenceHint = useMemo(() => computeSequencesFrom(feeds, sleep, diaper, play, 'Nappy')[nowBucket], [feeds, sleep, diaper, play, nowBucket])
  const playSequenceHint = useMemo(() => computeSequencesFrom(feeds, sleep, diaper, play, 'Play')[nowBucket], [feeds, sleep, diaper, play, nowBucket])

  // EC (elimination communication) nudges — only surfaced once a household has
  // actually logged at least one potty catch/attempt, so non-EC households
  // never see it.
  const practicesEC = useMemo(() => diaper.some((d) => d.pottyResult), [diaper])
  const peeStats = useMemo(() => computeECStats(diaper, 'pee'), [diaper])
  const poopStats = useMemo(() => computeECStats(diaper, 'poop'), [diaper])
  const peeTriggerStats = useMemo(() => computeECTriggerStats(diaper, sleep, feeds, 'pee'), [diaper, sleep, feeds])
  const poopTriggerStats = useMemo(() => computeECTriggerStats(diaper, sleep, feeds, 'poop'), [diaper, sleep, feeds])
  const sinceWakeMinutes = minutesSinceLastWake(sleep)
  const sinceFeedMinutes = minutesSinceLastFeed(feeds)

  return (
    <PageShell
      title="Tracker"
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') + ' today' : 'Nothing logged yet today'}
    >
      <div className="space-y-4">
        <TodaySchedule feeds={feeds} sleep={sleep} diaper={diaper} play={play} birthDate={baby.birthDate} />

        {/* One-tap logging — same tiles as the Dashboard, so a quick log
            doesn't require leaving the Tracker to go find them. */}
        <QuickLog />

        {/* Tab switcher */}
        <div className="flex bg-stone-100 rounded-2xl p-1 overflow-x-auto">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === 'feed' ? 'bg-cream-50 text-stone-800 ring-2 ring-inset ring-stone-800' : 'text-stone-500'}`}
          >
            🍼 Feeding
          </button>
          <button
            onClick={() => setTab('sleep')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === 'sleep' ? 'bg-cream-50 text-stone-800 ring-2 ring-inset ring-stone-800' : 'text-stone-500'}`}
          >
            🌙 Sleep
          </button>
          <button
            onClick={() => setTab('diaper')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === 'diaper' ? 'bg-cream-50 text-stone-800 ring-2 ring-inset ring-stone-800' : 'text-stone-500'}`}
          >
            🧷 Nappy
          </button>
          <button
            onClick={() => setTab('play')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === 'play' ? 'bg-cream-50 text-stone-800 ring-2 ring-inset ring-stone-800' : 'text-stone-500'}`}
          >
            🧸 Play
          </button>
          <button
            onClick={() => setTab('insights')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === 'insights' ? 'bg-cream-50 text-stone-800 ring-2 ring-inset ring-stone-800' : 'text-stone-500'}`}
          >
            📊 Insights
          </button>
        </div>

        {/* Feed tab */}
        {tab === 'feed' && (
          <div className="space-y-3">
            {activeFeed && (
              <Card className="bg-marigold-50 border-marigold-200">
                <p className="text-sm font-medium text-marigold-700 mb-1">
                  🍼 Feed in progress · {elapsedSince(activeFeed.date)}
                </p>
                <p className="text-xs text-marigold-600 mb-3">
                  Started {formatTime(activeFeed.date)} — set a manual end time here to close it out
                  (retroactively, if you like) without waiting on the clock.
                </p>
                <Button variant="secondary" size="sm" onClick={() => openEditFeed(activeFeed.id)}>
                  End this feed
                </Button>
              </Card>
            )}
            <Button fullWidth onClick={() => { setEditFeed(null); setFeedModal(true) }}>
              <Plus size={15} /> Log a feed
            </Button>
            <NextRecordCard
              activityType="Feed"
              label="feed"
              gapStats={feedGapStats}
              expected={expectedFeedGap}
              sequenceHint={feedSequenceHint}
              nowBucket={nowBucket}
            />
            {recentFeeds.length === 0 ? (
              <EmptyState icon="🍼" title="No feeds logged yet" description="Tap 'Log a feed' to start tracking." />
            ) : (
              <SheetTable
                columns={SHEET_COLUMNS}
                onEditRow={openEditFeed}
                onDeleteRow={deleteFeed}
                rows={recentFeeds.map<SheetRow>((f) => ({
                  id: f.id,
                  cells: {
                    date: format(parseISO(f.date), 'd MMM'),
                    activity: <SheetChip label={FEED_LABELS[f.type]} color="sage" />,
                    start: formatTime(f.date),
                    end: f.endTime ? formatTime(f.endTime) : '—',
                    duration: f.durationMinutes ? `${f.durationMinutes} min` : f.amountMl ? `${f.amountMl}ml` : '—',
                    notes: f.notes || '—',
                  },
                }))}
              />
            )}
          </div>
        )}

        {/* Sleep tab */}
        {tab === 'sleep' && (
          <div className="space-y-3">
            {activeSleepSession && (
              <Card className="bg-periwinkle-50 border-periwinkle-200">
                <p className="text-sm font-medium text-periwinkle-700 mb-1">
                  {activeSleepSession.type === 'night' ? '🌙 Night sleep' : activeSleepSession.type === 'nap' ? '☀️ Nap' : '❓ Sleep'} in progress · {elapsedSince(activeSleepSession.startTime)}
                </p>
                <p className="text-xs text-periwinkle-500 mb-3">
                  Started {formatTime(activeSleepSession.startTime)} — set a manual end time here to close it
                  out, or use "Log sleep" below to add a different, unrelated entry.
                </p>
                <Button variant="secondary" size="sm" onClick={() => { setEditSleepEntry(null); setActiveSleep(activeSleepSession); setSleepModal(true) }}>
                  End session
                </Button>
              </Card>
            )}
            <Button fullWidth onClick={() => { setEditSleepEntry(null); setActiveSleep(null); setSleepModal(true) }}>
              <Plus size={15} /> Log sleep
            </Button>
            <NextRecordCard
              activityType="Sleep"
              label="sleep"
              gapStats={sleepGapStats}
              expected={expectedSleepGap}
              sequenceHint={sleepSequenceHint}
              nowBucket={nowBucket}
            />
            {recentSleep.length === 0 ? (
              <EmptyState icon="🌙" title="No sleep logged yet" description="Tap 'Log sleep' to start tracking." />
            ) : (
              <SheetTable
                columns={SHEET_COLUMNS}
                onEditRow={openEditSleep}
                onDeleteRow={deleteSleep}
                rows={recentSleep.map<SheetRow>((s) => {
                  const mins = s.endTime
                    ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000)
                    : null
                  return {
                    id: s.id,
                    cells: {
                      date: format(parseISO(s.startTime), 'd MMM'),
                      activity: <SheetChip label={s.type === 'night' ? '🌙 Night' : s.type === 'nap' ? '☀️ Nap' : '❓ Not sure yet'} color="marigold" />,
                      start: formatTime(s.startTime),
                      end: s.endTime ? formatTime(s.endTime) : 'In progress',
                      duration: mins !== null ? (mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`) : '—',
                      notes: s.location || '—',
                    },
                  }
                })}
              />
            )}
          </div>
        )}

        {/* Diaper tab */}
        {tab === 'diaper' && (
          <div className="space-y-3">
            <Button fullWidth onClick={() => { setEditDiaperEntry(null); setDiaperModal(true) }}>
              <Plus size={15} /> Log nappy change
            </Button>
            <NextRecordCard
              activityType="Nappy"
              label="nappy change"
              gapStats={diaperGapStats}
              expected={expectedNappyGap}
              sequenceHint={nappySequenceHint}
              nowBucket={nowBucket}
            />
            {practicesEC && (
              <>
                <ECNudgeCard
                  outcome="pee"
                  ecStats={peeStats}
                  triggerStats={peeTriggerStats}
                  minutesSinceWake={sinceWakeMinutes}
                  minutesSinceFeed={sinceFeedMinutes}
                  nowBucket={nowBucket}
                />
                <ECNudgeCard
                  outcome="poop"
                  ecStats={poopStats}
                  triggerStats={poopTriggerStats}
                  minutesSinceWake={sinceWakeMinutes}
                  minutesSinceFeed={sinceFeedMinutes}
                  nowBucket={nowBucket}
                />
              </>
            )}
            {recentDiaper.length === 0 ? (
              <EmptyState icon="🧷" title="No nappy changes logged yet" description="Tap above to start tracking." />
            ) : (
              <SheetTable
                columns={DIAPER_SHEET_COLUMNS}
                onEditRow={openEditDiaper}
                onDeleteRow={deleteDiaper}
                rows={recentDiaper.map<SheetRow>((d) => {
                  const mins = d.endTime
                    ? Math.round((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 60_000)
                    : null
                  return {
                    id: d.id,
                    cells: {
                      date: format(parseISO(d.startTime), 'd MMM'),
                      activity: <SheetChip label={DIAPER_LABELS[d.type]} color="blush" />,
                      start: formatTime(d.startTime),
                      end: d.endTime ? formatTime(d.endTime) : '—',
                      duration: mins ? (mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`) : '—',
                      potty: d.pottyResult ? <SheetChip label={POTTY_LABELS[d.pottyResult]} color="periwinkle" /> : '—',
                      notes: d.notes || '—',
                    },
                  }
                })}
              />
            )}
          </div>
        )}

        {/* Play tab */}
        {tab === 'play' && (
          <div className="space-y-3">
            {activePlaySession && (
              <Card className="bg-sage-50 border-sage-200">
                <p className="text-sm font-medium text-sage-700 mb-1">
                  🧸 Play in progress · {elapsedSince(activePlaySession.startTime)}
                </p>
                <p className="text-xs text-sage-600 mb-3">
                  Started {formatTime(activePlaySession.startTime)} — set a manual end time here to close it out.
                </p>
                <Button variant="secondary" size="sm" onClick={() => openEditPlay(activePlaySession.id)}>
                  End this play session
                </Button>
              </Card>
            )}
            <Button fullWidth onClick={() => { setEditPlayEntry(null); setPlayModal(true) }}>
              <Plus size={15} /> Log play
            </Button>
            <NextRecordCard
              activityType="Play"
              label="play session"
              gapStats={playGapStats}
              expected={expectedPlayGap}
              sequenceHint={playSequenceHint}
              nowBucket={nowBucket}
            />
            {recentPlay.length === 0 ? (
              <EmptyState icon="🧸" title="No play sessions logged yet" description="Tap 'Log play' to start tracking." />
            ) : (
              <SheetTable
                columns={SHEET_COLUMNS}
                onEditRow={openEditPlay}
                onDeleteRow={deletePlay}
                rows={recentPlay.map<SheetRow>((p) => {
                  const mins = p.endTime
                    ? Math.round((new Date(p.endTime).getTime() - new Date(p.startTime).getTime()) / 60_000)
                    : null
                  return {
                    id: p.id,
                    cells: {
                      date: format(parseISO(p.startTime), 'd MMM'),
                      activity: <SheetChip label="🧸 Play" color="periwinkle" />,
                      start: formatTime(p.startTime),
                      end: p.endTime ? formatTime(p.endTime) : '—',
                      duration: mins !== null ? (mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`) : '—',
                      notes: p.notes || '—',
                    },
                  }
                })}
              />
            )}
          </div>
        )}

        {/* Insights tab */}
        {tab === 'insights' && <TrackerInsights />}
      </div>

      <FeedModal
        open={feedModal}
        onClose={() => { setFeedModal(false); setEditFeed(null) }}
        editEntry={editFeed}
      />
      <SleepModal
        open={sleepModal}
        onClose={() => { setSleepModal(false); setActiveSleep(null); setEditSleepEntry(null) }}
        active={activeSleep}
        editEntry={editSleepEntry}
      />
      <DiaperModal
        open={diaperModal}
        onClose={() => { setDiaperModal(false); setEditDiaperEntry(null) }}
        editEntry={editDiaperEntry}
      />
      <PlayModal
        open={playModal}
        onClose={() => { setPlayModal(false); setEditPlayEntry(null) }}
        editEntry={editPlayEntry}
      />
    </PageShell>
  )
}
