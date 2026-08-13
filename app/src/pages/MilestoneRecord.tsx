import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { ALL_MILESTONES, getCategoryLabel } from '../lib/milestones'
import { getBabyAgeWeeks, uid, today, normaliseQuotes } from '../lib/utils'
import { MILESTONE_FOLLOW_UP_QUESTIONS } from '../lib/activities'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { PageShell } from '../components/layout/PageShell'

type Step = 'what' | 'media' | 'followup' | 'done'

export function MilestoneRecord() {
  const navigate = useNavigate()
  const location = useLocation()
  const preselectedId = (location.state as { milestoneId?: string } | null)?.milestoneId

  const { baby, addRecordedMilestone } = useAppStore()
  const weeks = getBabyAgeWeeks(baby.birthDate)

  const [step, setStep] = useState<Step>('what')
  const [milestoneId, setMilestoneId] = useState<string | null>(preselectedId ?? null)
  const [customTitle, setCustomTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(today())
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null)
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedMilestone = milestoneId ? ALL_MILESTONES.find((m) => m.id === milestoneId) : null
  const title = selectedMilestone?.title ?? customTitle

  const followUpQs =
    selectedMilestone
      ? MILESTONE_FOLLOW_UP_QUESTIONS[selectedMilestone.category] ?? MILESTONE_FOLLOW_UP_QUESTIONS.default
      : MILESTONE_FOLLOW_UP_QUESTIONS.default

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setMediaUrl(ev.target?.result as string)
      setMediaType(file.type.startsWith('video') ? 'video' : 'photo')
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    const entry = {
      id: uid(),
      milestoneId,
      title,
      date,
      notes,
      mediaUrl,
      mediaType,
      followUpAnswers,
      week: weeks,
    }
    addRecordedMilestone(entry)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <PageShell title="Moment recorded">
        <div className="flex flex-col items-center text-center gap-6 py-12">
          <span className="text-6xl">🌟</span>
          <div>
            <h2 className="font-display text-2xl text-stone-800 mb-2">Beautiful!</h2>
            <p className="text-stone-500 text-sm max-w-xs">
              You've captured <span className="font-medium">{title}</span>. These moments are priceless — well done for recording it.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/milestones')}>See all milestones</Button>
            <Button onClick={() => { setStep('what'); setMilestoneId(null); setCustomTitle(''); setNotes(''); setMediaUrl(null); setFollowUpAnswers({}) }}>
              Record another
            </Button>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Record a moment" subtitle="Step by step, no rush">
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex gap-2">
          {(['what', 'media', 'followup'] as Step[]).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step === s || (step === 'followup' && i <= 2) || (step === 'media' && i <= 1) ? 'bg-stone-700' : 'bg-stone-200'}`} />
          ))}
        </div>

        {/* Step: What happened */}
        {step === 'what' && (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">Which milestone are you celebrating?</p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ALL_MILESTONES.filter((m) => m.week <= weeks + 2).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMilestoneId(m.id === milestoneId ? null : m.id)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${m.id === milestoneId ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300 bg-cream-50'}`}
                >
                  <span className="font-medium text-stone-700">{m.title}</span>
                  <span className="ml-2 text-xs text-stone-400">{getCategoryLabel(m.category)} · Wk {m.week}</span>
                </button>
              ))}
            </div>

            <div className="pt-1">
              <p className="text-xs text-stone-400 mb-2">Or describe your own moment:</p>
              <Input
                value={customTitle}
                onChange={(e) => { setCustomTitle(normaliseQuotes(e.target.value)); if (e.target.value) setMilestoneId(null) }}
                placeholder="e.g. First time reaching for my finger"
              />
            </div>

            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

            <Textarea
              label="Your notes (optional)"
              value={notes}
              onChange={(e) => setNotes(normaliseQuotes(e.target.value))}
              placeholder="What happened? Any funny or sweet details?"
              rows={3}
            />

            <Button
              fullWidth
              disabled={!title.trim()}
              onClick={() => setStep('media')}
            >
              Next: Add a photo or video
            </Button>
          </div>
        )}

        {/* Step: Media */}
        {step === 'media' && (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">Add a photo or video of the moment (optional but wonderful).</p>

            {mediaUrl ? (
              <div className="relative rounded-2xl overflow-hidden">
                {mediaType === 'video' ? (
                  <video src={mediaUrl} controls className="w-full rounded-2xl max-h-72 object-cover" />
                ) : (
                  <img src={mediaUrl} alt="moment" className="w-full rounded-2xl max-h-72 object-cover" />
                )}
                <button
                  onClick={() => { setMediaUrl(null); setMediaType(null) }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-44 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-3 text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-all"
              >
                <Camera size={28} strokeWidth={1.5} />
                <div className="text-center">
                  <p className="text-sm font-medium">Add photo or video</p>
                  <p className="text-xs">tap to choose from your library</p>
                </div>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('what')}>Back</Button>
              <Button fullWidth onClick={() => setStep('followup')}>
                {mediaUrl ? 'Next: A few questions' : 'Skip photo — continue'}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Follow-up questions */}
        {step === 'followup' && (
          <div className="space-y-5">
            <p className="text-sm text-stone-500">
              Just a few gentle questions to help you remember this moment fully. Answer as many or as few as you like.
            </p>

            {followUpQs.map((q, i) => (
              <Textarea
                key={i}
                label={q}
                value={followUpAnswers[i] ?? ''}
                onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [i]: normaliseQuotes(e.target.value) }))}
                rows={2}
                placeholder="Take your time…"
              />
            ))}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('media')}>Back</Button>
              <Button fullWidth onClick={handleSave}>Save this moment</Button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
