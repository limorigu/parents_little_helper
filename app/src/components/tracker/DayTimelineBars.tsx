import { format } from 'date-fns'
import { ACTIVITY_HEX, ACTIVITY_EMOJI, clipEventToDay, type ActivityType, type DayEvent } from '../../lib/insights'

const ROWS: ActivityType[] = ['Feed', 'Sleep', 'Nappy', 'Play']

/**
 * Horizontal 24h Gantt-style row per activity type — feeds/nappies render as thin
 * ticks (they're instantaneous), sleep/play render as wider blocks spanning their
 * real start→end, clipped to the visualized day's [0,24) window so overnight
 * sessions never produce a negative or wrap-around width.
 */
export function DayTimelineBars({ events, dateStr, showNowLine = false }: { events: DayEvent[]; dateStr: string; showNowLine?: boolean }) {
  const dayStartMs = new Date(`${dateStr}T00:00:00`).getTime()
  const nowMs = Date.now()
  const isToday = nowMs >= dayStartMs && nowMs < dayStartMs + 24 * 3_600_000
  const nowPct = isToday ? ((nowMs - dayStartMs) / (24 * 3_600_000)) * 100 : null

  return (
    <div className="space-y-1.5">
      {ROWS.map((type) => (
        <div key={type} className="flex items-center gap-2">
          <div className="w-16 shrink-0 text-xs font-bold text-stone-500 flex items-center gap-1">
            <span>{ACTIVITY_EMOJI[type]}</span> {type}
          </div>
          <div className="flex-1 relative h-5 bg-cream-200 rounded-md overflow-hidden">
            {events
              .filter((e) => e.type === type)
              .map((e, i) => {
                const span = clipEventToDay(e, dateStr)
                if (!span) return null
                const leftPct = (span.startHours / 24) * 100
                const widthPct = Math.max(((span.endHours - span.startHours) / 24) * 100, 0.7)
                return (
                  <div
                    key={i}
                    title={`${type} · ${format(e.start, 'h:mm a')}${e.end ? ` – ${format(e.end, 'h:mm a')}` : span.ongoing ? ' – now' : ''}`}
                    className={`absolute top-[3px] bottom-[3px] rounded-sm ${span.ongoing ? 'animate-pulse' : ''}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: ACTIVITY_HEX[type] }}
                  />
                )
              })}
            {showNowLine && nowPct !== null && (
              <div className="absolute top-0 bottom-0 w-[2px] bg-stone-800" style={{ left: `${nowPct}%` }} />
            )}
          </div>
        </div>
      ))}
      <div className="flex justify-between pl-[4.5rem] text-[10px] text-stone-400 pt-0.5">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
      </div>
    </div>
  )
}
