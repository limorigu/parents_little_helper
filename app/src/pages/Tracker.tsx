import { useEffect, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, today, uid } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { SheetTable, SheetChip, type SheetColumn, type SheetRow } from '../components/ui/SheetTable'
import { PageShell } from '../components/layout/PageShell'
import type { FeedEntry, SleepEntry, DiaperEntry, PlayEntry } from '../store/useAppStore'

const SHEET_COLUMNS: SheetColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'activity', label: 'Activity' },
  { key: 'start', label: 'Start Time' },
  { key: 'end', label: 'End Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'notes', label: 'Notes' },
]

type Tab = 'feed' | 'sleep' | 'diaper' | 'play'

const FEED_TYPES: Array<{ value: FeedEntry['type']; label: string; icon: string }> = [
  { value: 'breast-left', label: 'Left breast', icon: '🤱' },
  { value: 'breast-right', label: 'Right breast', icon: '🤱' },
  { value: 'bottle-formula', label: 'Formula', icon: '🍼' },
  { value: 'bottle-pumped', label: 'Pumped milk', icon: '🍼' },
  { value: 'solid', label: 'Solid food', icon: '🥣' },
]

const DIAPER_TYPES: Array<{ value: DiaperEntry['type']; label: string; icon: string }> = [
  { value: 'wet', label: 'Wet', icon: '💧' },
  { value: 'dirty', label: 'Dirty', icon: '💩' },
  { value: 'both', label: 'Both', icon: '🔄' },
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

  useEffect(() => {
    if (!open) return
    if (editEntry) {
      setType(editEntry.type)
      setDuration(editEntry.durationMinutes ? String(editEntry.durationMinutes) : '')
      setAmount(editEntry.amountMl ? String(editEntry.amountMl) : '')
      setNotes(editEntry.notes)
      setTime(editEntry.date)
    } else {
      setType('breast-left')
      setDuration('')
      setAmount('')
      setNotes('')
      setTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    }
  }, [open, editEntry])

  function save() {
    const fields = {
      date: time,
      type,
      durationMinutes: duration ? Number(duration) : null,
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
        <Input label="Time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        {type.startsWith('breast') ? (
          <Input label="Duration (minutes)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 12" />
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
  const [type, setType] = useState<'night' | 'nap'>('nap')
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
      setStart(editEntry.startTime)
      setEnd(editEntry.endTime || '')
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
              {(['night', 'nap'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${type === t ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
                >
                  {t === 'night' ? '🌙 Night sleep' : '☀️ Nap'}
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

function DiaperModal({ open, onClose, editEntry }: { open: boolean; onClose: () => void; editEntry?: DiaperEntry | null }) {
  const { addDiaper, updateDiaper } = useAppStore()
  const [dtype, setDtype] = useState<DiaperEntry['type']>('wet')
  const [time, setTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (editEntry) {
      setDtype(editEntry.type)
      setTime(editEntry.startTime)
      setNotes(editEntry.notes)
    } else {
      setDtype('wet')
      setTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setNotes('')
    }
  }, [open, editEntry])

  function save() {
    if (editEntry) {
      updateDiaper(editEntry.id, { startTime: time, type: dtype, notes })
    } else {
      addDiaper({ id: uid(), startTime: time, endTime: null, type: dtype, notes })
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
      setStart(editEntry.startTime)
      setEnd(editEntry.endTime || '')
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
  'bottle-formula': '🍼 Formula',
  'bottle-pumped': '🍼 Pumped',
  solid: '🥣 Solid',
}

const DIAPER_LABELS: Record<DiaperEntry['type'], string> = {
  wet: '💧 Wet',
  dirty: '💩 Dirty',
  both: '🔄 Both',
  unknown: '❓ Unknown',
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Tracker() {
  const { feeds, sleep, diaper, play, deleteFeed, deleteSleep, deleteDiaper, deletePlay } = useAppStore()
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

  const todayFeeds = feeds.filter((f) => f.date.startsWith(todayStr))
  const todayDiapers = diaper.filter((d) => d.startTime.startsWith(todayStr))
  const activeSleepSession = sleep.find((s) => !s.endTime)

  const subtitleParts = [
    todayFeeds.length ? `${todayFeeds.length} feed${todayFeeds.length !== 1 ? 's' : ''}` : null,
    todayDiapers.length ? `${todayDiapers.length} nappy${todayDiapers.length !== 1 ? ' changes' : ' change'}` : null,
  ].filter(Boolean)

  return (
    <PageShell
      title="Tracker"
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') + ' today' : 'Nothing logged yet today'}
    >
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex bg-stone-100 rounded-2xl p-1">
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'feed' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            🍼 Feeding
          </button>
          <button
            onClick={() => setTab('sleep')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'sleep' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            🌙 Sleep
          </button>
          <button
            onClick={() => setTab('diaper')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'diaper' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            🧷 Nappy
          </button>
          <button
            onClick={() => setTab('play')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'play' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            🧸 Play
          </button>
        </div>

        {/* Feed tab */}
        {tab === 'feed' && (
          <div className="space-y-3">
            <Button fullWidth onClick={() => { setEditFeed(null); setFeedModal(true) }}>
              <Plus size={15} /> Log a feed
            </Button>
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
                    end: '—',
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
            {activeSleepSession ? (
              <Card className="bg-periwinkle-50 border-periwinkle-200">
                <p className="text-sm font-medium text-periwinkle-700 mb-1">
                  {activeSleepSession.type === 'night' ? '🌙 Night sleep' : '☀️ Nap'} in progress
                </p>
                <p className="text-xs text-periwinkle-500 mb-3">
                  Started {formatTime(activeSleepSession.startTime)}
                </p>
                <Button variant="secondary" size="sm" onClick={() => { setEditSleepEntry(null); setActiveSleep(activeSleepSession); setSleepModal(true) }}>
                  End session
                </Button>
              </Card>
            ) : (
              <Button fullWidth onClick={() => { setEditSleepEntry(null); setActiveSleep(null); setSleepModal(true) }}>
                <Plus size={15} /> Log sleep
              </Button>
            )}
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
                      activity: <SheetChip label={s.type === 'night' ? '🌙 Night' : '☀️ Nap'} color="marigold" />,
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
            {recentDiaper.length === 0 ? (
              <EmptyState icon="🧷" title="No nappy changes logged yet" description="Tap above to start tracking." />
            ) : (
              <SheetTable
                columns={SHEET_COLUMNS}
                onEditRow={openEditDiaper}
                onDeleteRow={deleteDiaper}
                rows={recentDiaper.map<SheetRow>((d) => ({
                  id: d.id,
                  cells: {
                    date: format(parseISO(d.startTime), 'd MMM'),
                    activity: <SheetChip label={DIAPER_LABELS[d.type]} color="blush" />,
                    start: formatTime(d.startTime),
                    end: '—',
                    duration: '—',
                    notes: d.notes || '—',
                  },
                }))}
              />
            )}
          </div>
        )}

        {/* Play tab */}
        {tab === 'play' && (
          <div className="space-y-3">
            <Button fullWidth onClick={() => { setEditPlayEntry(null); setPlayModal(true) }}>
              <Plus size={15} /> Log play
            </Button>
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
