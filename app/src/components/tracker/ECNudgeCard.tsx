import { Card } from '../ui/Card'
import { formatTime } from '../../lib/utils'
import {
  fmtMin,
  pickOwnGapMinutes,
  BUCKETS,
  EC_TRIGGER_WINDOW_MIN,
  EC_GENERAL_GUIDANCE,
  LEVEL_STYLES,
  type ECOutcome,
  type ECStats,
  type ECTriggerStats,
  type TimeBucket,
  type RecommendationLevel,
} from '../../lib/insights'

const OUTCOME_META: Record<ECOutcome, { icon: string; label: string; triggerLabel: string }> = {
  pee: { icon: '💧', label: 'pee', triggerLabel: 'waking up' },
  poop: { icon: '💩', label: 'poop', triggerLabel: 'a feed' },
}

const MIN_TRIGGER_SAMPLE = 5 // below this, an own-data % is too noisy to lead with
const MIN_BUCKET_CATCH_SAMPLE = 3

/**
 * EC (elimination communication) nudge for one outcome (pee or poop): time
 * since the last one, this household's own timing + catch-rate patterns, a
 * "try now" nudge when the moment matches a known trigger, and a best-time-
 * of-day tip — plus general physiology-based guidance where personal data is
 * still thin. Shown only once a household has logged at least one `pottyResult`,
 * so non-EC households never see it.
 */
export function ECNudgeCard({
  outcome,
  ecStats,
  triggerStats,
  minutesSinceWake,
  minutesSinceFeed,
  nowBucket,
}: {
  outcome: ECOutcome
  ecStats: ECStats
  triggerStats: ECTriggerStats
  minutesSinceWake: number | null
  minutesSinceFeed: number | null
  nowBucket: TimeBucket
}) {
  const meta = OUTCOME_META[outcome]
  const { minutes: ownMinutes } = pickOwnGapMinutes(ecStats, nowBucket)

  const justWoke = outcome === 'pee' && minutesSinceWake !== null && minutesSinceWake <= EC_TRIGGER_WINDOW_MIN
  const justFed = outcome === 'poop' && minutesSinceFeed !== null && minutesSinceFeed <= EC_TRIGGER_WINDOW_MIN
  const tryNow = justWoke || justFed

  let level: RecommendationLevel = 'info'
  let headline: string
  if (tryNow) {
    level = 'good'
    headline = `Good moment to try — ${justWoke ? 'baby just woke up' : 'a feed just wrapped up'} (a common ${meta.label} window).`
  } else if (ecStats.sinceMinutes !== null && ownMinutes !== null && ecStats.sinceMinutes > ownMinutes * 1.3) {
    level = 'watch'
    headline = `${fmtMin(ecStats.sinceMinutes)} since the last ${meta.label} — longer than the usual ~${fmtMin(ownMinutes)} gap, so this might be a good time to try.`
  } else if (ecStats.lastAt === null) {
    headline = `No ${meta.label}s logged yet — log a few (caught or missed) and we'll start spotting patterns.`
  } else {
    headline = `${fmtMin(ecStats.sinceMinutes as number)} since the last ${meta.label}, at ${formatTime(ecStats.lastAt.toISOString())}.`
  }
  const style = LEVEL_STYLES[level]

  const ownTriggerPct = outcome === 'pee' ? triggerStats.afterWakePct : triggerStats.afterFeedPct
  const hasEnoughTriggerData = triggerStats.sampleSize >= MIN_TRIGGER_SAMPLE && ownTriggerPct !== null

  // Best time-of-day to try, from this household's own catch rate — only surfaced
  // once there's a reasonable sample in more than one bucket, and only if it's
  // meaningfully better than the current bucket.
  const bestBucket = BUCKETS
    .filter((b) => ecStats.catchCountByBucket[b] >= MIN_BUCKET_CATCH_SAMPLE)
    .sort((a, b) => (ecStats.catchRateByBucket[b] ?? 0) - (ecStats.catchRateByBucket[a] ?? 0))[0]
  const showBestBucketTip =
    bestBucket &&
    bestBucket !== nowBucket &&
    (ecStats.catchRateByBucket[bestBucket] ?? 0) > (ecStats.catchRateByBucket[nowBucket] ?? 0) + 0.15

  return (
    <Card padding="sm" className={`${style.bg} ${style.border}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${style.text} mb-1`}>
        {meta.icon} EC nudge · {meta.label}
      </p>
      <p className="text-sm text-stone-700 font-medium">{headline}</p>

      <div className="mt-2 space-y-1 text-xs text-stone-500 leading-relaxed">
        {ecStats.catchSampleSize > 0 && ecStats.catchRate !== null && (
          <p>
            Caught on the potty <span className="font-semibold text-stone-600">{Math.round(ecStats.catchRate * 100)}%</span> of the
            time so far (n={ecStats.catchSampleSize}, from your own logs).
          </p>
        )}

        {hasEnoughTriggerData && (
          <p>
            Of your logged {meta.label}s, <span className="font-semibold text-stone-600">{Math.round(ownTriggerPct as number)}%</span>{' '}
            happened within {EC_TRIGGER_WINDOW_MIN} min of {meta.triggerLabel} (n={triggerStats.sampleSize}, from your own logs).
          </p>
        )}

        {showBestBucketTip && (
          <p>
            Best catch rate so far tends to be in the <span className="font-semibold text-stone-600">{bestBucket.toLowerCase()}</span>{' '}
            ({Math.round((ecStats.catchRateByBucket[bestBucket] as number) * 100)}%, n={ecStats.catchCountByBucket[bestBucket]}) —
            worth prioritizing potty visits then.
          </p>
        )}

        <p className="italic">{EC_GENERAL_GUIDANCE[outcome]} (General physiology, not measured from your own data.)</p>
      </div>
    </Card>
  )
}
