import { format, parseISO } from 'date-fns'
import type { FeedEntry, SleepEntry, DiaperEntry, PlayEntry } from '../store/useAppStore'
import { localDayKey } from './utils'

export type ActivityType = 'Feed' | 'Sleep' | 'Nappy' | 'Play'
export type TimeBucket = 'Morning' | 'Afternoon' | 'Evening' | 'Night'

export const BUCKETS: TimeBucket[] = ['Morning', 'Afternoon', 'Evening', 'Night']

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Feed: 'sage',
  Sleep: 'marigold',
  Nappy: 'blush',
  Play: 'periwinkle',
}

// Shared colour/emoji lookups for anything that renders activities visually
// (charts, timelines, clocks) — kept here so every visualization component
// stays in sync with a single source of truth.
//
// These are `var(--color-*)` references rather than literal hexes on purpose:
// SVG `fill`/`stroke` and recharts both accept CSS variables, so the charts flip
// with Night Owl mode along with the rest of the UI. Literal hexes froze the
// light-mode palette into the charts and left them muddy against a dark card.
export const ACTIVITY_HEX: Record<ActivityType, string> = {
  Feed: 'var(--color-sage-500)',
  Sleep: 'var(--color-marigold-500)',
  Nappy: 'var(--color-blush-500)',
  Play: 'var(--color-periwinkle-500)',
}

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  Feed: '🍼',
  Sleep: '🌙',
  Nappy: '🧷',
  Play: '🧸',
}

export function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 21) return 'Evening'
  return 'Night'
}

// ── Age-based reference ranges ──────────────────────────────────────────────
// Approximate, widely-cited general ranges (not medical advice). Used only to
// give a rough sense of how a baby's logged patterns compare to what's common
// for their age — always defer to a pediatrician for actual guidance.
export interface AgeBand {
  maxWeeks: number
  label: string
  naps: [number, number]
  wakeWindowMinutes: [number, number]
  totalSleepHours: [number, number]
  feedsPerDay: [number, number]
}

export const AGE_BANDS: AgeBand[] = [
  { maxWeeks: 4, label: 'a newborn (0–4 weeks)', naps: [4, 6], wakeWindowMinutes: [30, 60], totalSleepHours: [14, 17], feedsPerDay: [8, 12] },
  { maxWeeks: 8, label: '5–8 weeks old', naps: [4, 5], wakeWindowMinutes: [45, 75], totalSleepHours: [14, 16], feedsPerDay: [7, 9] },
  { maxWeeks: 12, label: '9–12 weeks old', naps: [3, 4], wakeWindowMinutes: [60, 90], totalSleepHours: [14, 15.5], feedsPerDay: [6, 8] },
  { maxWeeks: 16, label: '13–16 weeks old', naps: [3, 4], wakeWindowMinutes: [75, 120], totalSleepHours: [14, 15], feedsPerDay: [5, 7] },
  { maxWeeks: 24, label: '4–6 months old', naps: [3, 3], wakeWindowMinutes: [90, 150], totalSleepHours: [13.5, 15], feedsPerDay: [5, 6] },
  { maxWeeks: 36, label: '6–9 months old', naps: [2, 3], wakeWindowMinutes: [120, 180], totalSleepHours: [13, 14.5], feedsPerDay: [4, 5] },
  { maxWeeks: 52, label: '9–12 months old', naps: [2, 2], wakeWindowMinutes: [150, 210], totalSleepHours: [12.5, 14], feedsPerDay: [3, 4] },
  { maxWeeks: 78, label: '12–18 months old', naps: [1, 2], wakeWindowMinutes: [180, 300], totalSleepHours: [12, 14], feedsPerDay: [3, 3] },
  { maxWeeks: Infinity, label: '18 months+', naps: [1, 1], wakeWindowMinutes: [240, 360], totalSleepHours: [11, 14], feedsPerDay: [3, 3] },
]

export function getAgeBand(weeks: number): AgeBand {
  return AGE_BANDS.find((b) => weeks <= b.maxWeeks) ?? AGE_BANDS[AGE_BANDS.length - 1]
}

// ── Timeline helpers ─────────────────────────────────────────────────────────

interface TimelineEvent {
  type: ActivityType
  time: Date
}

function buildTimeline(feeds: FeedEntry[], sleep: SleepEntry[], diaper: DiaperEntry[], play: PlayEntry[]): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...feeds.map((f) => ({ type: 'Feed' as const, time: parseISO(f.date) })),
    ...sleep.map((s) => ({ type: 'Sleep' as const, time: parseISO(s.startTime) })),
    ...diaper.map((d) => ({ type: 'Nappy' as const, time: parseISO(d.startTime) })),
    ...play.map((p) => ({ type: 'Play' as const, time: parseISO(p.startTime) })),
  ]
  return events.filter((e) => !isNaN(e.time.getTime())).sort((a, b) => a.time.getTime() - b.time.getTime())
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function activeDayCount(feeds: FeedEntry[], sleep: SleepEntry[], diaper: DiaperEntry[], play: PlayEntry[]): number {
  const days = new Set<string>()
  feeds.forEach((f) => days.add(dateKey(parseISO(f.date))))
  sleep.forEach((s) => days.add(dateKey(parseISO(s.startTime))))
  diaper.forEach((d) => days.add(dateKey(parseISO(d.startTime))))
  play.forEach((p) => days.add(dateKey(parseISO(p.startTime))))
  return days.size
}

