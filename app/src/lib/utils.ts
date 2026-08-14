import { differenceInDays, differenceInWeeks, format, parseISO } from 'date-fns'

export function getBabyAgeWeeks(birthDate: string): number {
  if (!birthDate) return 0
  return differenceInWeeks(new Date(), parseISO(birthDate))
}

export function getBabyAgeDays(birthDate: string): number {
  if (!birthDate) return 0
  return differenceInDays(new Date(), parseISO(birthDate))
}

export function getBabyAgeLabel(birthDate: string): string {
  const days = getBabyAgeDays(birthDate)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} old`
  const weeks = Math.floor(days / 7)
  const remaining = days % 7
  if (weeks < 4) {
    return remaining > 0
      ? `${weeks}w ${remaining}d old`
      : `${weeks} week${weeks !== 1 ? 's' : ''} old`
  }
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} old`
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? 's' : ''} old`
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'do MMMM yyyy')
  } catch {
    return iso
  }
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'h:mm a')
  } catch {
    return iso
  }
}

export function formatShort(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM')
  } catch {
    return iso
  }
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// ── Timestamp normalisation ──────────────────────────────────────────────────
//
// Entries are stored as *local naive* timestamps ("2026-08-13T14:30:00") rather
// than UTC, because the whole app buckets entries into calendar days by string
// prefix — a feed at 00:30 on the 13th has to read as the 13th for the parent
// looking at it, regardless of what UTC thinks. The helpers below are the single
// place that assumption is enforced, and they stay tolerant of older entries that
// were written as UTC ISO strings ("…Z") before this was made consistent.

/** Local naive timestamp for writing a new entry, e.g. "2026-08-13T14:30:00". */
export function nowLocalIso(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
}

/**
 * Coerce any stored timestamp into exactly the shape `<input type="datetime-local">`
 * accepts ("yyyy-MM-ddTHH:mm", local time). Anything else — a UTC string with a
 * "Z" suffix or milliseconds, in particular — is silently rejected by the browser
 * and renders as an empty field, which is how quick-logged entries ended up
 * looking un-editable.
 */
export function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

/**
 * Sensible default for an empty "End time" field once the user starts filling
 * it in: same calendar date as the start time, same clock time (so they only
 * need to nudge the minutes/hours forward) — unless the start time is at or
 * after 23:00, in which case the session very likely rolls into the next day,
 * so the default date is bumped forward one day.
 */
export function defaultEndFor(startIso: string | null | undefined): string {
  if (!startIso) return ''
  const d = new Date(startIso)
  if (Number.isNaN(d.getTime())) return ''
  if (d.getHours() >= 23) d.setDate(d.getDate() + 1)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

/** The local calendar day ("yyyy-MM-dd") a stored timestamp belongs to. */
export function localDayKey(iso: string): string {
  if (!iso) return ''
  // Already a bare date — don't round-trip it through Date(), which would treat
  // it as UTC midnight and shift it a day backwards west of Greenwich.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return format(d, 'yyyy-MM-dd')
}

// Short, friendly "how long ago" label for quick-log recent-activity chips.
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

// Elapsed duration label for an in-progress session (active sleep/play entry).
export function elapsedSince(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`
}

// Normalise curly/smart quotes to straight ASCII equivalents.
// Applies to any string coming from user input, clipboard paste, or static data,
// so apostrophes never cause downstream parse or display issues.
export function normaliseQuotes(s: string): string {
  return s
    .replace(/[‘’ʼʹ]/g, "'") // curly single quotes → '
    .replace(/[“”]/g, '"')              // curly double quotes → "
}

// Growth chart WHO percentile approximations (female/male merged for simplicity)
// weight-for-age median in grams by week
export const WHO_WEIGHT_MEDIAN: Record<number, number> = {
  0: 3300, 2: 3900, 4: 4500, 6: 5100, 8: 5600, 10: 6100,
  12: 6500, 16: 7200, 20: 7800, 24: 8400,
}

export function getSleepTotalHours(
  sleepEntries: Array<{ startTime: string; endTime: string | null; type: string }>,
  date: string
): { night: number; nap: number } {
  const dayEntries = sleepEntries.filter(
    (s) => s.startTime.startsWith(date) || (s.endTime && s.endTime.startsWith(date))
  )
  let night = 0
  let nap = 0
  for (const s of dayEntries) {
    if (!s.endTime) continue
    const mins =
      (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
    if (s.type === 'night') night += mins
    else nap += mins
  }
  return { night: +(night / 60).toFixed(1), nap: +(nap / 60).toFixed(1) }
}
