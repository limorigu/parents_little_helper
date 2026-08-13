import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAppStore } from '../../store/useAppStore'
import { getBabyAgeWeeks, today } from '../../lib/utils'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { DayTimelineBars } from './DayTimelineBars'
import { DayRadialClock } from './DayRadialClock'
import {
  computeWakeWindows,
  computeSequences,
  computeHourlyHeatmap,
  computeHourlyHeatmapForDay,
  computeDailyTotals,
  generateRecommendations,
  activeDayCount,
  listActivityDays,
  buildDayEvents,
  ACTIVITY_HEX,
  ACTIVITY_EMOJI,
  BUCKETS,
  type ActivityType,
  type RecommendationLevel,
} from '../../lib/insights'

type DayVizStyle = 'grid' | 'timeline' | 'clock'

const LEVEL_STYLES: Record<RecommendationLevel, { bg: string; border: string; text: string; label: string }> = {
  good: { bg: 'bg-sage-50', border: 'border-sage-200', text: 'text-sage-700', label: 'On track' },
  watch: { bg: 'bg-blush-50', border: 'border-blush-200', text: 'text-blush-600', label: 'Worth a look' },
  info: { bg: 'bg-marigold-50', border: 'border-marigold-200', text: 'text-marigold-600', label: 'Heads up' },
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`
  return `${(min / 60).toFixed(1)}h`
}

function HeatmapRow({ type, counts, max }: { type: ActivityType; counts: number[]; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 shrink-0 text-xs font-bold text-stone-500 flex items-center gap-1">
        <span>{ACTIVITY_EMOJI[type]}</span> {type}
      </div>
      <div className="flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]">
        {counts.map((c, hour) => {
          const intensity = max > 0 ? c / max : 0
          return (
            <div
              key={hour}
              title={`${type} · ${hour}:00 – ${c} time${c === 1 ? '' : 's'} logged`}
              className="aspect-square rounded-[2px]"
              style={{
                backgroundColor: intensity > 0 ? ACTIVITY_HEX[type] : 'var(--color-cream-300)',
                opacity: intensity > 0 ? 0.25 + intensity * 0.75 : 0.4,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function TrackerInsights() {
  const { baby, feeds, sleep, diaper, play } = useAppStore()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [vizStyle, setVizStyle] = useState<DayVizStyle>('grid')

  const numDays = useMemo(() => activeDayCount(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const totalEntries = feeds.length + sleep.length + diaper.length + play.length

  const wakeWindows = useMemo(() => computeWakeWindows(sleep), [sleep])
  const sequences = useMemo(() => computeSequences(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const heatmap = useMemo(() => computeHourlyHeatmap(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const totals = useMemo(() => computeDailyTotals(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const weeks = getBabyAgeWeeks(baby.birthDate)
  const recommendations = useMemo(
    () => generateRecommendations(weeks, totals, wakeWindows),
    [weeks, totals, wakeWindows]
  )

  const activityDays = useMemo(() => listActivityDays(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const activeDay = selectedDay ?? activityDays[0] ?? today()
  const dayEvents = useMemo(() => buildDayEvents(feeds, sleep, diaper, play, activeDay), [feeds, sleep, diaper, play, activeDay])
  const dayHeatmap = useMemo(
    () => computeHourlyHeatmapForDay(feeds, sleep, diaper, play, activeDay),
    [feeds, sleep, diaper, play, activeDay]
  )
  const dayHeatmapMax = Math.max(1, ...Object.values(dayHeatmap).flat())

  if (numDays < 3 || totalEntries < 6) {
    return (
      <EmptyState
        icon="📊"
        title="Not enough data yet"
        description="Log feeds, sleep, and nappy changes across a few days and insights on your baby's patterns will appear here."
      />
    )
  }

  const heatmapMax = Math.max(1, ...Object.values(heatmap).flat())
  const wakeWindowChartData = BUCKETS.map((b) => ({ bucket: b, minutes: wakeWindows.byBucket[b] ? Math.round(wakeWindows.byBucket[b] as number) : 0 }))

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="sm" className="text-center">
          <p className="text-xl font-display text-stone-800">{wakeWindows.avgMinutes !== null ? fmtMinutes(wakeWindows.avgMinutes) : '—'}</p>
          <p className="text-xs text-stone-400 mt-0.5">avg wake window</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-display text-stone-800">{totals.avgNapsPerDay.toFixed(1)}</p>
          <p className="text-xs text-stone-400 mt-0.5">naps / day</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-display text-stone-800">{totals.avgTotalSleepHours.toFixed(1)}h</p>
          <p className="text-xs text-stone-400 mt-0.5">sleep / day</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-display text-stone-800">{totals.avgFeedsPerDay.toFixed(1)}</p>
          <p className="text-xs text-stone-400 mt-0.5">feeds / day</p>
        </Card>
      </div>

      {/* Typical day heatmap */}
      <Card>
        <p className="text-sm font-display font-black text-stone-800 mb-1">Typical day</p>
        <p className="text-xs text-stone-400 mb-3">When each activity tends to happen, based on all logged entries</p>
        <div className="space-y-1.5">
          {(['Feed', 'Sleep', 'Nappy', 'Play'] as ActivityType[]).map((type) => (
            <HeatmapRow key={type} type={type} counts={heatmap[type]} max={heatmapMax} />
          ))}
          <div className="flex justify-between pl-[4.5rem] text-[10px] text-stone-400 pt-0.5">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
          </div>
        </div>
      </Card>

      {/* Explore a specific day */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <p className="text-sm font-display font-black text-stone-800">Explore a day</p>
          <div className="flex gap-1">
            {(
              [
                { key: 'grid', label: '▦ Grid' },
                { key: 'timeline', label: '▬ Timeline' },
                { key: 'clock', label: '◔ Clock' },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                onClick={() => setVizStyle(s.key)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border-2 transition-all ${vizStyle === s.key ? 'bg-stone-800 text-cream-50 border-stone-800' : 'border-stone-200 text-stone-500'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-stone-400 mb-3">Pick a day to see exactly how it went, in whichever style clicks for you</p>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
          {activityDays.map((d) => {
            const isToday = d === today()
            const active = d === activeDay
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border-2 whitespace-nowrap transition-all ${active ? 'bg-marigold-300 border-stone-800 text-stone-800' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}
              >
                {isToday ? 'Today' : format(parseISO(d), 'EEE d MMM')}
              </button>
            )
          })}
        </div>

        {dayEvents.length === 0 ? (
          <EmptyState icon="🗓️" title="Nothing logged this day" />
        ) : vizStyle === 'grid' ? (
          <div className="space-y-1.5">
            {(['Feed', 'Sleep', 'Nappy', 'Play'] as ActivityType[]).map((type) => (
              <HeatmapRow key={type} type={type} counts={dayHeatmap[type]} max={dayHeatmapMax} />
            ))}
            <div className="flex justify-between pl-[4.5rem] text-[10px] text-stone-400 pt-0.5">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span>
            </div>
          </div>
        ) : vizStyle === 'timeline' ? (
          <DayTimelineBars events={dayEvents} dateStr={activeDay} showNowLine />
        ) : (
          <DayRadialClock events={dayEvents} dateStr={activeDay} />
        )}
      </Card>

      {/* Wake windows by time of day */}
      {wakeWindows.avgMinutes !== null && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 pb-2">
            <p className="text-sm font-display font-black text-stone-800">Wake windows by time of day</p>
            <p className="text-xs text-stone-400 mt-0.5">Average time awake before the next sleep starts</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={wakeWindowChartData} margin={{ left: -10, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cream-300)" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: 'var(--color-stone-400)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-stone-400)' }} unit="m" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '2px solid var(--color-stone-800)',
                  background: 'var(--color-cream-50)',
                  color: 'var(--color-stone-800)',
                  fontSize: 12,
                }}
                itemStyle={{ color: 'var(--color-stone-800)' }}
                labelStyle={{ color: 'var(--color-stone-600)' }}
                formatter={(v) => [`${v} min`, 'Avg wake window']}
              />
              {/* See GrowthChart.tsx — recharts' enter animation doesn't run here
                  under React 19, so render the bars statically. */}
              <Bar isAnimationActive={false} dataKey="minutes" radius={[6, 6, 0, 0]}>
                {wakeWindowChartData.map((d, i) => (
                  <Cell key={i} fill={d.minutes > 0 ? 'var(--color-marigold-500)' : 'var(--color-cream-300)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Common sequences */}
      {sequences.topOverall.length > 0 && (
        <Card>
          <p className="text-sm font-display font-black text-stone-800 mb-1">Most common sequences</p>
          <p className="text-xs text-stone-400 mb-3">What tends to follow what, across all logged days</p>
          <div className="space-y-2">
            {sequences.topOverall.map((seq, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg border-2"
                  style={{ backgroundColor: `${ACTIVITY_HEX[seq.from]}22`, borderColor: ACTIVITY_HEX[seq.from], color: ACTIVITY_HEX[seq.from] }}
                >
                  {ACTIVITY_EMOJI[seq.from]} {seq.from}
                </span>
                <span className="text-stone-400 text-xs">→</span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg border-2"
                  style={{ backgroundColor: `${ACTIVITY_HEX[seq.to]}22`, borderColor: ACTIVITY_HEX[seq.to], color: ACTIVITY_HEX[seq.to] }}
                >
                  {ACTIVITY_EMOJI[seq.to]} {seq.to}
                </span>
                <span className="text-xs text-stone-400 ml-auto shrink-0">{seq.pct.toFixed(0)}% of transitions</span>
              </div>
            ))}
          </div>

          {sequences.byBucket && (
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t-2 border-stone-100">
              {BUCKETS.map((bucket) => {
                const seq = sequences.byBucket[bucket]
                return (
                  <div key={bucket} className="text-xs">
                    <p className="text-stone-400 font-bold mb-0.5">{bucket}</p>
                    {seq ? (
                      <p className="text-stone-600">
                        {ACTIVITY_EMOJI[seq.from]}{ACTIVITY_EMOJI[seq.to]} {seq.from} → {seq.to}
                      </p>
                    ) : (
                      <p className="text-stone-400">Not enough data</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Recommendations */}
      <div>
        <h2 className="font-display text-lg text-stone-700 mb-3">How this compares</h2>
        <div className="space-y-2">
          {recommendations.map((rec, i) => {
            const style = LEVEL_STYLES[rec.level]
            return (
              <Card key={i} padding="sm" className={`${style.bg} ${style.border} flex items-start gap-3`}>
                <span className="text-xl shrink-0">{rec.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-wide ${style.text} mb-0.5`}>{style.label}</p>
                  <p className="text-sm text-stone-600 leading-relaxed">{rec.text}</p>
                </div>
              </Card>
            )
          })}
        </div>
        <p className="text-xs text-stone-400 mt-3 leading-relaxed">
          These comparisons are based on general, widely-cited developmental ranges — not medical advice. Every baby is different; always follow your pediatrician's guidance.
        </p>
      </div>
    </div>
  )
}
