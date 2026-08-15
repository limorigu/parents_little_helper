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
}: {
  activityType: ActivityType
  label: string
  gapStats: GapStats
  expected: ExpectedGap
  sequenceHint: SequenceCount | null
  nowBucket: TimeBucket
}) {
  const { minutes: ownMinutes, isBucketSpecific: usingBucketAvg } = pickOwnGapMinutes(gapStats, nowBucket)
  const literatureMid = expected.available ? (expected.minMinutes! + expected.maxMinutes!) / 2 : null
  const referenceMinutes = ownMinutes ?? literatureMid

  const nextAt =
    gapStats.lastAt && referenceMinutes !== null ? new Date(gapStats.lastAt.getTime() + referenceMinutes * 60_000) : null

  let level: RecommendationLevel = 'info'
  if (gapStats.sinceMinutes !== null && referenceMinutes !== null) {
    level = gapStats.sinceMinutes > referenceMinutes * 1.3 ? 'watch' : 'good'
  }
  const style = LEVEL_STYLES[level]

  return (
    <Card padding="sm" className={`${style.bg} ${style.border}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${style.text} mb-1`}>
        {ACTIVITY_EMOJI[activityType]} Since your last {label}
      </p>

      {gapStats.lastAt === null ? (
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