/** Every distinct calendar day (yyyy-MM-dd, local) with at least one logged entry, most recent first. */
export function listActivityDays(feeds: FeedEntry[], sleep: SleepEntry[], diaper: DiaperEntry[], play: PlayEntry[]): string[] {
  const days = new Set<string>()
  const add = (iso: string) => {
    const d = parseISO(iso)
    if (!isNaN(d.getTime())) days.add(format(d, 'yyyy-MM-dd'))
  }
  feeds.forEach((f) => add(f.date))
  sleep.forEach((s) => add(s.startTime))
  diaper.forEach((d) => add(d.startTime))
  play.forEach((p) => add(p.startTime))
  return [...days].sort((a, b) => (a < b ? 1 : -1))
}

// ── Per-day events & clipping ────────────────────────────────────────────────

/** A single logged activity, positioned in real time — the shared shape behind
 * every per-day visualization (timeline bars, radial clock, per-day heatmap). */
export interface DayEvent {
  type: ActivityType
  start: Date
  end: Date | null
  detail: string
}

function isOnDay(iso: string, dateStr: string): boolean {
  // Via localDayKey rather than a raw prefix match, so entries written as UTC
  // ISO strings by older versions of the quick-log buttons still land on the
  // calendar day the parent actually logged them on.
  return localDayKey(iso) === dateStr
}

/** All logged events that touch a given calendar day (started that day, or an
 * overnight sleep/play session that ended that day), sorted chronologically. */
export function buildDayEvents(
  feeds: FeedEntry[],
  sleep: SleepEntry[],
  diaper: DiaperEntry[],
  play: PlayEntry[],
  dateStr: string
): DayEvent[] {
  const events: DayEvent[] = []

  feeds.forEach((f) => {
    if (!isOnDay(f.date, dateStr)) return
    const start = parseISO(f.date)
    if (!isNaN(start.getTime())) events.push({ type: 'Feed', start, end: null, detail: f.notes || '' })
  })
  diaper.forEach((d) => {
    if (!isOnDay(d.startTime, dateStr)) return
    const start = parseISO(d.startTime)
    if (!isNaN(start.getTime())) events.push({ type: 'Nappy', start, end: null, detail: d.notes || '' })
  })
  sleep.forEach((s) => {
    if (!isOnDay(s.startTime, dateStr) && !(s.endTime && isOnDay(s.endTime, dateStr))) return
    const start = parseISO(s.startTime)
    if (isNaN(start.getTime())) return
    const end = s.endTime ? parseISO(s.endTime) : null
    events.push({ type: 'Sleep', start, end: end && !isNaN(end.getTime()) ? end : null, detail: s.location || '' })
  })
  play.forEach((p) => {
    if (!isOnDay(p.startTime, dateStr) && !(p.endTime && isOnDay(p.endTime, dateStr))) return
    const start = parseISO(p.startTime)
    if (isNaN(start.getTime())) return
    const end = p.endTime ? parseISO(p.endTime) : null
    events.push({ type: 'Play', start, end: end && !isNaN(end.getTime()) ? end : null, detail: p.notes || '' })
  })

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export interface ClippedSpan {
  /** Hours since midnight of the visualized day, in [0, 24]. */
  startHours: number
  endHours: number
  /** True if the underlying session has no end yet (still in progress). */
  ongoing: boolean
}

/**
 * Clip one event's real start/end against a single calendar day's [0, 24) window,
 * so overnight sessions (started yesterday, or still running past midnight) render
 * sanely on a single day's axis instead of producing negative widths or wrap-around
 * angles. Feed/Nappy are treated as instantaneous points at their start time.
 * Returns null if the event doesn't actually fall within this day's window.
 */
export function clipEventToDay(event: DayEvent, dateStr: string): ClippedSpan | null {
  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayStartMs = dayStart.getTime()
  const dayEndMs = dayStartMs + 24 * 3_600_000

  if (event.type === 'Feed' || event.type === 'Nappy') {
    const t = event.start.getTime()
    if (t < dayStartMs || t >= dayEndMs) return null
    const h = (t - dayStartMs) / 3_600_000
    return { startHours: h, endHours: h, ongoing: false }
  }

  const rawEndMs = event.end ? event.end.getTime() : Date.now()
  const startMs = Math.max(event.start.getTime(), dayStartMs)
  const endMs = Math.min(rawEndMs, dayEndMs)
  if (startMs >= dayEndMs || endMs <= dayStartMs) return null
  return {
    startHours: (startMs - dayStartMs) / 3_600_000,
    endHours: Math.max((endMs - dayStartMs) / 3_600_000, (startMs - dayStartMs) / 3_600_000),
    ongoing: !event.end,
  }
}

// ── Wake windows ─────────────────────────────────────────────────────────────

export interface WakeWindowResult {
  avgMinutes: number | null
  byBucket: Record<TimeBucket, number | null>
  sampleSize: number
}

const MAX_PLAUSIBLE_WINDOW_MIN = 8 * 60 // ignore gaps that likely mean "not logged", not "awake"

export function computeWakeWindows(sleep: SleepEntry[]): WakeWindowResult {
  const sorted = [...sleep]
    .filter((s) => s.endTime)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const windows: { minutes: number; bucket: TimeBucket }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(sorted[i - 1].endTime as string).getTime()
    const nextStart = new Date(sorted[i].startTime).getTime()
    const minutes = (nextStart - prevEnd) / 60_000
    if (minutes > 0 && minutes <= MAX_PLAUSIBLE_WINDOW_MIN) {
      windows.push({ minutes, bucket: getTimeBucket(new Date(sorted[i - 1].endTime as string).getHours()) })
    }
  }

  const avgMinutes = windows.length ? windows.reduce((s, w) => s + w.minutes, 0) / windows.length : null

  const byBucket: Record<TimeBucket, number | null> = { Morning: null, Afternoon: null, Evening: null, Night: null }
  for (const bucket of BUCKETS) {
    const inBucket = windows.filter((w) => w.bucket === bucket)
    byBucket[bucket] = inBucket.length ? inBucket.reduce((s, w) => s + w.minutes, 0) / inBucket.length : null
  }

  return { avgMinutes, byBucket, sampleSize: windows.length }
}

