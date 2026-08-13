import { useMemo } from 'react'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { DayTimelineBars } from './DayTimelineBars'
import {
  buildDayEvents,
  computeTodaySoFar,
  generateTodayNudges,
  computeDailyTotals,
  computeWakeWindows,
  activeDayCount,
  type RecommendationLevel,
} from '../../lib/insights'
import { getBabyAgeWeeks, today } from '../../lib/utils'
import type { FeedEntry, SleepEntry, DiaperEntry, PlayEntry } from '../../store/useAppStore'

const LEVEL_STYLES: Record<RecommendationLevel, { bg: string; border: string; text: string; label: string }> = {
  good: { bg: 'bg-sage-50', border: 'border-sage-200', text: 'text-sage-700', label: 'On track' },
  watch: { bg: 'bg-blush-50', border: 'border-blush-200', text: 'text-blush-600', label: 'Worth a look' },
  info: { bg: 'bg-marigold-50', border: 'border-marigold-200', text: 'text-marigold-600', label: 'Heads up' },
}

interface Props {
  feeds: FeedEntry[]
  sleep: SleepEntry[]
  diaper: DiaperEntry[]
  play: PlayEntry[]
  birthDate: string
}

/**
 * "How's today going" — sits above the log tables so it's visible no matter
 * which tab is active: a live timeline of everything logged today, plus a
 * few gentle nudges comparing today-so-far against the household's own
 * usual pace (not medical advice, just pattern-matching on your own data).
 */
export function TodaySchedule({ feeds, sleep, diaper, play, birthDate }: Props) {
  const dateStr = today()

  const events = useMemo(() => buildDayEvents(feeds, sleep, diaper, play, dateStr), [feeds, sleep, diaper, play, dateStr])
  const numDays = useMemo(() => activeDayCount(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const soFar = useMemo(() => computeTodaySoFar(feeds, sleep, diaper, play, dateStr), [feeds, sleep, diaper, play, dateStr])
  const totals = useMemo(() => computeDailyTotals(feeds, sleep, diaper, play), [feeds, sleep, diaper, play])
  const wakeWindows = useMemo(() => computeWakeWindows(sleep), [sleep])
  const weeks = getBabyAgeWeeks(birthDate)
  const nudges = useMemo(
    () => generateTodayNudges(weeks, soFar, totals, wakeWindows, numDays),
    [weeks, soFar, totals, wakeWindows, numDays]
  )

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm font-display font-black text-stone-800 mb-1">Today's schedule so far</p>
        <p className="text-xs text-stone-400 mb-3">Everything logged today, at a glance</p>
        {events.length === 0 ? (
          <EmptyState icon="🗓️" title="Nothing logged yet today" description="Tap a quick-log button up top to get today started." />
        ) : (
          <DayTimelineBars events={events} dateStr={dateStr} showNowLine />
        )}
      </Card>

      {events.length > 0 && (
        <div className="space-y-2">
          {nudges.map((rec, i) => {
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
      )}
    </div>
  )
}
