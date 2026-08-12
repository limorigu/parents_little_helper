import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAppStore } from '../../store/useAppStore'
import { getBabyAgeWeeks } from '../../lib/utils'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import {
  computeWakeWindows,
  computeSequences,
  computeHourlyHeatmap,
  computeDailyTotals,
  generateRecommendations,
  activeDayCount,
  BUCKETS,
  type ActivityType,
  type RecommendationLevel,
} from '../../lib/insights'

const ACTIVITY_HEX: Record<ActivityType, string> = {
  Feed: '#2a9d8f',
  Sleep: '#d9a83e',
  Nappy: '#e76f51',
  Play: '#6d75d1',
}

const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  Feed: '🍼',
  Sleep: '🌙',
  Nappy: '🧷',
  Play: '🧸',
}

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
                backgroundColor: intensity > 0 ? ACTIVITY_HEX[type] : '#ecdfc4',
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

      {/* Wake windows by time of day */}
      {wakeWindows.avgMinutes !== null && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 pb-2">
            <p className="text-sm font-display font-black text-stone-800">Wake windows by time of day</p>
            <p className="text-xs text-stone-400 mt-0.5">Average time awake before the next sleep starts</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={wakeWindowChartData} margin={{ left: -10, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ecdfc4" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#4e8490' }} />
              <YAxis tick={{ fontSize: 10, fill: '#4e8490' }} unit="m" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '2px solid #264653', fontSize: 12 }}
                formatter={(v) => [`${v} min`, 'Avg wake window']}
              />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                {wakeWindowChartData.map((d, i) => (
                  <Cell key={i} fill={d.minutes > 0 ? '#d9a83e' : '#ecdfc4'} />
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
                      <p className="text-stone-300">Not enough data</p>
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