// ── Generic activity gaps (time since last record + typical gap by time of day) ──
//
// Powers the "time since last / next record estimate" block on each Tracker
// tab. Two flavors, because the right notion of "gap" differs by entry shape:
//  - `computeGapStats` for instantaneous logs (Feed, Nappy) — gap is start-to-start.
//  - `computeSessionGapStats` for entries with a start AND end (Sleep, Play) —
//    gap is end-of-previous-session to start-of-next, same convention as
//    `computeWakeWindows` above (so Sleep's numbers here line up with the
//    existing "wake windows" chart rather than introducing a second definition).

export interface GapStats {
  /** Most recent anchor time for this activity across all history, or null if never logged. */
  lastAt: Date | null
  /** Minutes between `lastAt` and now. Null if never logged. */
  sinceMinutes: number | null
  /** Overall average gap between consecutive occurrences, across all logged history. */
  avgMinutes: number | null
  sampleSize: number
  /** Average gap, restricted to gaps whose earlier occurrence fell in that time-of-day bucket. */
  byBucket: Record<TimeBucket, number | null>
  /** How many gap samples back each `byBucket` average, so callers can judge confidence. */
  byBucketSampleSize: Record<TimeBucket, number>
}

const MAX_PLAUSIBLE_GAP_MIN = 12 * 60 // gaps longer than this likely mean "not logged", not a real gap

function summarizeGaps(gaps: { minutes: number; bucket: TimeBucket }[]): Omit<GapStats, 'lastAt' | 'sinceMinutes'> {
  const avgMinutes = gaps.length ? gaps.reduce((s, g) => s + g.minutes, 0) / gaps.length : null

  const byBucket: Record<TimeBucket, number | null> = { Morning: null, Afternoon: null, Evening: null, Night: null }
  const byBucketSampleSize: Record<TimeBucket, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }
  for (const bucket of BUCKETS) {
    const inBucket = gaps.filter((g) => g.bucket === bucket)
    byBucketSampleSize[bucket] = inBucket.length
    byBucket[bucket] = inBucket.length ? inBucket.reduce((s, g) => s + g.minutes, 0) / inBucket.length : null
  }

  return { avgMinutes, sampleSize: gaps.length, byBucket, byBucketSampleSize }
}

/** Gap stats for instantaneous logs (Feed, Nappy) — anchors are each entry's own timestamp. */
export function computeGapStats(anchors: Date[], now: Date = new Date()): GapStats {
  const sorted = [...anchors].filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime())
  const lastAt = sorted.length ? sorted[sorted.length - 1] : null
  const sinceMinutes = lastAt ? Math.max(0, (now.getTime() - lastAt.getTime()) / 60_000) : null

  const gaps: { minutes: number; bucket: TimeBucket }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const minutes = (sorted[i].getTime() - sorted[i - 1].getTime()) / 60_000
    if (minutes > 0 && minutes <= MAX_PLAUSIBLE_GAP_MIN) {
      gaps.push({ minutes, bucket: getTimeBucket(sorted[i - 1].getHours()) })
    }
  }

  return { lastAt, sinceMinutes, ...summarizeGaps(gaps) }
}

interface SessionLike {
  startTime: string
  endTime: string | null
}

/**
 * Prefer this time-of-day bucket's own average gap once there's enough samples
 * in it; otherwise fall back to the overall own-data average. Shared by every
 * "next record" / EC nudge card so they all use the same confidence threshold.
 */
export function pickOwnGapMinutes(
  gapStats: GapStats,
  nowBucket: TimeBucket,
  minBucketSample = 2
): { minutes: number | null; isBucketSpecific: boolean } {
  if (gapStats.byBucketSampleSize[nowBucket] >= minBucketSample) {
    return { minutes: gapStats.byBucket[nowBucket], isBucketSpecific: true }
  }
  return { minutes: gapStats.avgMinutes, isBucketSpecific: false }
}

/** Gap stats for sessions with a start AND end (Sleep, Play) — gap is prev-end → next-start. */
export function computeSessionGapStats(entries: SessionLike[], now: Date = new Date()): GapStats {
  const sorted = [...entries]
    .filter((e) => e.endTime)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const lastEntry = sorted.length ? sorted[sorted.length - 1] : null
  const lastAt = lastEntry ? new Date(lastEntry.endTime as string) : null
  const sinceMinutes = lastAt && !isNaN(lastAt.getTime()) ? Math.max(0, (now.getTime() - lastAt.getTime()) / 60_000) : null

  const gaps: { minutes: number; bucket: TimeBucket }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(sorted[i - 1].endTime as string).getTime()
    const nextStart = new Date(sorted[i].startTime).getTime()
    const minutes = (nextStart - prevEnd) / 60_000
    if (minutes > 0 && minutes <= MAX_PLAUSIBLE_GAP_MIN) {
      gaps.push({ minutes, bucket: getTimeBucket(new Date(sorted[i - 1].endTime as string).getHours()) })
    }
  }

  return { lastAt: lastAt && !isNaN(lastAt.getTime()) ? lastAt : null, sinceMinutes, ...summarizeGaps(gaps) }
}

// ── Literature-based expected gap (only where this app actually has a reference) ──

export interface ExpectedGap {
  /** Whether this app has an age-banded research reference for this activity. */
  available: boolean
  minMinutes?: number
  maxMinutes?: number
  ageLabel?: string
  /** Present when `available` is false — an honest note instead of a fabricated number. */
  unavailableNote?: string
}

/**
 * Age-banded "typical gap" between records of a given activity, derived from the
 * same `AGE_BANDS` reference data used elsewhere in the app — never invented on
 * the spot. Feed and Sleep have real backing data here (feeds/day and wake-window
 * ranges, respectively); Nappy and Play don't, and this says so explicitly rather
 * than fabricating a plausible-sounding number.
 */
