import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { uid, today } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'

type Metric = 'weight' | 'height' | 'head'

const METRIC_LABELS: Record<Metric, { label: string; unit: string }> = {
  weight: { label: 'Weight', unit: 'g' },
  height: { label: 'Height', unit: 'cm' },
  head: { label: 'Head circumference', unit: 'cm' },
}

function AddGrowthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addGrowth } = useAppStore()
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [head, setHead] = useState('')
  const [notes, setNotes] = useState('')

  function save() {
    addGrowth({
      id: uid(),
      date,
      weightGrams: weight ? Number(weight) : null,
      heightCm: height ? Number(height) : null,
      headCircCm: head ? Number(head) : null,
      notes,
    })
    setWeight(''); setHeight(''); setHead(''); setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log measurements">
      <div className="space-y-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Weight (grams)" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 4200" />
        <Input label="Height (cm)" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 52.5" />
        <Input label="Head circumference (cm)" type="number" value={head} onChange={(e) => setHead(e.target.value)} placeholder="e.g. 36.0" />
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Measured at clinic visit" />
        <Button fullWidth onClick={save} disabled={!weight && !height && !head}>Save measurements</Button>
      </div>
    </Modal>
  )
}

export function GrowthChart() {
  const { baby, growth } = useAppStore()
  const [metric, setMetric] = useState<Metric>('weight')
  const [addModal, setAddModal] = useState(false)

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
      action={<Button size="sm" onClick={() => setAddModal(true)}><Plus size={15} /> Add</Button>}
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
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${metric === m ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
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
            action={<Button size="sm" onClick={() => setAddModal(true)}>Add measurement</Button>}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8c8277' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8c8277' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e8e4dc', fontSize: 12 }}
                  formatter={(v) => `${v} ${METRIC_LABELS[metric].unit}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6e976e"
                  strokeWidth={2.5}
                  dot={{ fill: '#6e976e', r: 4 }}
                  activeDot={{ r: 6 }}
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
                <Card key={g.id} padding="sm" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{g.date}</p>
                    <p className="text-xs text-stone-400">
                      {g.weightGrams ? `${(g.weightGrams / 1000).toFixed(2)}kg` : ''}
                      {g.heightCm ? ` · ${g.heightCm}cm` : ''}
                      {g.headCircCm ? ` · hc ${g.headCircCm}cm` : ''}
                    </p>
                    {g.notes && <p className="text-xs text-stone-400 mt-0.5">{g.notes}</p>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddGrowthModal open={addModal} onClose={() => setAddModal(false)} />
    </PageShell>
  )
}
