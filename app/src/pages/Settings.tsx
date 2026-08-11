import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PageShell } from '../components/layout/PageShell'
import { getBabyAgeLabel } from '../lib/utils'

export function Settings() {
  const { baby, setBaby } = useAppStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...baby })
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm({ ...baby }) }, [baby])

  function set(key: string, value: string | boolean | number | null) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function save() {
    setBaby(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (!baby.onboardingComplete) {
      setBaby({ ...form, onboardingComplete: true })
      navigate('/')
    }
  }

  const isOnboarding = !baby.onboardingComplete

  return (
    <div className={isOnboarding ? 'min-h-screen bg-cream-100 flex items-center justify-center p-5' : ''}>
      {isOnboarding ? (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="font-display italic text-stone-800 text-3xl block leading-tight">Parents'</span>
            <span className="font-display text-stone-800 text-3xl block leading-tight">little helper</span>
            <div className="w-8 h-0.5 bg-blush-300 mx-auto mt-3 rounded-full mb-4" />
            <p className="text-stone-500 text-sm">Let's get to know your little one.</p>
          </div>
          <OnboardingForm form={form} set={set} onSave={save} isOnboarding />
        </div>
      ) : (
        <PageShell title="Settings" subtitle="Your profile & preferences">
          <OnboardingForm form={form} set={set} onSave={save} saved={saved} />
        </PageShell>
      )}
    </div>
  )
}

function OnboardingForm({ form, set, onSave, isOnboarding = false, saved = false }: {
  form: ReturnType<typeof useAppStore.getState>['baby']
  set: (key: string, value: string | boolean | number | null) => void
  onSave: () => void
  isOnboarding?: boolean
  saved?: boolean
}) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-base text-stone-700 mb-4">About your baby</h2>
        <div className="space-y-4">
          <Input
            id="babyName"
            label="Baby's name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Olive"
          />
          <Input
            id="birthDate"
            label="Date of birth"
            type="date"
            value={form.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
          />
          {form.birthDate && (
            <p className="text-xs text-stone-400">
              {getBabyAgeLabel(form.birthDate)}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Sex assigned at birth</label>
            <div className="flex gap-2">
              {(['male', 'female', 'prefer-not-to-say'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => set('sex', s)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${form.sex === s ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
                >
                  {s === 'male' ? 'Male' : s === 'female' ? 'Female' : 'Prefer not to say'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-base text-stone-700 mb-4">Birth measurements</h2>
        <div className="space-y-4">
          <Input
            label="Birth weight (grams)"
            type="number"
            value={form.birthWeight ?? ''}
            onChange={(e) => set('birthWeight', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 3400"
          />
          <Input
            label="Birth length (cm)"
            type="number"
            value={form.birthHeight ?? ''}
            onChange={(e) => set('birthHeight', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 50"
          />
          <Input
            label="Head circumference at birth (cm)"
            type="number"
            value={form.birthHeadCirc ?? ''}
            onChange={(e) => set('birthHeadCirc', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 34"
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-base text-stone-700 mb-4">About you</h2>
        <div className="space-y-4">
          <Input
            label="Your name"
            value={form.parentName}
            onChange={(e) => set('parentName', e.target.value)}
            placeholder="e.g. Sarah"
          />
          <Input
            label="Your location (city or postcode)"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. London, E1 or New York, NY"
          />
          <p className="text-xs text-stone-400">
            We use your location to suggest local classes, parks, and activities. It never leaves your device.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('locationEnabled', !form.locationEnabled)}
              className={`w-10 h-6 rounded-full flex items-center transition-all ${form.locationEnabled ? 'bg-stone-800' : 'bg-stone-200'}`}
            >
              <span className={`w-4 h-4 bg-white rounded-full shadow-sm ml-1 transition-all ${form.locationEnabled ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-stone-600">Enable location-based activity suggestions</span>
          </label>
        </div>
      </Card>

      <Button fullWidth size="lg" onClick={onSave}>
        {saved ? '✓ Saved!' : isOnboarding ? 'Get started' : 'Save changes'}
      </Button>

      {!isOnboarding && (
        <p className="text-xs text-center text-stone-400">
          All your data is stored locally on this device only.
        </p>
      )}
    </div>
  )
}