export function getExpectedGap(type: ActivityType, weeks: number): ExpectedGap {
  const band = getAgeBand(weeks)
  if (type === 'Feed') {
    const [fMin, fMax] = band.feedsPerDay // feeds/day — more feeds/day means a shorter interval
    return { available: true, minMinutes: (24 * 60) / fMax, maxMinutes: (24 * 60) / fMin, ageLabel: band.label }
  }
  if (type === 'Sleep') {
    const [wMin, wMax] = band.wakeWindowMinutes
    return { available: true, minMinutes: wMin, maxMinutes: wMax, ageLabel: band.label }
  }
  return {
    available: false,
    unavailableNote:
      type === 'Nappy'
        ? "No age-banded research benchmark for nappy-change frequency is included in this app — this estimate is based only on your own logged data."
        : "No age-banded research benchmark for play-session frequency is included in this app — this estimate is based only on your own logged data.",
  }
}

// ── Elimination communication (EC): pee/poop timing nudges ──────────────────
//
// Timing/catch-rate estimates for EC, built entirely from `DiaperEntry` —
// `type` records what actually ended up in the diaper, `pottyResult` records
// what was caught on the potty, and the two are independent (a "wet" diaper
// can still have a `pottyResult` if some was caught and some wasn't). An
// "occurrence" of an outcome is any entry where it happened at all, caught
// or not — that's what tells us about the baby's own physiological timing,
// as distinct from how well it's currently being caught.

export type ECOutcome = 'pee' | 'poop'

function matchesECOutcome(d: DiaperEntry, outcome: ECOutcome): boolean {
  const diaperHasIt = outcome === 'pee' ? d.type === 'wet' || d.type === 'both' : d.type === 'dirty' || d.type === 'both'
  const pottyHasIt = d.pottyResult === outcome || d.pottyResult === 'both'
  return diaperHasIt || pottyHasIt
}

export interface ECStats extends GapStats {
  /** Fraction (0–1) of occurrences caught at least partly on the potty, vs. missed entirely. Null if no occurrences logged. */
  catchRate: number | null
  catchSampleSize: number
  /** Catch rate split by time-of-day bucket — surfaces which part of the day tends to go best. */
  catchRateByBucket: Record<TimeBucket, number | null>
  catchCountByBucket: Record<TimeBucket, number>
}

/** Own-data timing + catch-rate stats for one EC outcome, from all logged diaper entries. */
export function computeECStats(diaper: DiaperEntry[], outcome: ECOutcome, now: Date = new Date()): ECStats {
  const matches = diaper.filter((d) => matchesECOutcome(d, outcome))
  const anchors = matches.map((d) => parseISO(d.startTime)).filter((d) => !isNaN(d.getTime()))
  const gapStats = computeGapStats(anchors, now)

  const isCaught = (d: DiaperEntry) => d.pottyResult === outcome || d.pottyResult === 'both'
  const caughtCount = matches.filter(isCaught).length
  const catchRate = matches.length ? caughtCount / matches.length : null

  const catchRateByBucket: Record<TimeBucket, number | null> = { Morning: null, Afternoon: null, Evening: null, Night: null }
  const catchCountByBucket: Record<TimeBucket, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }
  for (const bucket of BUCKETS) {
    const inBucket = matches.filter((d) => {
      const t = parseISO(d.startTime)
      return !isNaN(t.getTime()) && getTimeBucket(t.getHours()) === bucket
    })
    catchCountByBucket[bucket] = inBucket.length
    catchRateByBucket[bucket] = inBucket.length ? inBucket.filter(isCaught).length / inBucket.length : null
  }

  return { ...gapStats, catchRate, catchSampleSize: matches.length, catchRateByBucket, catchCountByBucket }
}

/** How soon after a wake-up or a feed still "counts" as linked, for both own-data correlation and the live now-nudge. */
export const EC_TRIGGER_WINDOW_MIN = 20

export interface ECTriggerStats {
  /** % of occurrences that happened within EC_TRIGGER_WINDOW_MIN of a sleep ending. Null if no sleep history to compare against. */
  afterWakePct: number | null
  /** % of occurrences that happened within EC_TRIGGER_WINDOW_MIN of a feed starting. Null if no feed history to compare against. */
  afterFeedPct: number | null
  sampleSize: number
}

function fractionWithinAfter(occurrences: Date[], triggers: Date[], windowMinutes: number): number | null {
  if (occurrences.length === 0 || triggers.length === 0) return null
  const sortedTriggers = [...triggers].sort((a, b) => a.getTime() - b.getTime())
  let withinCount = 0
  for (const t of occurrences) {
    let nearestPrior: Date | null = null
    for (const trig of sortedTriggers) {
      if (trig.getTime() <= t.getTime()) nearestPrior = trig
      else break
    }
    if (nearestPrior && (t.getTime() - nearestPrior.getTime()) / 60_000 <= windowMinutes) withinCount++
  }
  return (withinCount / occurrences.length) * 100
}

/** This household's own correlation between an EC outcome and waking up / feeding — not a general claim, just what's actually been logged. */
export function computeECTriggerStats(diaper: DiaperEntry[], sleep: SleepEntry[], feeds: FeedEntry[], outcome: ECOutcome): ECTriggerStats {
  const matches = diaper.filter((d) => matchesECOutcome(d, outcome))
  const occurrences = matches.map((d) => parseISO(d.startTime)).filter((d) => !isNaN(d.getTime()))
  const wakeTimes = sleep
    .filter((s) => s.endTime)
    .map((s) => parseISO(s.endTime as string))
    .filter((d) => !isNaN(d.getTime()))
  const feedTimes = feeds.map((f) => parseISO(f.date)).filter((d) => !isNaN(d.getTime()))

  return {
    afterWakePct: fractionWithinAfter(occurrences, wakeTimes, EC_TRIGGER_WINDOW_MIN),
    afterFeedPct: fractionWithinAfter(occurrences, feedTimes, EC_TRIGGER_WINDOW_MIN),
    sampleSize: occurrences.length,
  }
}

