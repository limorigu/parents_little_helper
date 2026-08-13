import { useState } from 'react'
import { Star } from 'lucide-react'
import { ALL_MILESTONES, getCategoryStickerBg, getCategoryIcon, getCategoryLabel } from '../../lib/milestones'
import { formatShort } from '../../lib/utils'
import type { RecordedMilestone } from '../../store/useAppStore'
import { Card } from '../ui/Card'

interface StickerBookProps {
  recordedMilestones: RecordedMilestone[]
}

/**
 * "The digital sticker book" — every recorded milestone becomes a collectible,
 * overlapping circular sticker (colour + icon by category, gold star ring for
 * overachiever moments). Tapping a sticker reveals which moment it represents.
 * Purely a celebratory alternate view; the flat "recorded moments" list below
 * still holds the detailed record.
 */
export function StickerBook({ recordedMilestones }: StickerBookProps) {
  const [selected, setSelected] = useState<string | null>(null)

  if (recordedMilestones.length === 0) return null

  const sorted = [...recordedMilestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const active = sorted.find((r) => r.id === selected) ?? null

  return (
    <Card className="bg-gradient-to-br from-cream-200 to-cream-100 border-cream-300">
      <p className="font-display text-base font-black text-stone-800 mb-1">Your sticker book</p>
      <p className="text-xs text-stone-400 mb-4">
        {sorted.length} collectible sticker{sorted.length !== 1 ? 's' : ''} earned so far — tap one to peek.
      </p>

      <div className="flex flex-wrap gap-x-1 gap-y-3">
        {sorted.map((r, i) => {
          const m = ALL_MILESTONES.find((x) => x.id === r.milestoneId)
          const category = m?.category ?? 'sensory'
          const isSelected = selected === r.id
          return (
            <button
              key={r.id}
              onClick={() => setSelected((cur) => (cur === r.id ? null : r.id))}
              style={{ marginLeft: i === 0 ? 0 : '-0.6rem', zIndex: isSelected ? 20 : i }}
              className={`relative w-14 h-14 rounded-full ${getCategoryStickerBg(category)} border-[3px] border-stone-800 shadow-brutal-sm flex items-center justify-center text-2xl transition-all hover:-translate-y-1 hover:z-10 ${isSelected ? '-translate-y-1 ring-4 ring-marigold-300' : ''}`}
              title={r.title}
            >
              {r.mediaUrl ? (
                <img src={r.mediaUrl} alt={r.title} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{getCategoryIcon(category)}</span>
              )}
              {m?.isOverachiever && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-marigold-400 border-2 border-stone-800 flex items-center justify-center">
                  <Star size={9} className="text-white fill-white" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {active && (
        <div className="mt-4 pt-3 border-t-2 border-cream-300 flex items-start gap-3">
          <div>
            <p className="text-sm font-medium text-stone-700">{active.title}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {formatShort(active.date)} · Week {active.week}
              {(() => {
                const m = ALL_MILESTONES.find((x) => x.id === active.milestoneId)
                return m ? ` · ${getCategoryLabel(m.category)}` : ''
              })()}
            </p>
            {active.notes && <p className="text-sm text-stone-500 mt-1">{active.notes}</p>}
          </div>
        </div>
      )}
    </Card>
  )
}
