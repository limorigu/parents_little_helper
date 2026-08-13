import { format } from 'date-fns'
import { ACTIVITY_HEX, ACTIVITY_EMOJI, clipEventToDay, type ActivityType, type DayEvent } from '../../lib/insights'

const ROWS: ActivityType[] = ['Feed', 'Sleep', 'Nappy', 'Play']
const SIZE = 240
const CENTER = SIZE / 2
const RING: Record<ActivityType, number> = { Sleep: 92, Play: 72, Feed: 50, Nappy: 50 }

function angleRad(hours: number): number {
  // 0h = 12 o'clock, clockwise.
  return ((hours / 24) * 360 - 90) * (Math.PI / 180)
}
function pointAt(radius: number, hours: number) {
  const a = angleRad(hours)
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) }
}
function describeArc(radius: number, startHours: number, endHours: number): string {
  const start = pointAt(radius, startHours)
  const end = pointAt(radius, endHours)
  const largeArc = endHours - startHours > 12 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

const HOUR_LABELS: Record<number, string> = { 0: '12am', 6: '6am', 12: '12pm', 18: '6pm' }

/**
 * A 24-hour clock face — sleep/play draw as arcs around their own ring (so
 * duration reads as arc length), feeds/nappies draw as dots at their time of
 * day. Every span is pre-clipped via `clipEventToDay` so overnight sessions
 * never wrap the angle math backwards.
 */
export function DayRadialClock({ events, dateStr }: { events: DayEvent[]; dateStr: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={CENTER} cy={CENTER} r={106} fill="none" stroke="var(--color-cream-300)" strokeWidth={1} />
        {[0, 6, 12, 18].map((h) => {
          const p = pointAt(118, h)
          return (
            <text key={h} x={p.x} y={p.y} fontSize="9" fill="var(--color-stone-400)" textAnchor="middle" dominantBaseline="middle">
              {HOUR_LABELS[h]}
            </text>
          )
        })}

        {(['Sleep', 'Play'] as ActivityType[]).map((type) =>
          events
            .filter((e) => e.type === type)
            .map((e, i) => {
              const span = clipEventToDay(e, dateStr)
              if (!span || span.endHours === span.startHours) return null
              return (
                <path
                  key={`${type}-${i}`}
                  d={describeArc(RING[type], span.startHours, span.endHours)}
                  fill="none"
                  stroke={ACTIVITY_HEX[type]}
                  strokeWidth={8}
                  strokeLinecap="round"
                  opacity={span.ongoing ? 0.55 : 0.9}
                />
              )
            })
        )}

        {(['Feed', 'Nappy'] as ActivityType[]).map((type) =>
          events
            .filter((e) => e.type === type)
            .map((e, i) => {
              const span = clipEventToDay(e, dateStr)
              if (!span) return null
              const p = pointAt(RING[type], span.startHours)
              return (
                <circle key={`${type}-${i}`} cx={p.x} cy={p.y} r={5} fill={ACTIVITY_HEX[type]} stroke="var(--color-charcoal)" strokeWidth={1.5}>
                  <title>{`${ACTIVITY_EMOJI[type]} ${type} · ${format(e.start, 'h:mm a')}`}</title>
                </circle>
              )
            })
        )}
      </svg>
      <div className="flex gap-3 text-[10px] text-stone-500 flex-wrap justify-center">
        {ROWS.map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACTIVITY_HEX[t] }} /> {t}
          </span>
        ))}
      </div>
    </div>
  )
}
