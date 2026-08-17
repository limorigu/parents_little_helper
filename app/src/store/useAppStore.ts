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
  // Focal point for `object-position` when mediaUrl is cropped to a frame
  // (0-100, % from left/top). Undefined = center, matching the crop every
  // photo got before repositioning existed, so old entries need no migration.
  focalX?: number
  focalY?: number
  // Set once this photo/video has been uploaded to the user's Google Drive
  // "Media" folder as its own file (original format, not base64). Undefined =
  // never uploaded yet (or Google Sync isn't connected) — the next sync will
  // pick it up. Presence of `driveFileId` is what makes re-syncing/re-saving
  // this entry skip a duplicate upload.
  driveFileId?: string
  driveWebViewLink?: string
  followUpAnswers: Record<string, string>
  week: number
}

export interface FeedEntry {
  id: string
  date: string
  endTime: string | null // ISO datetime; non-null while a QuickLog feed session is in progress, or once a manual end time is logged
  type: 'breast-left' | 'breast-right' | 'breast-both' | 'bottle-formula' | 'bottle-pumped' | 'solid' | 'unspecified'
  durationMinutes: number | null
  amountMl: number | null
  notes: string
}

export interface SleepEntry {
  id: string
  startTime: string
  endTime: string | null
  type: 'night' | 'nap' | 'unspecified'
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
  // Focal point for `object-position` when mediaUrl is cropped to a frame
  // (0-100, % from left/top). Undefined = center.
  focalX?: number
  focalY?: number
  // See RecordedMilestone's fields of the same name.
  driveFileId?: string
  driveWebViewLink?: string
}

export interface DiaperEntry {
  id: string
  startTime: string   // ISO datetime
  endTime: string | null
  type: 'wet' | 'dirty' | 'both' | 'clean' | 'unknown'
  notes: string
  // Elimination communication (EC): did baby also go in the potty during this
  // change? Optional/undefined = not tracked (most households don't do EC) —
  // orthogonal to `type`, which is about what was found in the diaper itself.
  pottyResult?: 'pee' | 'poop' | 'both'
}

export interface PlayEntry {
  id: string
  startTime: string   // ISO datetime
  endTime: string | null
  notes: string
}

// "Vocab of the Day" — one row per word ever surfaced for a given language,
// on the day it was introduced. `covered` is the parent checking off that they
// actually worked that word in with baby that day (todo-list style); it's
// this log, not a separate "history" table, that both drives the daily
// checklist and (filtered to `covered`) the "words learned over time" view.
export interface VocabWordLog {
  id: string
  language: string
  word: string
  translation: string
  date: string // yyyy-MM-dd, the day this word was recommended
  covered: boolean
  coveredAt: string | null
}

// A real item pulled from one of three web sources — Ticketmaster (structured
// events), Google News (news search, via RSS), or a local blog/site feed the
// user points at themselves (also via RSS). Every field here is copied
// straight from that source's own response, never invented. `familyFriendly`
// is derived only from real metadata/keywords, never a made-up detail about
// the item itself.
export interface LocalEvent {
  id: string
  name: string
  url: string
  startDate: string // structured event date (Ticketmaster only); '' if not applicable
  venueName: string // Ticketmaster only
  imageUrl: string | null
  familyFriendly: boolean
  segment: string
  source: 'ticketmaster' | 'news' | 'blog'
  sourceLabel: string // e.g. "Ticketmaster", "Google News", or the feed's own site title
  description?: string // short snippet, news/blog items only
  publishedAt?: string // pubDate, news/blog items only
}

