import { useState } from 'react'
import { Plus, CheckCircle2, Circle, FileText } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getBabyAgeWeeks, uid, formatDate, normaliseQuotes } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'
import { VisitBrief } from '../components/doctor/VisitBrief'

function getAutoQuestions(weeks: number): string[] {
  const base = [
    "Is baby's weight gain on track?",
    'Any concerns about feeding — latching, duration, frequency?',
    'Are the current vaccines up to date?',
  ]
  if (weeks < 6) base.push('How do I know if baby is getting enough milk?', 'What are normal newborn stool patterns?')
  if (weeks >= 6 && weeks < 16) base.push('When should we introduce vitamin D drops?', 'How much tummy time is recommended?')
  if (weeks >= 16) base.push('When can we start introducing solid foods?', 'Are there signs of developmental delay to watch for?')
  if (weeks >= 20) base.push('How do I handle sleep regressions?')
  return base
}

export function DoctorPrep() {
  const { baby, doctorVisits, addDoctorVisit, updateDoctorVisit, growth, recordedMilestones } = useAppStore()
  const weeks = getBabyAgeWeeks(baby.birthDate)
  const [addModal, setAddModal] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newType, setNewType] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [customQ, setCustomQ] = useState('')

  const autoQs = getAutoQuestions(weeks)
  const activeVisit = doctorVisits.find((v) => v.id === selectedVisit) ?? doctorVisits.find((v) => !v.completed)

  function createVisit() {
    const visit = {
      id: uid(),
      date: newDate,
      type: newType || 'Well-child check',
      notes: newNotes,
      questions: autoQs,
      completed: false,
    }
    addDoctorVisit(visit)
    setNewDate(''); setNewType(''); setNewNotes('')
    setAddModal(false)
    setSelectedVisit(visit.id)
  }

  function toggleQuestion(visitId: string, q: string) {
    const visit = doctorVisits.find((v) => v.id === visitId)
    if (!visit) return
    const questions = visit.questions.includes(q)
      ? visit.questions.filter((x) => x !== q)
      : [...visit.questions, q]
    updateDoctorVisit(visitId, { questions })
  }

  function addCustomQuestion(visitId: string) {
    if (!customQ.trim()) return
    const visit = doctorVisits.find((v) => v.id === visitId)
    if (!visit) return
    updateDoctorVisit(visitId, { questions: [...visit.questions, customQ.trim()] })
    setCustomQ('')
  }

  function markComplete(visitId: string) {
    updateDoctorVisit(visitId, { completed: true })
    setSelectedVisit(null)
  }

  return (
    <PageShell
      title="Doctor prep"
      subtitle="Never forget to ask what matters"
      action={<Button size="sm" onClick={() => setAddModal(true)}><Plus size={15} /> New visit</Button>}
    >
      <div className="space-y-5">
        {/* Age-appropriate tip */}
        <Card className="bg-periwinkle-50 border-periwinkle-200">
          <p className="text-sm text-periwinkle-700">
            <span className="font-medium">At week {weeks}:</span>{' '}
            {weeks < 6
              ? "Your first postnatal check is key — don't hesitate to ask about your own recovery too."
              : weeks < 16
              ? 'This is a great time to discuss feeding patterns, sleep, and the upcoming vaccinations.'
              : 'Starting solid foods is coming up — prepare your questions now so you feel confident.'}
          </p>
        </Card>

        {/* Active visit */}
        {activeVisit && !activeVisit.completed && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-stone-700">
                {activeVisit.type} · {formatDate(activeVisit.date)}
              </h2>
              <Badge className="bg-marigold-100 text-marigold-600">upcoming</Badge>
            </div>

            <div className="space-y-2 mb-4">
              {activeVisit.questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => toggleQuestion(activeVisit.id, q)}
                  className="w-full flex items-start gap-3 text-left p-3 rounded-xl bg-cream-50 border border-stone-100 hover:border-stone-200 transition-all"
                >
                  <span className={`mt-0.5 shrink-0 ${true ? 'text-stone-400' : 'text-sage-500'}`}>
                    <Circle size={16} />
                  </span>
                  <span className="text-sm text-stone-700">{q}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={customQ}
                onChange={(e) => setCustomQ(normaliseQuotes(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && addCustomQuestion(activeVisit.id)}
                placeholder="Add your own question…"
                className="flex-1 rounded-xl border border-stone-200 bg-cream-50 px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
              <Button variant="secondary" size="sm" onClick={() => addCustomQuestion(activeVisit.id)}>Add</Button>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setBriefOpen(true)}>
                <FileText size={15} /> Generate brief
              </Button>
              <Button fullWidth onClick={() => markComplete(activeVisit.id)}>
                <CheckCircle2 size={15} /> Mark visit as done
              </Button>
            </div>
          </div>
        )}

        {/* No visits */}
        {doctorVisits.filter((v) => !v.completed).length === 0 && (
          <EmptyState
            icon="🩺"
            title="No upcoming visits"
            description="Add an appointment and we'll prepare your questions automatically based on baby's age."
            action={<Button size="sm" onClick={() => setAddModal(true)}>Schedule a visit</Button>}
          />
        )}

        {/* Past visits */}
        {doctorVisits.filter((v) => v.completed).length > 0 && (
          <div>
            <h2 className="font-display text-lg text-stone-700 mb-3">Past visits</h2>
            <div className="space-y-2">
              {doctorVisits.filter((v) => v.completed).map((v) => (
                <Card key={v.id} padding="sm" className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-sage-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-600">{v.type}</p>
                    <p className="text-xs text-stone-400">{formatDate(v.date)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Schedule a visit">
        <div className="space-y-4">
          <Input label="Date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Input label="Visit type" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="e.g. Well-child check, vaccination" />
          <Textarea label="Notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} placeholder="Clinic name, doctor, etc." />
          <p className="text-xs text-stone-400">
            We'll pre-populate your questions list based on {baby.name ? `${baby.name}'s` : "your baby's"} age at week {weeks}.
          </p>
          <Button fullWidth onClick={createVisit} disabled={!newDate}>Create visit</Button>
        </div>
      </Modal>

      {activeVisit && (
        <Modal open={briefOpen} onClose={() => setBriefOpen(false)} title="Visit brief">
          <VisitBrief
            baby={baby}
            visit={activeVisit}
            weeks={weeks}
            growth={growth}
            recordedMilestones={recordedMilestones}
          />
        </Modal>
      )}
    </PageShell>
  )
}
