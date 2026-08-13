import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { uid, timeAgo, elapsedSince, nowLocalIso } from '../../lib/utils'
import { Card } from '../ui/Card'

type ButtonState = 'idle' | 'active' | 'justLogged'

interface TileDef {
  key: 'feed' | 'sleep' | 'nappy' | 'play'
  label: string
  activeLabel?: string
  icon: string
  bg: string
  border: string
}

const TILES: TileDef[] = [
  { key: 'feed', label: 'Feed', icon: '🍼', bg: 'bg-sand-300', border: 'border-stone-800' },
  { key: 'sleep', label: 'Sleep', activeLabel: 'Wake up', icon: '🌙', bg: 'bg-periwinkle-100', border: 'border-stone-800' },
  { key: 'nappy', label: 'Nappy', icon: '🧷', bg: 'bg-blush-100', border: 'border-stone-800' },
  { key: 'play', label: 'Play', activeLabel: 'Stop play', icon: '🧸', bg: 'bg-sage-100', border: 'border-stone-800' },
]

const RECENT_LABEL: Record<TileDef['key'], string> = {
  feed: 'Feed',
  sleep: 'Snooze',
  nappy: 'Nappy change',
  play: 'Play session',
}

/**
 * "Track it in a tap" — giant, no-typing quick-log buttons for the four
 * things new parents log dozens of times a day. Feed and Nappy log an
 * instant point-in-time entry; Sleep and Play are start/stop toggles that
 * track an in-progress session.
 */
export function QuickLog() {
  const { feeds, sleep, diaper, play, addFeed, addSleep, updateSleep, addDiaper, addPlay, updatePlay } = useAppStore()
  const [justLogged, setJustLogged] = useState<TileDef['key'] | null>(null)
  const [, setTick] = useState(0)

  // Re-render every 30s so "sleeping · 42m" / "12m ago" stay fresh without a full reload.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // If more than one entry is somehow left "open" (no endTime) — e.g. from an
  // import, or a missed stop-tap — prefer the one that started most recently
  // rather than whichever happens to sit first in the array, so a stale/old
  // open entry can't masquerade as the current session on the dashboard.
  const activeNap = sleep
    .filter((s) => !s.endTime)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
  const activePlay = play
    .filter((p) => !p.endTime)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]

  function flash(key: TileDef['key']) {
    setJustLogged(key)
    setTimeout(() => setJustLogged((cur) => (cur === key ? null : cur)), 1400)
  }

  function handleTap(key: TileDef['key']) {
    // Local naive, matching what the Tracker modals write — a UTC "…Z" string
    // here would both mis-bucket the entry's calendar day near midnight and
    // render blank in the edit modal's datetime-local inputs.
    const now = nowLocalIso()
    if (key === 'feed') {
      // Quick-tap doesn't know breast-vs-bottle etc — log it honestly as
      // "unspecified" rather than guessing, and let the user refine it later
      // via the edit modal. Avoids false precision in the logged history.
      addFeed({ id: uid(), date: now, type: 'unspecified', durationMinutes: null, amountMl: null, notes: '' })
      flash(key)
    } else if (key === 'nappy') {
      addDiaper({ id: uid(), startTime: now, endTime: now, type: 'unknown', notes: '' })
      flash(key)
    } else if (key === 'sleep') {
      if (activeNap) {
        updateSleep(activeNap.id, { endTime: now })
      } else {
        // Same reasoning as feed above: don't guess nap vs. night sleep on a
        // bare tap, log "unspecified" and let the user refine it later.
        addSleep({ id: uid(), startTime: now, endTime: null, type: 'unspecified', location: '', notes: '' })
      }
      flash(key)
    } else if (key === 'play') {
      if (activePlay) {
        updatePlay(activePlay.id, { endTime: now })
      } else {
        addPlay({ id: uid(), startTime: now, endTime: null, notes: '' })
      }
      flash(key)
    }
  }

  function stateFor(key: TileDef['key']): ButtonState {
    if (justLogged === key) return 'justLogged'
    if (key === 'sleep' && activeNap) return 'active'
    if (key === 'play' && activePlay) return 'active'
    return 'idle'
  }

  // Build the "recent" strip: most recently logged entry per type, top 2 by recency.
  type Recent = { key: TileDef['key']; at: string; running?: boolean }
  const recents: Recent[] = (
    [
      feeds[0] && { key: 'feed', at: feeds[0].date },
      diaper[0] && { key: 'nappy', at: diaper[0].endTime ?? diaper[0].startTime },
      sleep[0] && { key: 'sleep', at: sleep[0].endTime ?? sleep[0].startTime, running: !sleep[0].endTime },
      play[0] && { key: 'play', at: play[0].endTime ?? play[0].startTime, running: !play[0].endTime },
    ] as Array<Recent | false | undefined>
  )
    .filter((x): x is Recent => Boolean(x))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 2)

  return (
    <Card>
      <p className="text-sm font-display font-black text-stone-800 mb-1">Track it in a tap</p>
      <p className="text-xs text-stone-400 mb-3">No typing — just tap when it happens.</p>

      <div className="grid grid-cols-4 gap-2">
        {TILES.map((t) => {
          const state = stateFor(t.key)
          const showActive = state === 'active'
          const showLogged = state === 'justLogged'
          const runningSince = t.key === 'sleep' ? activeNap?.startTime : t.key === 'play' ? activePlay?.startTime : undefined
          return (
            <button
              key={t.key}
              onClick={() => handleTap(t.key)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-[3px] ${t.border} py-4 px-1 text-center transition-all shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none ${showActive ? 'bg-marigold-300 animate-pulse' : showLogged ? 'bg-sage-300' : t.bg}`}
            >
              <span className="text-2xl leading-none">{showLogged ? '✓' : t.icon}</span>
              <span className="text-[11px] font-bold text-stone-800 leading-tight">
                {showLogged ? 'Logged!' : showActive && t.activeLabel ? t.activeLabel : t.label}
              </span>
              {showActive && runningSince && (
                <span className="text-[9px] font-bold text-stone-600">{elapsedSince(runningSince)}</span>
              )}
            </button>
          )
        })}
      </div>

      {recents.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {recents.map((r, i) => {
            const tile = TILES.find((t) => t.key === r.key)!
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl border-2 border-stone-800 bg-cream-50 px-3 py-2">
                <span className="text-lg leading-none shrink-0">{tile.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-700 truncate">{RECENT_LABEL[r.key]}</p>
                  <p className="text-[10px] text-stone-400">
                    {r.running ? `In progress · ${elapsedSince(r.at)}` : timeAgo(r.at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