interface AppState {
  baby: BabyProfile
  darkMode: boolean
  recordedMilestones: RecordedMilestone[]
  feeds: FeedEntry[]
  // Points at the feed entry a QuickLog "start feed" tap is currently timing.
  // Feed entries themselves can legitimately have endTime === null just
  // because nobody bothered filling in an end time (unlike sleep/play, which
  // are ALWAYS logged via start/stop) — so "in progress" can't be derived
  // from the feed list alone the way it can for sleep/play. This pointer is
  // the source of truth for that instead.
  activeFeedId: string | null
  sleep: SleepEntry[]
  diaper: DiaperEntry[]
  play: PlayEntry[]
  growth: GrowthEntry[]
  plans: DailyPlan[]
  doctorVisits: DoctorVisit[]
  // Local Events (opt-in, via baby.locationEnabled + baby.location). The user
  // supplies their own free Ticketmaster API key — this app has no backend to
  // hold a shared secret, so it's the same "bring your own credential" pattern
  // already used for Google Sync's OAuth client ID.
  ticketmasterApiKey: string
  eventsRadiusMiles: number
  // Two extra, optional web sources layered on top of Ticketmaster — a Google
  // News search (no key needed) and any RSS/Atom feed the user points at
  // themselves (a local blog, newsletter, or "things to do" site/handle they
  // already follow). Both go through rss2json (see src/lib/localEvents.ts)
  // since neither news.google.com nor arbitrary blogs allow direct
  // cross-origin fetches from the browser.
  newsSearchEnabled: boolean
  localFeedUrl: string
  rss2jsonApiKey: string
  localEvents: LocalEvent[]
  lastEventsFetch: string | null
  eventsFetchError: string | null
  celebrations: CelebrationPhoto[]

  // "Vocab of the Day" — languages the household wants to expose baby to
  // (chosen in Settings from a curated, verified list — see src/lib/vocab.ts)
  // plus the running log of words recommended/covered per day.
  targetLanguages: string[]
  vocabLog: VocabWordLog[]

  // Google Sheets/Drive integration
  googleClientId: string
  googleFolderId: string | null
  // The "Media" subfolder (inside googleFolderId) that photos/videos are
  // uploaded into as their own files. Kept separate from googleFolderId so
  // it can be backfilled for accounts that connected before media upload
  // existed, without disturbing the already-created app folder/sheet.
  googleMediaFolderId: string | null
  googleSheetId: string | null
  googleLastSync: string | null
  // Separate from googleLastSync (which tracks the Sheets/media mirror) —
  // this tracks the last time a full lossless state snapshot (see
  // src/lib/backup.ts) was pushed to this device's Drive backup file, for
  // Phase 3 conflict detection ("has the other device backed up more
  // recently than this one restored?").
  googleLastFullBackup: string | null
  googleWriteSheetName: string | null
  // User-chosen parent Drive folder the app's own folder gets nested inside.
  // null = root of "My Drive". Set once, before the app folder is first
  // created — this is how the user controls exactly where their data lives.
  googleParentFolderId: string | null

  setBaby: (updates: Partial<BabyProfile>) => void
  setDarkMode: (on: boolean) => void
  addRecordedMilestone: (m: RecordedMilestone) => void
  updateRecordedMilestone: (id: string, updates: Partial<RecordedMilestone>) => void
  deleteRecordedMilestone: (id: string) => void

  addFeed: (entry: FeedEntry) => void
  updateFeed: (id: string, updates: Partial<FeedEntry>) => void
  deleteFeed: (id: string) => void
  setActiveFeedId: (id: string | null) => void

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

  setTicketmasterApiKey: (key: string) => void
  setEventsRadiusMiles: (miles: number) => void
  setNewsSearchEnabled: (on: boolean) => void
  setLocalFeedUrl: (url: string) => void
  setRss2jsonApiKey: (key: string) => void
  setLocalEvents: (events: LocalEvent[], fetchedAt: string) => void
  setEventsFetchError: (msg: string | null) => void
  addCelebration: (c: CelebrationPhoto) => void
  updateCelebration: (id: string, updates: Partial<CelebrationPhoto>) => void
  deleteCelebration: (id: string) => void

  setTargetLanguages: (langs: string[]) => void
  addVocabWords: (entries: VocabWordLog[]) => void
  setVocabWordCovered: (id: string, covered: boolean) => void

  setGoogleConfig: (cfg: {
    clientId?: string
    folderId?: string | null
    mediaFolderId?: string | null
    sheetId?: string | null
    lastSync?: string | null
    lastFullBackup?: string | null
    writeSheetName?: string | null
    parentFolderId?: string | null
  }) => void
}

