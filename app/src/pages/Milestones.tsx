import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ALL_MILESTONES, getMilestonesForWeek, getUpcomingMilestones, getCategoryColor, getCategoryLabel } from '../lib/milestones'
import { getBabyAgeWeeks } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'
import { StickerBook } from '../components/milestones/StickerBook'
import type { MilestoneCategory } from '../store/useAppStore'

const CATEGORY_FILTERS: Array<{ value: MilestoneCategory | 'all' | 'overachiever'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'motor', label: 'Motor' },
  { value: 'social', label: 'Social' },
  { value: 'language', label: 'Language' },
  { value: 'cognitive', label: 'Cognitive' },
  { value: 'sensory', label: 'Sensory' },
  { value: 'overachiever', label: '⭐ Overachiever' },
]

function MilestoneCard({ milestone, recorded }: { milestone: ReturnType<typeof getMilestonesForWeek>[number]; recorded: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={`transition-all ${recorded ? 'border-sage-200 bg-sage-50/40' : ''}`}>
      <button
        className="w-full text-left flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${recorded ? 'bg-sage-500' : milestone.isOverachiever ? 'bg-marigold-400' : 'bg-stone-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-stone-700 text-sm">{milestone.title}</p>
            {milestone.isOverachiever && (
              <Badge className="bg-marigold-100 text-marigold-600">
                <Star size={10} className="inline" /> overachiever
              </Badge>
            )}
            {recorded && <Badge className="bg-sage-100 text-sage-700">recorded</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getCategoryColor(milestone.category)}>{getCategoryLabel(milestone.category)}</Badge>
            <span className="text-xs text-stone-400">Week {milestone.week}</span>
          </div>
        </div>
        <span className="text-stone-400 shrink-0 mt-0.5">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-3 ml-5">
          <p className="text-sm text-stone-600">{milestone.description}</p>
          {milestone.supportingActivities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-500 mb-1.5">Supporting activities</p>
              <ul className="space-y-1">
                {milestone.supportingActivities.map((a, i) => (
                  <li key={i} className="text-xs text-stone-500 flex items-start gap-1.5">
                    <span className="text-sage-400 mt-0.5">•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!recorded && (
            <Link to="/milestones/record" state={{ milestoneId: milestone.id }}>
              <Button variant="secondary" size="sm">Record this milestone</Button>
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}

export function Milestones() {
  const { baby, recordedMilestones } = useAppStore()
  const weeks = getBabyAgeWeeks(baby.birthDate)
  const [filter, setFilter] = useState<MilestoneCategory | 'all' | 'overachiever'>('all')
  const [showUpcoming, setShowUpcoming] = useState(false)

  const current = getMilestonesForWeek(weeks)
  const upcoming = getUpcomingMilestones(weeks)
  const recordedIds = new Set(recordedMilestones.map((r) => r.milestoneId).filter(Boolean))

  const filtered = (showUpcoming ? [...current, ...upcoming] : current).filter((m) => {
    if (filter === 'all') return true
    if (filter === 'overachiever') return m.isOverachiever
    return m.category === filter
  })

  const flagged = recordedMilestones.filter((r) => {
    const m = ALL_MILESTONES.find((x) => x.id === r.milestoneId)
    if (!m) return false
    return r.week < m.week - 2
  })

  return (
    <PageShell
      title="Milestones"
      subtitle={`Week ${weeks} · ${current.length} milestones in focus`}
      action={
        <Link to="/milestones/record">
          <Button size="sm"><Plus size={15} /> Record</Button>
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Flags */}
        {flagged.length > 0 && (
          <Card className="bg-marigold-50 border-marigold-200">
            <p className="text-sm font-medium text-marigold-700 mb-1">Something to discuss with your doctor</p>
            <p className="text-xs text-marigold-600">
              You've logged {flagged.length} milestone{flagged.length > 1 ? 's' : ''} that appeared earlier than typical. This is often perfectly fine, but worth noting at your next visit.
            </p>
          </Card>
        )}

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${filter === f.value ? 'bg-stone-800 text-cream-50' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Milestones list */}
        {filtered.length === 0 ? (
          <EmptyState icon="🌱" title="No milestones match this filter" />
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MilestoneCard key={m.id} milestone={m} recorded={recordedIds.has(m.id)} />
            ))}
          </div>
        )}

        {/* Toggle upcoming */}
        <button
          onClick={() => setShowUpcoming((v) => !v)}
          className="w-full text-sm text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1 py-2 transition-colors"
        >
          {showUpcoming ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showUpcoming ? 'Hide upcoming milestones' : 'Show upcoming milestones (next 4 weeks)'}
        </button>

        {/* Digital sticker book */}
        <StickerBook recordedMilestones={recordedMilestones} />

        {/* Recorded milestones timeline */}
        {recordedMilestones.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-stone-700 mb-3">Your recorded moments</h2>
            <div className="space-y-2">
              {recordedMilestones.map((r) => {
                const m = ALL_MILESTONES.find((x) => x.id === r.milestoneId)
                return (
                  <Card key={r.id} padding="sm" className="flex items-center gap-3">
                    {r.mediaUrl && (
                      <img src={r.mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{r.title}</p>
                      <p className="text-xs text-stone-400">{r.date} · Week {r.week}</p>
                    </div>
                    {m && r.week < m.week && (
                      <Badge className="bg-marigold-100 text-marigold-600 shrink-0">early</Badge>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
