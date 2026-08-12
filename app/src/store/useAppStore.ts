import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BabyProfile {
  name: string
  birthDate: string // ISO date string
  birthWeight: number | null // grams
  birthHeight: number | null // cm
  birthHeadCirc: number | null // cm
  sex: 'male' | 'female' | 'prefer-not-to-say'
  parentName: string
  location: string
  locationEnabled: boolean
  onboardingComplete: boolean
}

export type MilestoneCategory = 'motor' | 'social' | 'language' | 'cognitive' | 'sensory'

export interface Milestone {
  id: string
  week: number
  title: string
  description: string
  category: MilestoneCategory
  isOverachiever: boolean
  supportingActivities: string[]
}

export interface RecordedMilestone {
  id: string
  milestoneId: string | null
  title: string
  date: string
  notes: string
  mediaUrl: string | null // base64 or blob URL
  mediaType: 'photo' | 'video' | null
  followUpAnswers: Record<string, string>
  week: number
}

export interface FeedEntry {
  id: string
  date: string
  type: 'breast-left' | 'breast-right' | 'bottle-formula' | 'bottle-pumped' | 'solid'
  durationMinutes: number | null
  amountMl: number | null
  notes: string
}

export interface SleepEntry {
  id: string
  startTime: string
  endTime: string | null
  type: 'night' | 'nap'
  location: string
  notes: string
}

export interface GrowthEntry {
  id: string
  date: string
  weightGrams: number | null
  heightCm: number | null
  headCircCm: number | null
  notes: string
}

export interface ActivityTile {
  id: string
  title: string
  description: string
  duration: string
  category: 'play' | 'outdoor' | 'sensory' | 'social' | 'rest' | 'feed'
  source: 'suggested' | 'local' | 'custom'
  sourceUrl?: string
  completed: boolean
  scheduledTime?: string
}

export interface DailyPlan {
  date: string
  tiles: ActivityTile[]
  confirmedAt: string | null
}

export interface DoctorVisit {
  id: string
  date: string
  type: string
  notes: string
  questions: string[]
  completed: boolean
}

export interface CelebrationPhoto {
  id: string
  eventId: string // matches CalendarEvent id (e.g. 'month-3', 'day100', 'birth')
  mediaUrl: string
  mediaType: 'photo' | 'video'
  note: string
  capturedAt: string // ISO
}

export interface DiaperEntry {
  id: string
  startTime: string   // ISO datetime
  endTime: string | null
  type: 'wet' | 'dirty' | 'both' | 'unknown'
  notes: string
}

export interface PlayEntry {
  id: string
  startTime: string   // ISO datetime
  endTime: string | null
  notes: string
}

export interface LocalActivity {
  id: string
  name: string
  description: string
  url: string
  platform: 'website' | 'instagram' | 'tiktok'
  ageRange: string
  fetchedAt: string
}

interface AppState {
  baby: BabyProfile
  recordedMilestones: RecordedMilestone[]
  feeds: FeedEntry[]
  sleep: SleepEntry[]
  diaper: DiaperEntry[]
  play: PlayEntry[]
  growth: GrowthEntry[]
  plans: DailyPlan[]
  doctorVisits: DoctorVisit[]
  localActivities: LocalActivity[]
  lastActivityFetch: string | null
  celebrations: CelebrationPhoto[]

  // Google Sheets/Drive integration
  googleClientId: string
  googleFolderId: string | null
  googleSheetId: string | null
  googleLastSync: string | null
  googleWriteSheetName: string | null

  setBaby: (updates: Partial<BabyProfile>) => void
  addRecordedMilestone: (m: RecordedMilestone) => void
  updateRecordedMilestone: (id: string, updates: Partial<RecordedMilestone>) => void
  deleteRecordedMilestone: (id: string) => void

  addFeed: (entry: FeedEntry) => void
  updateFeed: (id: string, updates: Partial<FeedEntry>) => void
  deleteFeed: (id: string) => void

  addSleep: (entry: SleepEntry) => void
  updateSleep: (id: string, updates: Partial<SleepEntry>) => void
  deleteSleep: (id: string) => void

  addDiaper: (entry: DiaperEntry) => void
  updateDiaper: (id: string, updates: Partial<DiaperEntry>) => void
  deleteDiaper: (id: string) => void

  addPlay: (entry: PlayEntry) => void
  updatePlay: (id: string, updates: Partial<PlayEntry>) => void
  deletePlay: (id: string) => void

  addGrowth: (entry: GrowthEntry) => void
  updateGrowth: (id: string, updates: Partial<GrowthEntry>) => void
  deleteGrowth: (id: string) => void

  setPlan: (plan: DailyPlan) => void
  updatePlanTiles: (date: string, tiles: ActivityTile[]) => void
  confirmPlan: (date: string) => void

  addDoctorVisit: (v: DoctorVisit) => void
  updateDoctorVisit: (id: string, updates: Partial<DoctorVisit>) => void