/**
 * General, non-personalized EC timing guidance grounded in basic, well-documented
 * physiology — NOT a specific study of EC's effectiveness (the research base for
 * EC itself is still thin and mixed). Always shown alongside a household's own
 * data, never as a substitute for it.
 */
export const EC_GENERAL_GUIDANCE: Record<ECOutcome, string> = {
  pee: "Babies rarely urinate during deep sleep, so there's often a backlog right at wake-up — waking from any nap or night sleep is a commonly-cited high-odds window for a pee catch.",
  poop: 'The gastrocolic reflex — a well-documented digestive response where eating ramps up gut motility — means many babies are likelier to poop within about 30 minutes of a feed.',
}

/** Minutes since the most recent sleep session ended (i.e. since baby last woke up). Null if no completed sleep is logged. */
export function minutesSinceLastWake(sleep: SleepEntry[], now: Date = new Date()): number | null {
  const ends = sleep
    .filter((s) => s.endTime)
    .map((s) => parseISO(s.endTime as string))
    .filter((d) => !isNaN(d.getTime()))
  if (!ends.length) return null
  const lastEnd = ends.reduce((a, b) => (a.getTime() > b.getTime() ? a : b))
  return Math.max(0, (now.getTime() - lastEnd.getTime()) / 60_000)
}

/** Minutes since the most recent feed started. Null if no feed is logged. */
export function minutesSinceLastFeed(feeds: FeedEntry[], now: Date = new Date()): number | null {
  const starts = feeds.map((f) => parseISO(f.date)).filter((d) => !isNaN(d.getTime()))
  if (!starts.length) return null
  const last = starts.reduce((a, b) => (a.getTime() > b.getTime() ? a : b))
  return Math.max(0, (now.getTime() - last.getTime()) / 60_000)
}

// ── Common sequences ─────────────────────────────────────────────────────────

export interface SequenceCount {
  from: ActivityType
  to: ActivityType
  count: number
  pct: number
}

export interface SequenceResult {
  topOverall: SequenceCount[]
  byBucket: Record<TimeBucket, SequenceCount | null>
  totalTransitions: number
}

export function computeSequences(feeds: FeedEntry[], sleep: SleepEntry[], diaper: DiaperEntry[], play: PlayEntry[]): SequenceResult {
  const timeline = buildTimeline(feeds, sleep, diaper, play)

  const overallCounts = new Map<string, number>()
  const bucketCounts: Record<TimeBucket, Map<string, number>> = {
    Morning: new Map(), Afternoon: new Map(), Evening: new Map(), Night: new Map(),
  }

  let lastDayKey = ''
  let prev: TimelineEvent | null = null
  let totalTransitions = 0

  for (const ev of timeline) {
    const dk = dateKey(ev.time)
    if (dk !== lastDayKey) {
      // new day — no transition carries over midnight
      prev = null
      lastDayKey = dk
    }
    if (prev && prev.type !== ev.type) {
      const key = `${prev.type}>${ev.type}`
      overallCounts.set(key, (overallCounts.get(key) ?? 0) + 1)
      const bucket = getTimeBucket(prev.time.getHours())
      const bMap = bucketCounts[bucket]
      bMap.set(key, (bMap.get(key) ?? 0) + 1)
      totalTransitions++
    }
    prev = ev
  }

  function toSeqCount(key: string, count: number): SequenceCount {
    const [from, to] = key.split('>') as [ActivityType, ActivityType]
    return { from, to, count, pct: totalTransitions ? (count / totalTransitions) * 100 : 0 }
  }

  const topOverall = [...overallCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => toSeqCount(key, count))

  const byBucket: Record<TimeBucket, SequenceCount | null> = { Morning: null, Afternoon: null, Evening: null, Night: null }
  for (const bucket of BUCKETS) {
    const entries = [...bucketCounts[bucket].entries()].sort((a, b) => b[1] - a[1])
    byBucket[bucket] = entries.length ? toSeqCount(entries[0][0], entries[0][1]) : null
  }

  return { topOverall, byBucket, totalTransitions }
}

/**
 * Like `computeSequences(...).byBucket`, but restricted to transitions starting
 * from one specific activity type — e.g. "at this time of day, what usually
 * comes right after a feed?" Used by the per-category "next record" blocks so
 * the sequence hint is framed from that category's own point of view, rather
 * than the single overall-top-transition-per-bucket that `computeSequences`
 * returns (which may not even start from the category in question).
 */
export function computeSequencesFrom(
  feeds: FeedEntry[],
  sleep: SleepEntry[],
  diaper: DiaperEntry[],
  play: PlayEntry[],
  fromType: ActivityType
): Record<TimeBucket, SequenceCount | null> {
  const timeline = buildTimeline(feeds, sleep, diaper, play)
  const bucketCounts: Record<TimeBucket, Map<ActivityType, number>> = {
    Morning: new Map(), Afternoon: new Map(), Evening: new Map(), Night: new Map(),
  }

  let lastDayKey = ''
  let prev: TimelineEvent | null = null
  for (const ev of timeline) {
    const dk = dateKey(ev.time)
    if (dk !== lastDayKey) {
      prev = null
      lastDayKey = dk
    }
    if (prev && prev.type === fromType && prev.type !== ev.type) {
      const bucket = getTimeBucket(prev.time.getHours())
      const bMap = bucketCounts[bucket]
      bMap.set(ev.type, (bMap.get(ev.type) ?? 0) + 1)
    }
    prev = ev
  }

  const byBucket: Record<TimeBucket, SequenceCount | null> = { Morning: null, Afternoon: null, Evening: null, Night: null }
  for (const bucket of BUCKETS) {
    const entries = [...bucketCounts[bucket].entries()].sort((a, b) => b[1] - a[1])
    if (entries.length === 0) continue
    const total = entries.reduce((s, [, c]) => s + c, 0)
    const [to, count] = entries[0]
    byBucket[bucket] = { from: fromType, to, count, pct: total ? (count / total) * 100 : 0 }
  }

  return byBucket
}