const defaultGoogleConfig = {
  googleClientId: '',
  googleFolderId: null as string | null,
  googleMediaFolderId: null as string | null,
  googleSheetId: null as string | null,
  googleLastSync: null as string | null,
  googleLastFullBackup: null as string | null,
  googleWriteSheetName: null as string | null,
  googleParentFolderId: null as string | null,
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
      darkMode: false,
      recordedMilestones: [],
      feeds: [],
      activeFeedId: null,
      sleep: [],
      diaper: [],
      play: [],
      growth: [],
      plans: [],
      doctorVisits: [],
      ticketmasterApiKey: '',
      eventsRadiusMiles: 15,
      newsSearchEnabled: true,
      // Defaults to Boston.com's "Family" tag RSS feed — a real, actively-updated,
      // verified-working feed — as a reasonable out-of-the-box example. Users
      // outside the Boston area (or who just prefer a different source) should
      // swap this for their own local blog/site feed in Settings.
      localFeedUrl: 'https://www.boston.com/tag/family/feed/',
      rss2jsonApiKey: '',
      localEvents: [],
      lastEventsFetch: null,
      eventsFetchError: null,
      celebrations: [],
      targetLanguages: [],
      vocabLog: [],
      ...defaultGoogleConfig,

      setBaby: (updates) =>
        set((s) => ({ baby: { ...s.baby, ...updates } })),

      setDarkMode: (on) => set({ darkMode: on }),

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
        set((s) => ({
          feeds: s.feeds.filter((f) => f.id !== id),
          activeFeedId: s.activeFeedId === id ? null : s.activeFeedId,
        })),
      setActiveFeedId: (id) => set({ activeFeedId: id }),

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

      setTicketmasterApiKey: (key) => set({ ticketmasterApiKey: key }),
      setEventsRadiusMiles: (miles) => set({ eventsRadiusMiles: miles }),
      setNewsSearchEnabled: (on) => set({ newsSearchEnabled: on }),
      setLocalFeedUrl: (url) => set({ localFeedUrl: url }),
      setRss2jsonApiKey: (key) => set({ rss2jsonApiKey: key }),
      setLocalEvents: (events, fetchedAt) =>
        set({ localEvents: events, lastEventsFetch: fetchedAt, eventsFetchError: null }),
      setEventsFetchError: (msg) => set({ eventsFetchError: msg }),

      addCelebration: (c) =>
        set((s) => ({ celebrations: [c, ...s.celebrations] })),
      updateCelebration: (id, updates) =>
        set((s) => ({
          celebrations: s.celebrations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCelebration: (id) =>
        set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),

      setTargetLanguages: (langs) => set({ targetLanguages: langs }),
      // De-duped by (language, date, word): makes this safe to call more than
      // once with the same payload — which happens routinely, since React's
      // StrictMode double-invokes effects in dev, and guards against any
      // future double-call in production too.
      addVocabWords: (entries) =>
        set((s) => {
          const existingKeys = new Set(s.vocabLog.map((v) => `${v.language}|${v.date}|${v.word}`))
          const toAdd = entries.filter((e) => !existingKeys.has(`${e.language}|${e.date}|${e.word}`))
          return toAdd.length ? { vocabLog: [...s.vocabLog, ...toAdd] } : {}
        }),
      setVocabWordCovered: (id, covered) =>
        set((s) => ({
          vocabLog: s.vocabLog.map((v) =>
            v.id === id ? { ...v, covered, coveredAt: covered ? new Date().toISOString() : null } : v
          ),
        })),

      setGoogleConfig: (cfg) =>
        set((s) => ({
          googleClientId: cfg.clientId ?? s.googleClientId,
          googleFolderId: cfg.folderId !== undefined ? cfg.folderId : s.googleFolderId,
          googleMediaFolderId: cfg.mediaFolderId !== undefined ? cfg.mediaFolderId : s.googleMediaFolderId,
          googleSheetId: cfg.sheetId !== undefined ? cfg.sheetId : s.googleSheetId,
          googleLastSync: cfg.lastSync !== undefined ? cfg.lastSync : s.googleLastSync,
          googleLastFullBackup: cfg.lastFullBackup !== undefined ? cfg.lastFullBackup : s.googleLastFullBackup,
          googleWriteSheetName: cfg.writeSheetName !== undefined ? cfg.writeSheetName : s.googleWriteSheetName,
          googleParentFolderId: cfg.parentFolderId !== undefined ? cfg.parentFolderId : s.googleParentFolderId,
        })),
    }),
    { name: 'parents-little-helper' }
  )
)
