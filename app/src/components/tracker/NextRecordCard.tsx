import { Card } from '../ui/Card'
import { formatTime } from '../../lib/utils'
import {
  fmtMin,
  pickOwnGapMinutes,
  ACTIVITY_EMOJI,
  LEVEL_STYLES,
  type ActivityType,
  type GapStats,
  type ExpectedGap,
  type SequenceCount,
  type TimeBucket,
  type RecommendationLevel,
} from '../../lib/insights'

/**
 * Per-category "time since last record" + "next record estimate" block, shown
 * on each Tracker tab (Feed/Sleep/Nappy/Play). Combines this household's own
 * logged gaps (bucketed by time of day) with an age-banded literature estimate
 * where this app actually has one — and says so plainly where it doesn't,
 * rather than inventing a number for Nappy/Play.
 */
export function NextRecordCard({
  activityType,
  label,
  gapStats,
  expected,
  sequenceHint,
  nowBucket,
  activeSince,
}: {
  activityType: ActivityType
  label: string
  gapStats: GapStats
  expected: ExpectedGap
  sequenceHint: SequenceCount | null
  nowBucket: TimeBucket
  // ISO timestamp of an in-progress session of this same type (e.g. an active
  // feed/sleep/play session), if there is one right now. When set, the "next
  // X might land around…" estimate is suppressed — that projection is drawn
  // from *past* gaps and makes no sense to show while one is already underway
  // (it can even land in the past, which reads as flatly wrong mid-session).
  activeSince?: string | null
}) {
  const isActive = Boolean(activeSince)
  // Elapsed time for the in-progress session, recomputed fresh on every
  // render — the parent (Tracker) ticks its own state periodically so this
  // stays live rather than freezing at mount time.
  const activeMinutes = activeSince ? Math.max(0, (Date.now() - new Date(activeSince).getTime()) / 60_000) : null
  const { minutes: ownMinutes, isBucketSpecific: usingBucketAvg } = pickOwnGapMinutes(gapStats, nowBucket)
  const literatureMid = expected.available ? (expected.minMinutes! + expected.maxMinutes!) / 2 : null
  const referenceMinutes = ownMinutes ?? literatureMid

  const nextAt =
    !isActive && gapStats.lastAt && referenceMinutes !== null
      ? new Date(gapStats.lastAt.getTime() + referenceMinutes * 60_000)
      : null

  let level: RecommendationLevel = 'info'
  if (isActive) {
    // A session is already underway, so whatever gap preceded it is moot —
    // don't flag "watch" based on time since the previous (already-superseded)
    // record.
    level = 'good'
  } else if (gapStats.sinceMinutes !== null && referenceMinutes !== null) {
    level = gapStats.sinceMinutes > referenceMinutes * 1.3 ? 'watch' : 'good'
  }
  const style = LEVEL_STYLES[level]

  return (
    <Card padding="sm" className={`${style.bg} ${style.border}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${style.text} mb-1`}>
        {ACTIVITY_EMOJI[activityType]} {isActive ? `${label} status` : `Since your last ${label}`}
      </p>

      {isActive ? (
        gapStats.lastAt === null ? (
          <p className="text-sm text-stone-700 font-medium">
            One's in progress right now ({fmtMin(activeMinutes as number)} so far) — this'll be your first logged {label}.
          </p>
        ) : (
          <p className="text-sm text-stone-700 font-medium">
            One's in progress right now ({fmtMin(activeMinutes as number)} so far). The last completed {label} before that was{' '}
            {fmtMin(gapStats.sinceMinutes as number)} earlier, at {formatTime(gapStats.lastAt.toISOString())}.
          </p>
        )
      ) : gapStats.lastAt === null ? (
        <p className="text-sm text-stone-600">No {label}s logged yet — once you start, we'll track the gaps for you.</p>
      ) : (
        <p className="text-sm text-stone-700 font-medium">
          {fmtMin(gapStats.sinceMinutes as number)} ago, at {formatTime(gapStats.lastAt.toISOString())}
        </p>
      )}

      <div className="mt-2 space-y-1 text-xs text-stone-500 leading-relaxed">
        {gapStats.avgMinutes !== null ? (
          <p>
            Your own logs: usually about <span className="font-semibold text-stone-600">{fmtMin(ownMinutes as number)}</span>{' '}
            between {label}s{usingBucketAvg ? ` around this time of day (${nowBucket.toLowerCase()})` : ' overall'}
            {usingBucketAvg
              ? ` (${gapStats.byBucketSampleSize[nowBucket]} ${nowBucket.toLowerCase()} gaps logged)`
              : gapStats.sampleSize > 0
                ? ` (not enough ${nowBucket.toLowerCase()}-specific history yet — ${gapStats.sampleSize} gaps logged overall)`
                : ''}
            .
          </p>
        ) : (
          <p>Not enough history yet to estimate your typical gap from your own logs.</p>
        )}

        {expected.available ? (
          <p>
            Typical for {expected.ageLabel}: every {fmtMin(expected.minMinutes as number)}–{fmtMin(expected.maxMinutes as number)}{' '}
            (general reference range, not medical advice).
          </p>
        ) : (
          <p className="italic">{expected.unavailableNote}</p>
        )}

        {sequenceHint && (
          <p>
            In the {nowBucket.toLowerCase()}, {label} is usually followed by {ACTIVITY_EMOJI[sequenceHint.to]} {sequenceHint.to}{' '}
            ({sequenceHint.pct.toFixed(0)}% of the time, from your own logs).
          </p>
        )}

        {nextAt && (
          <p className="font-semibold text-stone-600">Next {label} might land around {formatTime(nextAt.toISOString())}.</p>
        )}
      </div>
    </Card>
  )
}