// ── Typical-day hourly heatmap ───────────────────────────────────────────────

export type HourlyHeatmap = Record<ActivityType, number[]>

function addCoverage(counts: number[], startIso: string, endIso: string | null) {
  const start = parseISO(startIso)
  if (isNaN(start.getTime())) return
  if (!endIso) {
    counts[start.getHours()]++
    return
  }
  const end = parseISO(endIso)
  if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    counts[start.getHours()]++
    return
  }
  const hours = Math.min(Math.ceil((end.getTime() - start.getTime()) / 3_600_000) + 1, 24)
  let cursor = new Date(start)
  for (let i = 0; i < hours && cursor.getTime() < end.getTime(); i++) {
    counts[cursor.getHours()]++
    cursor = new Date(cursor.getTime() + 3_600_000)
  }
}

export function computeHourlyHeatmap(feeds: FeedEntry[], sleep: SleepEntry[], diaper: DiaperEntry[], play: PlayEntry[]): HourlyHeatmap {
  const heatmap: HourlyHeatmap = {
    Feed: new Array(24).fill(0),
    Sleep: new Array(24).fill(0),
    Nappy: new Array(24).fill(0),
    Play: new Array(24).fill(0),
  }
  feeds.forEach((f) => addCoverage(heatmap.Feed, f.date, null))
  sleep.forEach((s) => addCoverage(heatmap.Sleep, s.startTime, s.endTime))
  diaper.forEach((d) => addCoverage(heatmap.Nappy, d.startTime, null))
  play.forEach((p) => addCoverage(heatmap.Play, p.startTime, p.endTime))
  return heatmap
}

/** Same shape as `computeHourlyHeatmap`, but scoped to a single calendar day. */
export function computeHourlyHeatmapForDay(
  feeds: FeedEntry[],
  sleep: SleepEntry[],
  diaper: DiaperEntry[],
  play: PlayEntry[],
  dateStr: string
): HourlyHeatmap {
  const heatmap: HourlyHeatmap = {
    Feed: new Array(24).fill(0),
    Sleep: new Array(24).fill(0),
    Nappy: new Array(24).fill(0),
    Play: new Array(24).fill(0),
  }
  buildDayEvents(feeds, sleep, diaper, play, dateStr).forEach((e) => {
    addCoverage(heatmap[e.type], e.start.toISOString(), e.end ? e.end.toISOString() : null)
  })
  return heatmap
}

// ── Daily totals & recommendations ──────────────────────────────────────────

export interface DailyTotals {
  numDays: number
  avgFeedsPerDay: number
  avgNapsPerDay: number
  avgTotalSleepHours: number
  avgNightSleepHours: number
  avgDiapersPerDay: number
}

export function computeDailyTotals(feeds: FeedEntry[], sleep: SleepEntry[], diaper: DiaperEntry[], play: PlayEntry[]): DailyTotals {
  const numDays = Math.max(1, activeDayCount(feeds, sleep, diaper, play))
  const naps = sleep.filter((s) => s.type === 'nap')
  const nights = sleep.filter((s) => s.type === 'night')

  const sleepMinutes = (entries: SleepEntry[]) =>
    entries.reduce((sum, s) => {
      if (!s.endTime) return sum
      const mins = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000
      return mins > 0 ? sum + mins : sum
    }, 0)

  return {
    numDays,
    avgFeedsPerDay: feeds.length / numDays,
    avgNapsPerDay: naps.length / numDays,
    avgTotalSleepHours: sleepMinutes(sleep) / 60 / numDays,
    avgNightSleepHours: sleepMinutes(nights) / 60 / numDays,
    avgDiapersPerDay: diaper.length / numDays,
  }
}

export type RecommendationLevel = 'good' | 'watch' | 'info'

export interface Recommendation {
  level: RecommendationLevel
  icon: string
  text: string
}

/** Shared color/label styling for a `RecommendationLevel`, used by both the
 * Insights tab's recommendation cards and each tracker tab's "next record" block. */
export const LEVEL_STYLES: Record<RecommendationLevel, { bg: string; border: string; text: string; label: string }> = {
  good: { bg: 'bg-sage-50', border: 'border-sage-200', text: 'text-sage-700', label: 'On track' },
  watch: { bg: 'bg-blush-50', border: 'border-blush-200', text: 'text-blush-600', label: 'Worth a look' },
  info: { bg: 'bg-marigold-50', border: 'border-marigold-200', text: 'text-marigold-600', label: 'Heads up' },
}

