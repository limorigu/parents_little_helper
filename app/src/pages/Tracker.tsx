import { useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { uid, today, formatTime } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'
import type { FeedEntry, SleepEntry, DiaperEntry } from '../store/useAppStore'

type Tab = 'feed' | 'sleep' | 'diaper'

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

function FeedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addFeed } = useAppStore()
  const [type, setType] = useState<FeedEntry['type']>('breast-left')
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [time, setTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  function save() {
    addFeed({
      id: uid(),
      date: time,
      type,
      durationMinutes: duration ? Number(duration) : null,
      amountMl: amount ? Number(amount) : null,
      notes,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a feed">
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
        <Button fullWidth onClick={save}>Save feed</Button>
      </div>
    </Modal>
  )
}

// ── Sleep modal ──────────────────────────────────────────────────────────────

function SleepModal({ open, onClose, active }: { open: boolean; onClose: () => void; active: SleepEntry | null }) {
  const { addSleep, updateSleep } = useAppStore()
  const [type, setType] = useState<'night' | 'nap'>('nap')
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  function save() {
    if (active) {
      updateSleep(active.id, { endTime: end || null })
    } else {
      addSleep({ id: uid(), startTime: start, endTime: end || null, type, location, notes })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={active ? 'End sleep session' : 'Log sleep'}>
      <div className="space-y-4">
        {!active && (
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
          label={active ? 'End time' : 'End time (optional — leave blank if still sleeping)'}
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        {!active && (
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any observations…" />
        )}
        <Button fullWidth onClick={save}>{active ? 'End session' : 'Save sleep'}</Button>
      </div>
    </Modal>
  )
}

// ── Diaper modal ─────────────────────────────────────────────────────────────

function DiaperModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addDiaper } = useAppStore()
  const [dtype, setDtype] = useState<DiaperEntry['type']>('wet')
  const [time, setTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [notes, setNotes] = useState('')

  function save() {
    addDiaper({ id: uid(), startTime: time, endTime: null, type: dtype, notes })
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a nappy change">
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
        <Button fullWidth onClick={save}>Save nappy change</Button>
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
  const { feeds, sleep, diaper, deleteFeed, deleteSleep, deleteDiaper } = useAppStore()
  const [tab, setTab] = useState<Tab>('feed')
  const [feedModal, setFeedModal] = useState(false)
  const [sleepModal, setSleepModal] = useState(false)
  const [diaperModal, setDiaperModal] = useState(false)
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null)

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
        </div>

        {/* Feed tab */}
        {tab === 'feed' && (
          <div className="space-y-3">
            <Button fullWidth onClick={() => setFeedModal(true)}>
              <Plus size={15} /> Log a feed
            </Button>
            {recentFeeds.length === 0 ? (
              <EmptyState icon="🍼" title="No feeds logged yet" description="Tap 'Log a feed' to start tracking." />
            ) : (
              <div className="space-y-2">
                {recentFeeds.map((f) => (
                  <Card key={f.id} padding="sm" className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-700">{FEED_LABELS[f.type]}</p>
                        {f.durationMinutes && <Badge className="bg-cream-200 text-stone-600">{f.durationMinutes} min</Badge>}
                        {f.amountMl && <Badge className="bg-cream-200 text-stone-600">{f.amountMl}ml</Badge>}
                      </div>
                      <p className="text-xs text-stone-400">{formatTime(f.date)} · {format(parseISO(f.date), 'd MMM')}</p>
                      {f.notes && <p className="text-xs text-stone-500 mt-0.5">{f.notes}</p>}
                    </div>
                    <button onClick={() => deleteFeed(f.id)} className="text-stone-300 hover:text-blush-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </Card>
                ))}
              </div>
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
                <Button variant="secondary" size="sm" onClick={() => { setActiveSleep(activeSleepSession); setSleepModal(true) }}>
                  End session
                </Button>
              </Card>
            ) : (
              <Button fullWidth onClick={() => { setActiveSleep(null); setSleepModal(true) }}>
                <Plus size={15} /> Log sleep
              </Button>
            )}
            {recentSleep.length === 0 ? (
              <EmptyState icon="🌙" title="No sleep logged yet" description="Tap 'Log sleep' to start tracking." />
            ) : (
              <div className="space-y-2">
                {recentSleep.map((s) => {
                  const mins = s.endTime
                    ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000)
                    : null
                  return (
                    <Card key={s.id} padding="sm" className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-700">
                            {s.type === 'night' ? '🌙 Night' : '☀️ Nap'}
                          </p>
                          {mins !== null && (
                            <Badge className="bg-cream-200 text-stone-600">
                              {mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`}
                            </Badge>
                          )}
                          {!s.endTime && <Badge className="bg-periwinkle-100 text-periwinkle-600">in progress</Badge>}
                        </div>
                        <p className="text-xs text-stone-400">
                          {formatTime(s.startTime)}{s.endTime ? ` → ${formatTime(s.endTime)}` : ''} · {format(parseISO(s.startTime), 'd MMM')}
                        </p>
                        {s.location && <p className="text-xs text-stone-400">{s.location}</p>}
                      </div>
                      <button onClick={() => deleteSleep(s.id)} className="text-stone-300 hover:text-blush-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Diaper tab */}
        {tab === 'diaper' && (
          <div className="space-y-3">
            <Button fullWidth onClick={() => setDiaperModal(true)}>
              <Plus size={15} /> Log nappy change
            </Button>
            {recentDiaper.length === 0 ? (
              <EmptyState icon="🧷" title="No nappy changes logged yet" description="Tap above to start tracking." />
            ) : (
              <div className="space-y-2">
                {recentDiaper.map((d) => (
                  <Card key={d.id} padding="sm" className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700">{DIAPER_LABELS[d.type]}</p>
                      <p className="text-xs text-stone-400">
                        {formatTime(d.startTime)} · {format(parseISO(d.startTime), 'd MMM')}
                      </p>
                      {d.notes && <p className="text-xs text-stone-500 mt-0.5">{d.notes}</p>}
                    </div>
                    <button onClick={() => deleteDiaper(d.id)} className="text-stone-300 hover:text-blush-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <FeedModal open={feedModal} onClose={() => setFeedModal(false)} />
      <SleepModal open={sleepModal} onClose={() => setSleepModal(false)} active={activeSleep} />
      <DiaperModal open={diaperModal} onClose={() => setDiaperModal(false)} />
    </PageShell>
  )
}
