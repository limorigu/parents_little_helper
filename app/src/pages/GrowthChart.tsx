import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { uid, today } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'
import type { GrowthEntry } from '../store/useAppStore'

type Metric = 'weight' | 'height' | 'head'

const METRIC_LABELS: Record<Metric, { label: string; unit: string }> = {
  weight: { label: 'Weight', unit: 'g' },
  height: { label: 'Height', unit: 'cm' },
  head: { label: 'Head circumference', unit: 'cm' },
}

function AddGrowthModal({ open, onClose, editEntry }: { open: boolean; onClose: () => void; editEntry?: GrowthEntry | null }) {
  const { addGrowth, updateGrowth } = useAppStore()
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [head, setHead] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (editEntry) {
      setDate(editEntry.date)
      setWeight(editEntry.weightGrams ? String(editEntry.weightGrams) : '')
      setHeight(editEntry.heightCm ? String(editEntry.heightCm) : '')
      setHead(editEntry.headCircCm ? String(editEntry.headCircCm) : '')
      setNotes(editEntry.notes)
    } else {
      setDate(today())
      setWeight('')
      setHeight('')
      setHead('')
      setNotes('')
    }
  }, [open, editEntry])

  function save() {
    const fields = {
      date,
      weightGrams: weight ? Number(weight) : null,
      heightCm: height ? Number(height) : null,
      headCircCm: head ? Number(head) : null,
      notes,
    }
    if (editEntry) {
      updateGrowth(editEntry.id, fields)
    } else {
      addGrowth({ id: uid(), ...fields })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? 'Edit measurements' : 'Log measurements'}>
      <div className="space-y-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Weight (grams)" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 4200" />
        <Input label="Height (cm)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 52.5" />
        <Input label="Head circumference (cm)" type="number" value={head} onChange={(e) => setHead(e.target.value)} placeholder="e.g. 36.0" />
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Measured at clinic visit" />
        <Button fullWidth onClick={save} disabled={!weight && !height && !head}>{editEntry ? 'Save changes' : 'Save measurements'}</Button>
      </div>
    </Modal>
  )
}