export function generateRecommendations(weeks: number, totals: DailyTotals, wakeWindows: WakeWindowResult): Recommendation[] {
  const band = getAgeBand(weeks)
  const recs: Recommendation[] = []

  // Total sleep
  const [sleepMin, sleepMax] = band.totalSleepHours
  if (totals.avgTotalSleepHours < sleepMin - 0.5) {
    recs.push({ level: 'watch', icon: '😴', text: `Averaging ${totals.avgTotalSleepHours.toFixed(1)}h of sleep/day — a bit under the ${sleepMin}–${sleepMax}h typical for ${band.label}. An earlier bedtime or one more short nap may help.` })
  } else if (totals.avgTotalSleepHours > sleepMax + 1) {
    recs.push({ level: 'info', icon: '😴', text: `Averaging ${totals.avgTotalSleepHours.toFixed(1)}h of sleep/day, on the higher side of the ${sleepMin}–${sleepMax}h typical for ${band.label} — great if baby seems well-rested, no action needed.` })
  } else {
    recs.push({ level: 'good', icon: '😴', text: `Total sleep (${totals.avgTotalSleepHours.toFixed(1)}h/day) is right in the ${sleepMin}–${sleepMax}h typical range for ${band.label}.` })
  }

  // Naps
  const [napMin, napMax] = band.naps
  if (totals.avgNapsPerDay < napMin - 0.5) {
    recs.push({ level: 'watch', icon: '☀️', text: `Averaging ${totals.avgNapsPerDay.toFixed(1)} naps/day, fewer than the ${napMin}–${napMax} typical for ${band.label}. Could be an early nap transition — or a sign of overtiredness building up during the day.` })
  } else if (totals.avgNapsPerDay > napMax + 0.5) {
    recs.push({ level: 'info', icon: '☀️', text: `Averaging ${totals.avgNapsPerDay.toFixed(1)} naps/day, more than the ${napMin}–${napMax} typical for ${band.label} — likely just shorter naps split up; keep an eye on total daytime sleep.` })
  } else {
    recs.push({ level: 'good', icon: '☀️', text: `${totals.avgNapsPerDay.toFixed(1)} naps/day fits the ${napMin}–${napMax} typical for ${band.label}.` })
  }

  // Wake windows
  if (wakeWindows.avgMinutes !== null) {
    const [wMin, wMax] = band.wakeWindowMinutes
    const avg = wakeWindows.avgMinutes
    if (avg < wMin - 15) {
      recs.push({ level: 'info', icon: '⏱️', text: `Average wake window is ${Math.round(avg)} min, shorter than the ${wMin}–${wMax} min typical for ${band.label} — fine if baby settles easily, but there may be room to stretch it slightly.` })
    } else if (avg > wMax + 20) {
      recs.push({ level: 'watch', icon: '⏱️', text: `Average wake window is ${Math.round(avg)} min, longer than the ${wMin}–${wMax} min typical for ${band.label} — watch for overtiredness cues (fussing, eye-rubbing) and try starting the next sleep a little sooner.` })
    } else {
      recs.push({ level: 'good', icon: '⏱️', text: `Average wake window (${Math.round(avg)} min) matches the ${wMin}–${wMax} min typical for ${band.label}.` })
    }
  }

  // Feeds
  const [fMin, fMax] = band.feedsPerDay
  if (totals.avgFeedsPerDay < fMin - 1) {
    recs.push({ level: 'watch', icon: '🍼', text: `Averaging ${totals.avgFeedsPerDay.toFixed(1)} feeds/day, fewer than the ${fMin}–${fMax} typical for ${band.label}. Probably fine if weight gain is on track, but worth a mention at your next check-up.` })
  } else if (totals.avgFeedsPerDay > fMax + 1) {
    recs.push({ level: 'info', icon: '🍼', text: `Averaging ${totals.avgFeedsPerDay.toFixed(1)} feeds/day, more than the ${fMin}–${fMax} typical for ${band.label} — could be a growth spurt or cluster feeding.` })
  } else {
    recs.push({ level: 'good', icon: '🍼', text: `${totals.avgFeedsPerDay.toFixed(1)} feeds/day fits the ${fMin}–${fMax} typical for ${band.label}.` })
  }

  return recs
}

// ── "Today so far" ────────────────────────────────────────────────────────────

