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