  setLocalActivities: (activities: LocalActivity[], fetchedAt: string) => void
  addCelebration: (c: CelebrationPhoto) => void
  deleteCelebration: (id: string) => void

  setGoogleConfig: (cfg: {
    clientId?: string
    folderId?: string | null
    sheetId?: string | null
    lastSync?: string | null
    writeSheetName?: string | null
  }) => void
}

const defaultGoogleConfig = {
  googleClientId: '',
  googleFolderId: null as string | null,
  googleSheetId: null as string | null,
  googleLastSync: null as string | null,
  googleWriteSheetName: null as string | null,
}

const defaultBaby: BabyProfile = {
  name: '',
  birthDate: '',
  birthWeight: null,
  birthHeight: null,
  birthHeadCirc: null,
  sex: 'prefer-not-to-say',
  parentName: '',
  location: '',
  locationEnabled: false,
  onboardingComplete: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      baby: defaultBaby,
      recordedMilestones: [],
      feeds: [],
      sleep: [],
      diaper: [],
      play: [],
      growth: [],
      plans: [],
      doctorVisits: [],
      localActivities: [],
      lastActivityFetch: null,
      celebrations: [],
      ...defaultGoogleConfig,

      setBaby: (updates) =>
        set((s) => ({ baby: { ...s.baby, ...updates } })),

      addRecordedMilestone: (m) =>
        set((s) => ({ recordedMilestones: [m, ...s.recordedMilestones] })),
      updateRecordedMilestone: (id, updates) =>
        set((s) => ({
          recordedMilestones: s.recordedMilestones.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      deleteRecordedMilestone: (id) =>
        set((s) => ({
          recordedMilestones: s.recordedMilestones.filter((m) => m.id !== id),
        })),

      addFeed: (entry) =>
        set((s) => ({ feeds: [entry, ...s.feeds] })),
      updateFeed: (id, updates) =>
        set((s) => ({
          feeds: s.feeds.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),
      deleteFeed: (id) =>
        set((s) => ({ feeds: s.feeds.filter((f) => f.id !== id) })),

      addSleep: (entry) =>
        set((s) => ({ sleep: [entry, ...s.sleep] })),
      updateSleep: (id, updates) =>
        set((s) => ({
          sleep: s.sleep.map((sl) => (sl.id === id ? { ...sl, ...updates } : sl)),
        })),
      deleteSleep: (id) =>
        set((s) => ({ sleep: s.sleep.filter((sl) => sl.id !== id) })),

      addDiaper: (entry) =>
        set((s) => ({ diaper: [entry, ...s.diaper] })),
      updateDiaper: (id, updates) =>
        set((s) => ({
          diaper: s.diaper.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
      deleteDiaper: (id) =>
        set((s) => ({ diaper: s.diaper.filter((d) => d.id !== id) })),

      addPlay: (entry) =>
        set((s) => ({ play: [entry, ...s.play] })),
      updatePlay: (id, updates) =>
        set((s) => ({
          play: s.play.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deletePlay: (id) =>
        set((s) => ({ play: s.play.filter((p) => p.id !== id) })),

      addGrowth: (entry) =>
        set((s) => ({ growth: [entry, ...s.growth] })),
      updateGrowth: (id, updates) =>
        set((s) => ({
          growth: s.growth.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
      deleteGrowth: (id) =>
        set((s) => ({ growth: s.growth.filter((g) => g.id !== id) })),

      setPlan: (plan) =>
        set((s) => {
          const existing = s.plans.findIndex((p) => p.date === plan.date)
          if (existing >= 0) {
            const plans = [...s.plans]
            plans[existing] = plan
            return { plans }
          }
          return { plans: [...s.plans, plan] }
        }),
      updatePlanTiles: (date, tiles) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.date === date ? { ...p, tiles } : p)),
        })),
      confirmPlan: (date) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.date === date ? { ...p, confirmedAt: new Date().toISOString() } : p
          ),
        })),

      addDoctorVisit: (v) =>
        set((s) => ({ doctorVisits: [...s.doctorVisits, v] })),
      updateDoctorVisit: (id, updates) =>
        set((s) => ({
          doctorVisits: s.doctorVisits.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        })),

      setLocalActivities: (activities, fetchedAt) =>
        set({ localActivities: activities, lastActivityFetch: fetchedAt }),

      addCelebration: (c) =>
        set((s) => ({ celebrations: [c, ...s.celebrations] })),
      deleteCelebration: (id) =>
        set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),

      setGoogleConfig: (cfg) =>
        set((s) => ({
          googleClientId: cfg.clientId ?? s.googleClientId,
          googleFolderId: cfg.folderId !== undefined ? cfg.folderId : s.googleFolderId,
          googleSheetId: cfg.sheetId !== undefined ? cfg.sheetId : s.googleSheetId,
          googleLastSync: cfg.lastSync !== undefined ? cfg.lastSync : s.googleLastSync,
          googleWriteSheetName: cfg.writeSheetName !== undefined ? cfg.writeSheetName : s.googleWriteSheetName,
        })),
    }),
    { name: 'parents-little-helper' }
  )
)
