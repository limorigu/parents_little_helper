import { useState, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RefreshCw, CheckCircle2, GripVertical, Trash2, PlusCircle, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getBabyAgeWeeks, today, normaliseQuotes } from '../lib/utils'
import { generateDailyPlan, getCategoryIcon, getCategoryStyle } from '../lib/activities'
import { Button } from '../components/ui/Button'
import { PageShell } from '../components/layout/PageShell'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import type { ActivityTile } from '../store/useAppStore'
import { uid } from '../lib/utils'

function SortableTile({ tile, onComplete, onDelete }: {
  tile: ActivityTile
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const catStyle = getCategoryStyle(tile.category)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-3 p-4 bg-white rounded-2xl border transition-all ${tile.completed ? 'border-sage-200 bg-sage-50/30' : 'border-stone-100 hover:border-stone-200'} shadow-[0_1px_6px_0_rgba(44,38,30,0.06)]`}
    >
      <button
        {...listeners}
        {...attributes}
        className="mt-0.5 text-stone-300 hover:text-stone-400 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <span className="text-base">{getCategoryIcon(tile.category)}</span>
          <p className={`font-medium text-sm ${tile.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
            {tile.title}
          </p>
        </div>
        <p className="text-xs text-stone-400 mb-2">{tile.description}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${catStyle}`}>
            {tile.category}
          </span>
          <span className="text-xs text-stone-400">{tile.duration}</span>
        </div>
        {tile.source === 'local' && tile.sourceUrl && (
          <a
            href={tile.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-periwinkle-500 hover:underline mt-1 block"
          >
            View local activity →
          </a>
        )}
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => onComplete(tile.id)}
          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${tile.completed ? 'bg-sage-400 border-sage-400 text-white' : 'border-stone-200 text-stone-300 hover:border-sage-400 hover:text-sage-500'}`}
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => onDelete(tile.id)}
          className="w-7 h-7 rounded-full border border-stone-200 text-stone-300 hover:border-blush-400 hover:text-blush-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export function DailyPlan() {
  const { baby, plans, setPlan, updatePlanTiles, confirmPlan } = useAppStore()
  const todayDate = today()
  const todayPlan = plans.find((p) => p.date === todayDate)
  const [tiles, setTiles] = useState<ActivityTile[]>(todayPlan?.tiles ?? [])
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customDuration, setCustomDuration] = useState('')

  const weeks = getBabyAgeWeeks(baby.birthDate)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (!todayPlan) {
      const generated = generateDailyPlan(weeks)
      setPlan({ date: todayDate, tiles: generated, confirmedAt: null })
      setTiles(generated)
    }
  }, [])

  useEffect(() => {
    if (todayPlan) setTiles(todayPlan.tiles)
  }, [todayPlan])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tiles.findIndex((t) => t.id === active.id)
    const newIndex = tiles.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(tiles, oldIndex, newIndex)
    setTiles(reordered)
    updatePlanTiles(todayDate, reordered)
  }

  function handleComplete(id: string) {
    const updated = tiles.map((t) => t.id === id ? { ...t, completed: !t.completed } : t)
    setTiles(updated)
    updatePlanTiles(todayDate, updated)
  }

  function handleDelete(id: string) {
    const updated = tiles.filter((t) => t.id !== id)
    setTiles(updated)
    updatePlanTiles(todayDate, updated)
  }

  function handleRefresh() {
    const generated = generateDailyPlan(weeks)
    setPlan({ date: todayDate, tiles: generated, confirmedAt: null })
    setTiles(generated)
  }

  function handleAddCustom() {
    if (!customTitle.trim()) return
    const tile: ActivityTile = {
      id: uid(),
      title: customTitle.trim(),
      description: customDesc.trim(),
      duration: customDuration.trim() || '—',
      category: 'play',
      source: 'custom',
      completed: false,
    }
    const updated = [...tiles, tile]
    setTiles(updated)
    updatePlanTiles(todayDate, updated)
    setCustomTitle('')
    setCustomDesc('')
    setCustomDuration('')
    setAddModalOpen(false)
  }

  const completed = tiles.filter((t) => t.completed).length
  const confirmed = !!todayPlan?.confirmedAt

  return (
    <PageShell
      title="Today's Plan"
      subtitle={`${completed}/${tiles.length} activities done`}
      action={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="bg-stone-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-400 to-sage-500 rounded-full transition-all duration-500"
            style={{ width: tiles.length ? `${(completed / tiles.length) * 100}%` : '0%' }}
          />
        </div>

        {/* Drag-and-drop tile list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tiles.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tiles.map((tile) => (
                <SortableTile
                  key={tile.id}
                  tile={tile}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add activity */}
        <button
          onClick={() => setAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-all text-sm"
        >
          <PlusCircle size={15} /> Add your own activity
        </button>

        {/* Confirm plan */}
        <div className="pt-2">
          {confirmed ? (
            <div className="flex items-center gap-2 justify-center text-sage-600 text-sm py-2">
              <CheckCircle2 size={16} /> Plan confirmed — great day!
            </div>
          ) : (
            <Button fullWidth onClick={() => confirmPlan(todayDate)}>
              <CheckCircle2 size={16} /> Confirm this as my plan
            </Button>
          )}
        </div>

        {/* Hint */}
        <p className="text-xs text-stone-400 text-center">
          Drag tiles to reorder · tap ✓ to mark done · tap 🗑 to remove
        </p>
      </div>

      {/* Add custom modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add your own activity">
        <div className="space-y-4">
          <Input label="Activity name" value={customTitle} onChange={(e) => setCustomTitle(normaliseQuotes(e.target.value))} placeholder="e.g. Park visit with grandma" />
          <Input label="Description (optional)" value={customDesc} onChange={(e) => setCustomDesc(normaliseQuotes(e.target.value))} placeholder="Any details..." />
          <Input label="Duration (optional)" value={customDuration} onChange={(e) => setCustomDuration(normaliseQuotes(e.target.value))} placeholder="e.g. 20 min" />
          <Button fullWidth onClick={handleAddCustom}>Add activity</Button>
        </div>
      </Modal>
    </PageShell>
  )
}