export function fmtMin(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export interface TodaySoFar {
  dateStr: string
  /** Fractional hours elapsed since local midnight (e.g. 14.5 = 2:30pm). */
  hoursElapsed: number
  feedCount: number
  napCount: number
  nightCount: number
  /** Total sleep minutes today, counting an in-progress session up to now. */
  sleepMinutes: number
  diaperCount: number
  playCount: number
  /** Total play minutes today, counting an in-progress session up to now. */
  playMinutes: number
  currentlyAsleep: boolean
  currentlySleepType: SleepEntry['type'] | null
  currentSleepStartedAt: string | null
  currentlyPlaying: boolean
  currentPlayStartedAt: string | null
  lastFeedAgoMinutes: number | null
  /** Minutes since the most recently *ended* sleep today, if currently awake. */
  awakeSinceMinutes: number | null
}

/** Snapshot of "how today's going" as of right now, for the day given by `dateStr`. */
export function computeTodaySoFar(
  feeds: FeedEntry[],
  sleep: SleepEntry[],
  diaper: DiaperEntry[],
  play: PlayEntry[],
  dateStr: string
): TodaySoFar {
  const now = new Date()
  const hoursElapsed = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600

  const todaySleep = sleep.filter((s) => isOnDay(s.startTime, dateStr) || (s.endTime && isOnDay(s.endTime, dateStr)))
  const todayPlay = play.filter((p) => isOnDay(p.startTime, dateStr) || (p.endTime && isOnDay(p.endTime, dateStr)))
  const todayFeeds = feeds.filter((f) => isOnDay(f.date, dateStr))
  const todayDiaper = diaper.filter((d) => isOnDay(d.startTime, dateStr))

  const activeNap = todaySleep.find((s) => !s.endTime) ?? null
  const activePlay = todayPlay.find((p) => !p.endTime) ?? null

  const minutesOf = (entries: Array<{ startTime: string; endTime: string | null }>) =>
    entries.reduce((sum, e) => {
      const start = new Date(e.startTime).getTime()
      const end = e.endTime ? new Date(e.endTime).getTime() : now.getTime()
      const mins = (end - start) / 60_000
      return mins > 0 ? sum + mins : sum
    }, 0)

  const lastFeed = [...todayFeeds].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  const lastFeedAgoMinutes = lastFeed ? Math.max(0, Math.round((now.getTime() - new Date(lastFeed.date).getTime()) / 60_000)) : null

  const lastEndedSleep =
    [...todaySleep]
      .filter((s) => s.endTime)
      .sort((a, b) => new Date(b.endTime as string).getTime() - new Date(a.endTime as string).getTime())[0] ?? null
  const awakeSinceMinutes =
    !activeNap && lastEndedSleep
      ? Math.max(0, Math.round((now.getTime() - new Date(lastEndedSleep.endTime as string).getTime()) / 60_000))
      : null

  return {
    dateStr,
    hoursElapsed,
    feedCount: todayFeeds.length,
    napCount: todaySleep.filter((s) => s.type === 'nap').length,
    nightCount: todaySleep.filter((s) => s.type === 'night').length,
    sleepMinutes: minutesOf(todaySleep),
    diaperCount: todayDiaper.length,
    playCount: todayPlay.length,
    playMinutes: minutesOf(todayPlay),
    currentlyAsleep: Boolean(activeNap),
    currentlySleepType: activeNap ? activeNap.type : null,
    currentSleepStartedAt: activeNap ? activeNap.startTime : null,
    currentlyPlaying: Boolean(activePlay),
    currentPlayStartedAt: activePlay ? activePlay.startTime : null,
    lastFeedAgoMinutes,
    awakeSinceMinutes,
  }
}

/**
 * Heuristic nudges comparing today-so-far against the household's own rolling
 * average (via `totals`), plus age-based overtiredness checks — not medical
 * advice, just gentle "here's how today compares to your usual" commentary.
 */
export function generateTodayNudges(
  weeks: number,
  soFar: TodaySoFar,
  totals: DailyTotals,
  wakeWindows: WakeWindowResult,
  numDays: number
): Recommendation[] {
  const band = getAgeBand(weeks)
  const recs: Recommendation[] = []

  if (soFar.hoursElapsed < 1.5) {
    return [{ level: 'info', icon: '🌅', text: `Early yet — check back later today for how things are shaping up.` }]
  }

  // Need at least one prior day of history for a "usual pace" baseline to mean anything.
  const hasBaseline = numDays >= 2
  const frac = Math.max(soFar.hoursElapsed / 24, 1 / 24)

  if (hasBaseline) {
    const expectedFeeds = totals.avgFeedsPerDay * frac
    if (soFar.feedCount < expectedFeeds - 1.25) {
      recs.push({
        level: 'watch',
        icon: '🍼',
        text: `${soFar.feedCount} feed${soFar.feedCount === 1 ? '' : 's'} so far — a bit behind your usual pace by this hour (usually around ${expectedFeeds.toFixed(1)} by now).`,
      })
    } else if (soFar.feedCount > expectedFeeds + 1.25) {
      recs.push({
        level: 'info',
        icon: '🍼',
        text: `${soFar.feedCount} feeds already today — more than your usual pace by now. Could be a growth spurt, or just a hungrier day.`,
      })
    } else {
      recs.push({ level: 'good', icon: '🍼', text: `${soFar.feedCount} feed${soFar.feedCount === 1 ? '' : 's'} so far — right on your usual pace.` })
    }
  } else if (soFar.feedCount > 0) {
    recs.push({ level: 'info', icon: '🍼', text: `${soFar.feedCount} feed${soFar.feedCount === 1 ? '' : 's'} logged today. Nudges get smarter once there's a few days of history to compare against.` })
  }

  if (soFar.currentlyAsleep) {
    recs.push({
      level: 'good',
      icon: soFar.currentlySleepType === 'night' ? '🌙' : soFar.currentlySleepType === 'nap' ? '☀️' : '❓',
      text: `Currently ${soFar.currentlySleepType === 'night' ? 'down for the night' : soFar.currentlySleepType === 'nap' ? 'napping' : 'sleeping'} — tracking as in-progress.`,
    })
  } else if (soFar.awakeSinceMinutes !== null) {
    const [, wMax] = band.wakeWindowMinutes
    // Compare against whichever is more informative: baby's age-typical max, or
    // (once there's enough history) this household's own observed average.
    const threshold = wakeWindows.avgMinutes !== null ? Math.max(wMax, wakeWindows.avgMinutes) : wMax
    if (soFar.awakeSinceMinutes > threshold + 20) {
      recs.push({
        level: 'watch',
        icon: '⏱️',
        text: `Awake ${fmtMin(soFar.awakeSinceMinutes)} since the last sleep ended — longer than ${wakeWindows.avgMinutes !== null ? 'usual' : `the ~${wMax}-min typical max for ${band.label}`}. Watch for overtiredness cues (fussing, eye-rubbing) and consider starting the next sleep soon.`,
      })
    }
  }

  if (hasBaseline) {
    const [sleepMin] = band.totalSleepHours
    const expectedSleepHoursByNow = sleepMin * frac
    const sleepHoursSoFar = soFar.sleepMinutes / 60
    if (soFar.hoursElapsed >= 6 && sleepHoursSoFar < expectedSleepHoursByNow - 0.75) {
      recs.push({
        level: 'watch',
        icon: '😴',
        text: `${sleepHoursSoFar.toFixed(1)}h of sleep logged so far today — behind the pace needed to reach the ${sleepMin}h+ typical for ${band.label}. An earlier next nap or bedtime could help catch up.`,
      })
    }
  }

  if (recs.length === 0) {
    recs.push({ level: 'good', icon: '👍', text: `Nothing stands out yet — today's tracking close to your usual rhythm so far.` })
  }

  return recs
}