export function GrowthChart() {
  const { baby, growth, deleteGrowth } = useAppStore()
  const [metric, setMetric] = useState<Metric>('weight')
  const [addModal, setAddModal] = useState(false)
  const [editEntry, setEditEntry] = useState<GrowthEntry | null>(null)

  function openEdit(entry: GrowthEntry) {
    setEditEntry(entry)
    setAddModal(true)
  }

  const sorted = [...growth].sort((a, b) => a.date.localeCompare(b.date))

  const chartData = sorted.map((g) => ({
    date: g.date.slice(5), // MM-DD
    value:
      metric === 'weight' ? g.weightGrams
      : metric === 'height' ? g.heightCm
      : g.headCircCm,
  })).filter((d) => d.value !== null)

  // WHO median reference line (weight only)
  const birthWeight = baby.birthWeight
  const latestWeight = sorted.filter((g) => g.weightGrams).slice(-1)[0]?.weightGrams

  const weightChange = birthWeight && latestWeight ? latestWeight - birthWeight : null

  const latest = sorted.slice(-1)[0]

  return (
    <PageShell
      title="Growth"
      subtitle="Track weight, height & head circumference"
      action={<Button size="sm" onClick={() => { setEditEntry(null); setAddModal(true) }}><Plus size={15} /> Add</Button>}
    >
      <div className="space-y-5">
        {/* Summary cards */}
        {latest && (
          <div className="grid grid-cols-3 gap-3">
            <Card padding="sm" className="text-center">
              <p className="text-xl font-display text-stone-800">{latest.weightGrams ? `${(latest.weightGrams / 1000).toFixed(2)}kg` : '—'}</p>
              <p className="text-xs text-stone-400 mt-0.5">weight</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xl font-display text-stone-800">{latest.heightCm ? `${latest.heightCm}cm` : '—'}</p>
              <p className="text-xs text-stone-400 mt-0.5">height</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xl font-display text-stone-800">{latest.headCircCm ? `${latest.headCircCm}cm` : '—'}</p>
              <p className="text-xs text-stone-400 mt-0.5">head circ.</p>
            </Card>
          </div>
        )}

        {weightChange !== null && (
          <Card padding="sm" className="bg-sage-50 border-sage-200">
            <p className="text-sm text-sage-700">
              {weightChange >= 0
                ? `🌱 ${(weightChange / 1000).toFixed(2)}kg gained since birth — lovely growth!`
                : `⚠️ ${Math.abs(weightChange)}g below birth weight — mention this at your next check-up.`}
            </p>
          </Card>
        )}

        {/* Metric selector */}
        <div className="flex bg-stone-100 rounded-2xl p-1">
          {(['weight', 'height', 'head'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${metric === m ? 'bg-cream-50 text-stone-800 ring-2 ring-inset ring-stone-800' : 'text-stone-500'}`}
            >
              {METRIC_LABELS[m].label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartData.length < 2 ? (
          <EmptyState
            icon="📈"
            title="Log at least 2 measurements to see your chart"
            action={<Button size="sm" onClick={() => { setEditEntry(null); setAddModal(true) }}>Add measurement</Button>}
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="p-4 pb-2">
              <p className="text-sm font-medium text-stone-600">
                {METRIC_LABELS[metric].label} ({METRIC_LABELS[metric].unit})
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ left: -10, right: 16, top: 8, bottom: 8 }}>
                {/* Colours go through the theme's CSS variables rather than literal
                    hexes so the chart flips with Night Owl mode like everything else.
                    Dot outlines use --color-charcoal, which is deliberately NOT
                    overridden in .dark — the dot fill stays bright in both themes, so
                    its outline has to stay dark in both themes too. */}
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-cream-300)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-stone-400)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-stone-400)' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '2px solid var(--color-stone-800)',
                    background: 'var(--color-cream-50)',
                    color: 'var(--color-stone-800)',
                    fontSize: 12,
                  }}
                  itemStyle={{ color: 'var(--color-stone-800)' }}
                  labelStyle={{ color: 'var(--color-stone-600)' }}
                  formatter={(v) => `${v} ${METRIC_LABELS[metric].unit}`}
                />
                {/* isAnimationActive={false}: recharts draws the line in by animating
                    stroke-dasharray from 0, but under React 19 the animation never
                    starts — the path was left permanently at `1.39px 273px`, i.e. an
                    invisible line with only the dots showing. Rendering it statically
                    is both correct and better for prefers-reduced-motion. */}
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-sage-500)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-sage-500)', stroke: 'var(--color-charcoal)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'var(--color-charcoal)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Raw log */}
        {sorted.length > 0 && (
          <div>
            <h2 className="font-display text-base text-stone-700 mb-3">Measurement log</h2>
            <div className="space-y-2">
              {[...sorted].reverse().map((g) => (
                <Card key={g.id} padding="sm" className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-700">{g.date}</p>
                    <p className="text-xs text-stone-400">
                      {g.weightGrams ? `${(g.weightGrams / 1000).toFixed(2)}kg` : ''}
                      {g.heightCm ? ` · ${g.heightCm}cm` : ''}
                      {g.headCircCm ? ` · hc ${g.headCircCm}cm` : ''}
                    </p>
                    {g.notes && <p className="text-xs text-stone-400 mt-0.5">{g.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEdit(g)} className="text-stone-400 hover:text-periwinkle-500 transition-colors" aria-label="Edit measurement">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteGrowth(g.id)} className="text-stone-400 hover:text-blush-500 transition-colors" aria-label="Delete measurement">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddGrowthModal
        open={addModal}
        onClose={() => { setAddModal(false); setEditEntry(null) }}
        editEntry={editEntry}
      />
    </PageShell>
  )
}
