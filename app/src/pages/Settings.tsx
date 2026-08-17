import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Cloud, CloudOff, RefreshCw, Download, Upload, Copy, AlertCircle, AlertTriangle, CheckCircle2, Moon, MapPin, Languages } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { PageShell } from '../components/layout/PageShell'
import { getBabyAgeLabel, normaliseQuotes, today, uid } from '../lib/utils'
import { SUPPORTED_LANGUAGES } from '../lib/vocab'
import { fetchAllLocalEvents, LocalEventsFetchError } from '../lib/localEvents'
import { signIn, signOut, getToken, isSignedIn } from '../lib/googleApi'
import {
  setupDrive,
  findOrCreateSpreadsheet,
  syncAllData,
  importFromTabs,
  extractSpreadsheetId,
  extractFolderId,
  listSheetTabs,
  createSheetTab,
  MissingDateError,
  uploadBackupJson,
  findBackupFile,
  downloadDriveFileText,
} from '../lib/googleSync'
import type { ImportedData, MediaUploadResult } from '../lib/googleSync'
import { buildBackup, backupFilename, parseBackup, summarizeBackup, restoreFromBackup, backupsDiffer, type BackupFile } from '../lib/backup'

// ── Baby profile form ────────────────────────────────────────────────────────

function ProfileSection({
  form,
  set,
  onSave,
  isOnboarding = false,
  saved = false,
}: {
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
            <p className="text-xs text-stone-400">{getBabyAgeLabel(form.birthDate)}</p>
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
            label="Your postcode"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. SW1A 1AA or 10001"
          />
          <p className="text-xs text-stone-400">
            Used to suggest real local events nearby (see "Local Events" below). It's only sent to Ticketmaster —
            never anywhere else — and only once you enable this.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('locationEnabled', !form.locationEnabled)}
              className={`w-10 h-6 rounded-full flex items-center transition-all ${form.locationEnabled ? 'bg-stone-800' : 'bg-stone-400'}`}
            >
              <span className={`w-4 h-4 bg-cream-50 rounded-full shadow-sm ml-1 transition-all ${form.locationEnabled ? 'translate-x-4' : ''}`} />
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
          All your data is stored locally on this device only, unless you opt in to Google Sync below.
        </p>
      )}
    </div>
  )
}

// ── Appearance section ────────────────────────────────────────────────────────

function AppearanceSection() {
  const { darkMode, setDarkMode } = useAppStore()

  return (
    <Card>
      <div className="flex items-center gap-3 mb-1">
        <Moon size={18} className="text-periwinkle-500 shrink-0" />
        <div>
          <h2 className="font-display text-base text-stone-700">Appearance</h2>
          <p className="text-xs text-stone-400">Night Owl mode — dark, high-contrast, easy on the eyes at 3am</p>
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 cursor-pointer mt-3">
        <span className="text-sm text-stone-600">Night Owl mode</span>
        <div
          onClick={() => setDarkMode(!darkMode)}
          className={`w-10 h-6 rounded-full flex items-center transition-all shrink-0 ${darkMode ? 'bg-stone-800' : 'bg-stone-400'}`}
        >
          <span className={`w-4 h-4 bg-cream-50 rounded-full shadow-sm ml-1 transition-all ${darkMode ? 'translate-x-4' : ''}`} />
        </div>
      </label>
    </Card>
  )
}

// ── Languages section (Vocab of the Day) ──────────────────────────────────────

function LanguagesSection() {
  const { targetLanguages, setTargetLanguages } = useAppStore()
  const available = SUPPORTED_LANGUAGES.filter((lang) => !targetLanguages.includes(lang))

  function remove(lang: string) {
    setTargetLanguages(targetLanguages.filter((l) => l !== lang))
  }

  function add(e: React.ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value
    if (lang && !targetLanguages.includes(lang)) {
      setTargetLanguages([...targetLanguages, lang])
    }
    e.target.value = ''
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-1">
        <Languages size={18} className="text-periwinkle-500 shrink-0" />
        <div>
          <h2 className="font-display text-base text-stone-700">Vocab of the Day</h2>
          <p className="text-xs text-stone-400">Pick the language(s) you'd like to expose baby to</p>
        </div>
      </div>

      {targetLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {targetLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => remove(lang)}
              title="Remove"
              className="px-3 py-1.5 rounded-xl border border-stone-700 bg-cream-100 text-stone-800 text-xs font-medium transition-all hover:bg-cream-200 flex items-center gap-1.5"
            >
              {lang} <span className="text-stone-400">×</span>
            </button>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <select
          onChange={add}
          defaultValue=""
          className="mt-3 w-full rounded-xl border-[3px] border-stone-800 bg-cream-50 px-3 py-2 text-xs font-medium text-stone-700 focus:outline-none focus:shadow-brutal-sm focus:-translate-y-0.5 transition-all"
        >
          <option value="" disabled>
            + Add a language…
          </option>
          {available.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      )}

      <p className="text-xs text-stone-400 leading-relaxed mt-3">
        For each language you pick, the Vocab tab suggests a few new words a day (with real songs and
        simple activity ideas to introduce them) and lets you check off the ones you actually covered.
        This list is curated for accuracy rather than open-ended — let us know if you'd like another
        language added.
      </p>
    </Card>
  )
}

// ── Backup & Restore section ──────────────────────────────────────────────────
// A snapshot mechanism (export everything now / replace everything now) for
// moving data between devices/browsers, or just keeping a manual save point.
// This is deliberately independent of the Google Sync section below — it
// works even for households that never connect Google at all — though the
// upcoming Drive-based backup (Phase 2) will build on top of the same
// buildBackup/restoreFromBackup helpers.

function BackupSection() {
  const { baby } = useAppStore()
  const [copied, setCopied] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pendingRestore, setPendingRestore] = useState<{ backup: BackupFile; source: string } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDownload() {
    try {
      const backup = buildBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backupFilename(baby.name)
      a.click()
      URL.revokeObjectURL(url)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build a backup.')
    }
  }

  async function handleCopy() {
    try {
      const backup = buildBackup()
      await navigator.clipboard.writeText(JSON.stringify(backup))
      setCopied(true)
      setError('')
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy a backup — your browser may block clipboard access here.')
    }
  }

  function stageRestore(text: string, source: string) {
    try {
      const backup = parseBackup(text)
      setPendingRestore({ backup, source })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that as a backup.')
    }
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => stageRestore(String(reader.result ?? ''), `"${file.name}"`)
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
    e.target.value = ''
  }

  function confirmRestore() {
    if (!pendingRestore) return
    restoreFromBackup(pendingRestore.backup)
    setPendingRestore(null)
    // A full reload rather than trusting every already-mounted component to
    // notice the wholesale state swap — some component-local state (e.g. a
    // form field seeded from the store only at mount) wouldn't otherwise
    // pick up the change reliably.
    window.location.reload()
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Download size={18} className="text-periwinkle-500 shrink-0" />
        <div>
          <h2 className="font-display text-base text-stone-700">Backup & Restore</h2>
          <p className="text-xs text-stone-400">Move everything to another device, or save a snapshot</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-cream-100 rounded-2xl p-4 text-xs text-stone-500 leading-relaxed">
          A backup includes everything on this device — profile, settings, every tracked record,
          milestones, and photos/videos — as one file. Restoring it on another device (or
          browser) replaces that device's data with this snapshot.
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-stone-400 mb-2">Export from this device</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={14} /> Download file
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              <Copy size={14} /> {copied ? 'Copied!' : 'Copy to clipboard'}
            </Button>
          </div>
          <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
            On an iPhone + Mac signed into the same Apple ID, copying here and pasting into the
            paste box below on the other device often works directly via Universal Clipboard —
            no file transfer needed.
          </p>
        </div>

        <div className="pt-3 border-t border-stone-100">
          <p className="text-xs font-black uppercase tracking-wide text-stone-400 mb-2">Restore onto this device</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Choose backup file…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>
          <Textarea
            label="…or paste backup text here"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={3}
            placeholder="Paste the full backup JSON…"
          />
          {pasteText.trim() && (
            <Button size="sm" className="mt-2" onClick={() => stageRestore(pasteText, 'the pasted text')}>
              Preview this backup
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-blush-50 border border-blush-200 rounded-xl p-3 text-sm text-blush-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <Modal open={!!pendingRestore} onClose={() => setPendingRestore(null)} title="Restore this backup?">
        {pendingRestore && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-blush-50 border border-blush-200 rounded-xl p-3 text-sm text-blush-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                This replaces everything currently on this device with the backup below. There's
                no undo — anything logged here since that backup was taken (and not also in it)
                will be gone.
              </p>
            </div>
            <div className="bg-cream-100 rounded-2xl p-4 space-y-1 text-sm text-stone-600">
              <p className="text-xs font-black uppercase tracking-wide text-stone-400 mb-1">
                From {pendingRestore.source}
              </p>
              {summarizeBackup(pendingRestore.backup).map((line) => <p key={line}>{line}</p>)}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setPendingRestore(null)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={confirmRestore}>Restore & replace</Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}

// ── Google Sync section ───────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'importing' | 'previewing' | 'backing-up' | 'restoring' | 'error' | 'success'

function GoogleSection() {
  const store = useAppStore()
  const {
    baby, googleClientId, googleFolderId, googleMediaFolderId, googleSheetId, googleLastSync, googleLastFullBackup,
    googleWriteSheetName, googleParentFolderId, setGoogleConfig, feeds, sleep, diaper, play, growth,
    recordedMilestones, doctorVisits, celebrations, addFeed, addSleep, addDiaper, addPlay, updateRecordedMilestone,
    updateCelebration,
  } = store

  const [clientIdInput, setClientIdInput] = useState(googleClientId)
  const [parentFolderInput, setParentFolderInput] = useState(googleParentFolderId ?? '')
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  // Multiple actions in this section (Sheets/media sync, full Drive backup)
  // both land on status === 'success', so the success banner's wording is
  // driven by whichever one actually ran, rather than guessing from timing.
  const [successMessage, setSuccessMessage] = useState('Synced successfully.')

  // Import form state
  const [importUrl, setImportUrl] = useState('')
  const [importTabs, setImportTabs] = useState<{ sheetId: number; title: string }[] | null>(null)
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set())
  const [needsFallbackDate, setNeedsFallbackDate] = useState(false)
  const [fallbackDate, setFallbackDate] = useState(today())
  const [importPreview, setImportPreview] = useState<ImportedData | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importSuccess, setImportSuccess] = useState('')

  // Write-target form state (which tab new entries get appended to) — this
  // always refers to tabs on the app's own connected spreadsheet, never the
  // sheet pasted into the import form above, so it gets its own tab list.
  const [showWriteTarget, setShowWriteTarget] = useState(false)
  const [writeTabs, setWriteTabs] = useState<{ sheetId: number; title: string }[] | null>(null)
  const [writeMode, setWriteMode] = useState<'existing' | 'new'>('existing')
  const [writeExisting, setWriteExisting] = useState('Activity Log')
  const [writeNewName, setWriteNewName] = useState('')
  const [writeTargetSaved, setWriteTargetSaved] = useState(false)

  // Full-backup-to-Drive form state — separate from the Activity Log sync
  // above: this is the lossless whole-app snapshot (see src/lib/backup.ts),
  // stored as its own JSON file, for cloning state onto another device.
  const [showDriveBackup, setShowDriveBackup] = useState(false)
  const [pendingDriveRestore, setPendingDriveRestore] = useState<{ backup: BackupFile; source: string } | null>(null)
  // Set only when the Drive backup and this device's live data actually
  // disagree (see backupsDiffer) — i.e. there's a real decision to make,
  // not just a routine "replace with an identical copy." conflictChoice
  // starts at null (no default) so the user has to actively pick a side
  // rather than accidentally keeping a pre-selected option.
  const [pendingConflict, setPendingConflict] = useState<{ local: BackupFile; remote: BackupFile } | null>(null)
  const [conflictChoice, setConflictChoice] = useState<'local' | 'remote' | null>(null)

  // Derive connection from in-memory token (re-checks on each render)
  const connected = isSignedIn()
  // The OAuth token lives in memory only (never localStorage, for security)
  // so it's gone after every page reload even though the rest of the Google
  // config — client ID, Drive folder, spreadsheet — is still sitting in the
  // persisted store. Distinguish "never set this up" from "set up, just
  // needs a fresh sign-in" so a reload doesn't look like the integration
  // was never configured.
  const wasConnected = Boolean(googleClientId && (googleFolderId || googleSheetId))

  function err(msg: string) { setStatus('error'); setErrorMsg(msg) }

  /** Apply any newly Drive-uploaded media back onto the entries that were missing it. */
  function applyUploads(uploads: MediaUploadResult[]) {
    uploads.forEach((u) => {
      const updates = { driveFileId: u.driveFileId, driveWebViewLink: u.driveWebViewLink }
      if (u.kind === 'milestone') updateRecordedMilestone(u.id, updates)
      else updateCelebration(u.id, updates)
    })
  }

  async function ensureDriveAndSheet(
    token: string,
    parentFolderIdOverride?: string | null,
  ): Promise<{ folderId: string; mediaFolderId: string; sheetId: string }> {
    let folderId = googleFolderId
    let mediaFolderId = googleMediaFolderId
    let sheetId = googleSheetId

    if (!folderId || !sheetId || !mediaFolderId) {
      const parent = parentFolderIdOverride !== undefined ? parentFolderIdOverride : googleParentFolderId
      const created = await setupDrive(token, baby.name, parent)
      folderId = created.folderId
      mediaFolderId = created.mediaFolderId
      const title = baby.name ? `${baby.name}'s Log` : "Baby's Log"
      sheetId = await findOrCreateSpreadsheet(token, folderId, title)
      setGoogleConfig({ folderId, mediaFolderId, sheetId })
    }
    return { folderId, mediaFolderId, sheetId }
  }

  async function handleConnect() {
    if (!clientIdInput.trim()) { err('Please enter your Google Client ID first.'); return }
    setStatus('connecting')
    setErrorMsg('')
    try {
      const token = await signIn(clientIdInput.trim())
      // Persist where in the user's Drive their data folder should live —
      // chosen once, before the folder tree is created below. On a
      // *reconnect* (the folder/sheet already exist), the input is left
      // blank because there's nothing new to choose — don't let that blank
      // clobber the parent folder already saved from the first connect.
      const parentFolderId = parentFolderInput.trim()
        ? extractFolderId(parentFolderInput.trim())
        : googleParentFolderId
      setGoogleConfig({ clientId: clientIdInput.trim(), parentFolderId })
      // Immediately set up Drive folder + sheet on first connect
      const { sheetId, mediaFolderId } = await ensureDriveAndSheet(token, parentFolderId)
      const uploads = await syncAllData(token, sheetId, mediaFolderId, {
        feeds, sleep, diaper, play, growth, recordedMilestones, doctorVisits, celebrations,
      })
      applyUploads(uploads)
      setGoogleConfig({ lastSync: new Date().toISOString() })
      setSuccessMessage('Synced successfully.')
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e) {
      err((e as Error).message)
    }
  }

  function handleDisconnect() {
    signOut()
    setGoogleConfig({ folderId: null, sheetId: null, lastSync: null })
    setStatus('idle')
    setErrorMsg('')
  }

  async function handleSyncNow() {
    let token = getToken()
    if (!token) {
      // Token expired — re-authenticate silently with saved client ID
      try {
        token = await signIn(clientIdInput.trim() || googleClientId)
      } catch (e) {
        err("Session expired. Please reconnect your Google account.")
        return
      }
    }
    setStatus('syncing')
    setErrorMsg('')
    try {
      const { sheetId, mediaFolderId } = await ensureDriveAndSheet(token)
      const uploads = await syncAllData(token, sheetId, mediaFolderId, {
        feeds, sleep, diaper, play, growth, recordedMilestones, doctorVisits, celebrations,
      })
      applyUploads(uploads)
      setGoogleConfig({ lastSync: new Date().toISOString() })
      setSuccessMessage('Synced successfully.')
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e) {
      err((e as Error).message)
    }
  }

  async function ensureToken(): Promise<string | null> {
    let token = getToken()
    if (!token) {
      try {
        token = await signIn(clientIdInput.trim() || googleClientId)
      } catch {
        err('Session expired. Please reconnect your Google account.')
        return null
      }
    }
    return token
  }

  /** Load the tab list for the sheet the user pasted, defaulting to selecting all of them. */
  async function handleLoadTabs() {
    if (!importUrl.trim()) { err('Please enter a Google Sheets URL or ID.'); return }
    const token = await ensureToken()
    if (!token) return

    setStatus('previewing')
    setErrorMsg('')
    setImportPreview(null)
    setNeedsFallbackDate(false)
    try {
      const spreadsheetId = extractSpreadsheetId(importUrl)
      const tabs = await listSheetTabs(token, spreadsheetId)
      setImportTabs(tabs)
      setSelectedTabs(new Set(tabs.map((t) => t.title)))
      setStatus('idle')
    } catch (e) {
      err((e as Error).message)
    }
  }

  function toggleTab(title: string) {
    setSelectedTabs((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  async function handlePreviewImport() {
    const token = await ensureToken()
    if (!token) return
    if (!importTabs || selectedTabs.size === 0) { err('Pick at least one tab to import.'); return }

    setStatus('previewing')
    setErrorMsg('')
    try {
      const spreadsheetId = extractSpreadsheetId(importUrl)
      const preview = await importFromTabs(
        token,
        spreadsheetId,
        [...selectedTabs],
        needsFallbackDate ? fallbackDate : undefined,
      )
      setImportPreview(preview)
      setNeedsFallbackDate(false)
      setStatus('idle')
    } catch (e) {
      if (e instanceof MissingDateError) {
        // The sheet (or one of its tabs) has no Date column — ask once, then retry.
        setNeedsFallbackDate(true)
        setStatus('idle')
        setErrorMsg('')
      } else {
        err((e as Error).message)
      }
    }
  }

  /** Key an entry by its start time + end time so re-importing the same sheet doesn't duplicate rows. */
  function timeKey(startTime: string, endTime: string | null) {
    return `${startTime}|${endTime ?? ''}`
  }

  function handleConfirmImport() {
    if (!importPreview) return

    const existingFeedKeys = new Set(feeds.map((f) => f.date))
    const existingSleepKeys = new Set(sleep.map((s) => timeKey(s.startTime, s.endTime)))
    const existingDiaperKeys = new Set(diaper.map((d) => timeKey(d.startTime, d.endTime)))
    const existingPlayKeys = new Set(play.map((p) => timeKey(p.startTime, p.endTime)))

    let added = 0
    let duplicates = 0

    importPreview.feeds.forEach((f) => {
      if (existingFeedKeys.has(f.date)) { duplicates++; return }
      addFeed({ ...f, id: uid() })
      added++
    })
    importPreview.sleep.forEach((s) => {
      const key = timeKey(s.startTime, s.endTime)
      if (existingSleepKeys.has(key)) { duplicates++; return }
      addSleep({ ...s, id: uid() })
      added++
    })
    importPreview.diaper.forEach((d) => {
      const key = timeKey(d.startTime, d.endTime)
      if (existingDiaperKeys.has(key)) { duplicates++; return }
      addDiaper({ ...d, id: uid() })
      added++
    })
    importPreview.play.forEach((p) => {
      const key = timeKey(p.startTime, p.endTime)
      if (existingPlayKeys.has(key)) { duplicates++; return }
      addPlay({ ...p, id: uid() })
      added++
    })

    setImportSuccess(
      `Imported ${added} entr${added === 1 ? 'y' : 'ies'}` +
      (duplicates ? ` (skipped ${duplicates} already in your log).` : '.'),
    )
    setImportPreview(null)
    setImportUrl('')
    setImportTabs(null)
    setSelectedTabs(new Set())
    setNeedsFallbackDate(false)
    setShowImport(false)
    setTimeout(() => setImportSuccess(''), 4000)
  }

  /** Load tabs for the write-target picker (uses the already-connected app spreadsheet). */
  async function handleOpenWriteTarget() {
    setShowWriteTarget((v) => !v)
    if (writeTabs || !googleSheetId) return
    const token = await ensureToken()
    if (!token) return
    try {
      const tabs = await listSheetTabs(token, googleSheetId)
      setWriteTabs(tabs)
      if (googleWriteSheetName && tabs.some((t) => t.title === googleWriteSheetName)) {
        setWriteExisting(googleWriteSheetName)
      }
    } catch (e) {
      err((e as Error).message)
    }
  }

  async function handleSaveWriteTarget() {
    const token = await ensureToken()
    if (!token || !googleSheetId) return
    setErrorMsg('')
    try {
      if (writeMode === 'new') {
        const name = writeNewName.trim()
        if (!name) { err('Please name the new tab.'); return }
        await createSheetTab(token, googleSheetId, name)
        setGoogleConfig({ writeSheetName: name })
        setWriteTabs((prev) => (prev ? [...prev, { sheetId: -1, title: name }] : prev))
      } else {
        if (!writeExisting) { err('Please pick a tab.'); return }
        setGoogleConfig({ writeSheetName: writeExisting })
      }
      setWriteTargetSaved(true)
      setTimeout(() => setWriteTargetSaved(false), 2500)
    } catch (e) {
      err((e as Error).message)
    }
  }

  /** Push a full lossless state snapshot to Drive, overwriting any earlier one there. */
  async function handleBackupToDrive() {
    const token = await ensureToken()
    if (!token) return
    setStatus('backing-up')
    setErrorMsg('')
    try {
      const { folderId } = await ensureDriveAndSheet(token)
      const backup = buildBackup()
      await uploadBackupJson(token, folderId, JSON.stringify(backup))
      setGoogleConfig({ lastFullBackup: new Date().toISOString() })
      setSuccessMessage('Backed up to Drive successfully.')
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e) {
      err(e instanceof Error ? e.message : 'Could not back up to Drive.')
    }
  }

  /**
   * Fetch whatever full-backup snapshot is currently in Drive. If it's
   * identical to what's already on this device there's nothing to decide —
   * say so and stop. If this device has no local data yet (brand new
   * device), there's nothing to conflict with either — go straight to the
   * plain confirm-before-restore, same UX as the local paste-restore. Only
   * when the two genuinely disagree does this route into conflict
   * resolution instead of silently overwriting one side.
   */
  async function handleFetchDriveBackup() {
    const token = await ensureToken()
    if (!token) return
    setStatus('restoring')
    setErrorMsg('')
    try {
      const { folderId } = await ensureDriveAndSheet(token)
      const file = await findBackupFile(token, folderId)
      if (!file) {
        err('No backup found in this Drive folder yet — use "Backup to Drive" first, from whichever device has the data you want to keep.')
        return
      }
      const text = await downloadDriveFileText(token, file.id)
      const remote = parseBackup(text)

      let local: BackupFile | null = null
      try {
        local = buildBackup()
      } catch {
        local = null
      }

      if (!local) {
        setPendingDriveRestore({ backup: remote, source: 'Google Drive' })
      } else if (backupsDiffer(local, remote)) {
        setConflictChoice(null)
        setPendingConflict({ local, remote })
      } else {
        setSuccessMessage('This device already matches the latest Drive backup — nothing to restore.')
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
        return
      }
      setStatus('idle')
    } catch (e) {
      err(e instanceof Error ? e.message : 'Could not read the Drive backup.')
    }
  }

  function confirmDriveRestore() {
    if (!pendingDriveRestore) return
    restoreFromBackup(pendingDriveRestore.backup)
    setPendingDriveRestore(null)
    window.location.reload()
  }

  /**
   * Resolve a detected conflict per the user's choice: either keep this
   * device's data (and push it to Drive so the other side catches up next
   * time it restores), or accept the Drive backup (and replace this
   * device's data with it, same as the no-conflict restore path).
   */
  async function confirmConflictResolution() {
    if (!pendingConflict || !conflictChoice) return
    if (conflictChoice === 'remote') {
      restoreFromBackup(pendingConflict.remote)
      setPendingConflict(null)
      window.location.reload()
      return
    }
    // Keep this device's data — the two sides still disagree until Drive
    // also has this version, so push it there now rather than leaving the
    // conflict to resurface on the next restore attempt.
    setStatus('backing-up')
    setErrorMsg('')
    try {
      const token = await ensureToken()
      if (!token) return
      const { folderId } = await ensureDriveAndSheet(token)
      await uploadBackupJson(token, folderId, JSON.stringify(pendingConflict.local))
      setGoogleConfig({ lastFullBackup: new Date().toISOString() })
      setPendingConflict(null)
      setConflictChoice(null)
      setSuccessMessage("Kept this device's data, and updated the Drive backup to match.")
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e) {
      err(e instanceof Error ? e.message : 'Could not update the Drive backup.')
    }
  }

  const fmtLastSync = googleLastSync
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(googleLastSync))
    : null
  const fmtLastFullBackup = googleLastFullBackup
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(googleLastFullBackup))
    : null

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        {connected
          ? <Cloud size={18} className="text-sage-500 shrink-0" />
          : <CloudOff size={18} className="text-stone-400 shrink-0" />}
        <div>
          <h2 className="font-display text-base text-stone-700">Google Sync</h2>
          <p className="text-xs text-stone-400">Optional — keeps a copy in your Google Drive</p>
        </div>
        {connected && (
          <span className="ml-auto bg-sage-100 text-sage-700 text-xs font-medium px-2 py-0.5 rounded-full">
            Connected
          </span>
        )}
      </div>

      {!connected && wasConnected ? (
        <div className="space-y-3">
          <div className="bg-cream-100 rounded-2xl p-4 text-sm text-stone-600">
            <p>
              Google Sync was already set up on this baby's log. For your privacy, the sign-in
              token isn't kept after the tab closes (it only lasts about an hour) — so it's gone
              after a reload, but your Drive folder and spreadsheet are untouched.
            </p>
          </div>
          <Button fullWidth onClick={handleConnect} disabled={status === 'connecting'}>
            {status === 'connecting' ? 'Opening Google sign-in…' : 'Reconnect Google account'}
          </Button>
          {googleFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${googleFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-stone-400 underline"
            >
              Open your data folder in Drive →
            </a>
          )}
        </div>
      ) : !connected ? (
        <div className="space-y-4">
          {/* Explainer */}
          <div className="bg-cream-100 rounded-2xl p-4 space-y-2 text-sm text-stone-600">
            <p>When connected, the app will mirror all data to your Google Drive:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-stone-500">
              <li>All text entries → a Google Sheet (feeds, sleep, nappies, growth, milestones)</li>
              <li>Photos & videos → a dedicated Media folder</li>
              <li>Your device stays the source of truth — sync is a backup, not a requirement</li>
            </ul>
          </div>

          {/* Step 1 — where in the user's own Drive this should live */}
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wide text-stone-400">Step 1 · Choose the location</p>
            <Input
              label="Drive folder (optional)"
              value={parentFolderInput}
              onChange={(e) => setParentFolderInput(e.target.value)}
              placeholder="Paste a folder link, or leave blank for My Drive"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              Everything the app writes — the spreadsheet and every photo/video —
              stays entirely inside <strong>your own</strong> Google Drive, never on our
              servers. By default we create a new "Parents' Little Helper" folder in
              the root of My Drive. To nest it inside a folder you already have
              (e.g. an existing family photos folder), open that folder in Drive,
              copy its link, and paste it here first. This can only be set once,
              before the folder is created.
            </p>
          </div>

          {/* Step 2 — connect the account */}
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wide text-stone-400">Step 2 · Connect your account</p>
            <Input
              label="Google OAuth Client ID"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              You need a free Google Cloud project with Drive + Sheets APIs enabled.{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-periwinkle-500 underline"
              >
                Get a Client ID →
              </a>{' '}
              Set origin to <code className="bg-stone-100 px-1 rounded text-xs">http://localhost:5173</code>.
            </p>
          </div>

          <Button
            fullWidth
            onClick={handleConnect}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? 'Opening Google sign-in…' : 'Connect Google account'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sync status */}
          <div className="bg-sage-50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-sage-700 font-medium">Drive folder active</p>
              {fmtLastSync && (
                <p className="text-xs text-sage-500">Last synced: {fmtLastSync}</p>
              )}
              {googleFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${googleFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sage-600 underline"
                >
                  Open your data folder in Drive →
                </a>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncNow}
              disabled={status === 'syncing'}
            >
              <RefreshCw size={13} className={status === 'syncing' ? 'animate-spin' : ''} />
              {status === 'syncing' ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>

          {/* Write-target section */}
          <div>
            <button
              className="w-full flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              onClick={handleOpenWriteTarget}
            >
              <Cloud size={14} />
              <span className="font-medium">Where new entries get saved</span>
              <span className="ml-auto text-xs text-stone-400">{googleWriteSheetName || 'Activity Log'}</span>
              <span className="text-stone-400">{showWriteTarget ? '▲' : '▼'}</span>
            </button>

            {showWriteTarget && (
              <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                <p className="text-xs text-stone-500">
                  Every time you log something in the Tracker, it's appended as a new row to this tab
                  (matching whatever column order that tab already uses).
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWriteMode('existing')}
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${writeMode === 'existing' ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
                  >
                    Existing tab
                  </button>
                  <button
                    onClick={() => setWriteMode('new')}
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${writeMode === 'new' ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
                  >
                    New tab
                  </button>
                </div>
                {writeMode === 'existing' ? (
                  writeTabs && writeTabs.length ? (
                    <select
                      value={writeExisting}
                      onChange={(e) => setWriteExisting(e.target.value)}
                      className="w-full rounded-xl border-[3px] border-stone-800 bg-cream-50 px-4 py-2.5 text-sm text-stone-800"
                    >
                      {writeTabs.map((t) => (
                        <option key={t.title} value={t.title}>{t.title}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-stone-400">Loading tabs…</p>
                  )
                ) : (
                  <Input
                    label="New tab name"
                    value={writeNewName}
                    onChange={(e) => setWriteNewName(e.target.value)}
                    placeholder="e.g. App Log"
                  />
                )}
                <Button fullWidth size="sm" onClick={handleSaveWriteTarget}>
                  {writeTargetSaved ? '✓ Saved!' : 'Save destination'}
                </Button>
              </div>
            )}
          </div>

          {/* Full backup (Drive) section — the lossless whole-app snapshot,
              distinct from the Activity Log mirror above. This is what
              actually clones settings/tracker/plans/milestones/photos onto
              another device, the way a plain Sheets row never could. */}
          <div>
            <button
              className="w-full flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              onClick={() => setShowDriveBackup((v) => !v)}
            >
              <Upload size={14} />
              <span className="font-medium">Full backup (clone to another device)</span>
              <span className="text-stone-400">{showDriveBackup ? '▲' : '▼'}</span>
            </button>

            {showDriveBackup && (
              <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                <p className="text-xs text-stone-500 leading-relaxed">
                  This is a separate, lossless snapshot of everything on this device — not the
                  Activity Log above, which only mirrors text-friendly entries into a spreadsheet.
                  Do this on your laptop, then "Restore from Drive" on your phone (once it's also
                  connected here) to make it a live copy of the same data.
                </p>
                {fmtLastFullBackup && (
                  <p className="text-xs text-stone-400">Last backed up from this device: {fmtLastFullBackup}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleBackupToDrive}
                    disabled={status === 'backing-up' || status === 'restoring'}
                  >
                    <Upload size={13} /> {status === 'backing-up' ? 'Backing up…' : 'Backup to Drive'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleFetchDriveBackup}
                    disabled={status === 'backing-up' || status === 'restoring'}
                  >
                    <Download size={13} /> {status === 'restoring' ? 'Checking Drive…' : 'Restore from Drive'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Import section */}
          <div>
            <button
              className="w-full flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              onClick={() => setShowImport((v) => !v)}
            >
              <Download size={14} />
              <span className="font-medium">Import from existing Google Sheet</span>
              <span className="ml-auto text-stone-400">{showImport ? '▲' : '▼'}</span>
            </button>

            {showImport && (
              <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                <p className="text-xs text-stone-500">
                  Paste a link to any sheet with Activity / Start Time / End Time / Notes columns
                  (any order, plus an optional Date column — column names are matched automatically).
                </p>
                <Input
                  label="Google Sheets URL or ID"
                  value={importUrl}
                  onChange={(e) => { setImportUrl(e.target.value); setImportTabs(null); setImportPreview(null) }}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                />
                {!importTabs ? (
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={handleLoadTabs}
                    disabled={status === 'previewing'}
                  >
                    {status === 'previewing' ? 'Loading tabs…' : 'Load tabs'}
                  </Button>
                ) : !importPreview ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-stone-600">Which tab(s) do you want to import?</p>
                    <div className="space-y-1.5">
                      {importTabs.map((t) => (
                        <label key={t.title} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTabs.has(t.title)}
                            onChange={() => toggleTab(t.title)}
                            className="accent-sage-500"
                          />
                          {t.title}
                        </label>
                      ))}
                    </div>
                    {needsFallbackDate && (
                      <Input
                        label="This sheet has no Date column — which date do these rows belong to?"
                        type="date"
                        value={fallbackDate}
                        onChange={(e) => setFallbackDate(e.target.value)}
                      />
                    )}
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={handlePreviewImport}
                      disabled={status === 'previewing'}
                    >
                      {status === 'previewing' ? 'Reading sheet…' : 'Preview import'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-periwinkle-50 rounded-xl p-3 text-sm">
                      <p className="font-medium text-periwinkle-700 mb-1">Ready to import</p>
                      <ul className="text-xs text-periwinkle-600 space-y-0.5">
                        <li>🍼 {importPreview.feeds.length} feeding{importPreview.feeds.length !== 1 ? 's' : ''}</li>
                        <li>🌙 {importPreview.sleep.length} sleep session{importPreview.sleep.length !== 1 ? 's' : ''}</li>
                        <li>🧷 {importPreview.diaper.length} nappy change{importPreview.diaper.length !== 1 ? 's' : ''}</li>
                        <li>🧸 {importPreview.play.length} play session{importPreview.play.length !== 1 ? 's' : ''}</li>
                        {importPreview.skipped > 0 && (
                          <li className="text-stone-400">↳ {importPreview.skipped} other row{importPreview.skipped !== 1 ? 's' : ''} skipped (unrecognized activity)</li>
                        )}
                      </ul>
                      <p className="text-xs text-periwinkle-500 mt-1.5">Rows already in your log won't be duplicated.</p>
                    </div>
                    {importPreview.warnings.length > 0 && (
                      <div className="bg-blush-50 border border-blush-200 rounded-xl p-3 text-xs text-blush-700 space-y-1">
                        <p className="font-medium flex items-center gap-1.5"><AlertCircle size={13} /> Couldn't reconcile {importPreview.warnings.length} row{importPreview.warnings.length !== 1 ? 's' : ''}</p>
                        <ul className="space-y-1 text-blush-600">
                          {importPreview.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setImportPreview(null)}>Back</Button>
                      <Button fullWidth onClick={handleConfirmImport}>Confirm import</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {importSuccess && (
            <div className="flex items-center gap-2 text-sm text-sage-700 bg-sage-50 rounded-xl p-3">
              <CheckCircle2 size={15} />
              {importSuccess}
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-stone-400">
            Disconnect Google account
          </Button>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && errorMsg && (
        <div className="mt-3 flex items-start gap-2 bg-blush-50 border border-blush-200 rounded-xl p-3 text-sm text-blush-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 bg-sage-50 rounded-xl p-3 text-sm text-sage-700">
          <CheckCircle2 size={15} />
          {successMessage}
        </div>
      )}

      <Modal open={!!pendingDriveRestore} onClose={() => setPendingDriveRestore(null)} title="Restore this Drive backup?">
        {pendingDriveRestore && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-blush-50 border border-blush-200 rounded-xl p-3 text-sm text-blush-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                This replaces everything currently on this device with the backup below. There's
                no undo — anything logged here since that backup was taken (and not also in it)
                will be gone.
              </p>
            </div>
            <div className="bg-cream-100 rounded-2xl p-4 space-y-1 text-sm text-stone-600">
              <p className="text-xs font-black uppercase tracking-wide text-stone-400 mb-1">
                From {pendingDriveRestore.source}
              </p>
              {summarizeBackup(pendingDriveRestore.backup).map((line) => <p key={line}>{line}</p>)}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setPendingDriveRestore(null)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={confirmDriveRestore}>Restore & replace</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!pendingConflict}
        onClose={() => { setPendingConflict(null); setConflictChoice(null) }}
        title="This device and Drive disagree"
        maxWidth="max-w-xl"
      >
        {pendingConflict && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-blush-50 border border-blush-200 rounded-xl p-3 text-sm text-blush-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                This device's data and the backup in Google Drive have diverged — restoring one
                over the other will lose whatever's only on the other side. Before choosing,
                double-check both summaries below for a mistake you meant to fix — if you spot
                one, close this, correct it on that device, then try again.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConflictChoice('local')}
                className={`text-left rounded-2xl p-4 space-y-1 border transition-colors ${
                  conflictChoice === 'local' ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" readOnly checked={conflictChoice === 'local'} className="accent-stone-700" />
                  <p className="text-xs font-black uppercase tracking-wide text-stone-400">This device</p>
                </div>
                {summarizeBackup(pendingConflict.local).map((line) => (
                  <p key={line} className="text-sm text-stone-600">{line}</p>
                ))}
              </button>

              <button
                type="button"
                onClick={() => setConflictChoice('remote')}
                className={`text-left rounded-2xl p-4 space-y-1 border transition-colors ${
                  conflictChoice === 'remote' ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" readOnly checked={conflictChoice === 'remote'} className="accent-stone-700" />
                  <p className="text-xs font-black uppercase tracking-wide text-stone-400">Google Drive</p>
                </div>
                {summarizeBackup(pendingConflict.remote).map((line) => (
                  <p key={line} className="text-sm text-stone-600">{line}</p>
                ))}
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {conflictChoice === 'local' &&
                "This device's data stays as-is, and the Drive backup gets overwritten with it — so the other device sees this version next time it restores."}
              {conflictChoice === 'remote' &&
                "This device's data gets replaced with the Drive backup shown above. There's no undo for what's only here right now."}
              {!conflictChoice && 'Pick which version to keep — you can still cancel first if you need to check something.'}
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => { setPendingConflict(null); setConflictChoice(null) }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                disabled={!conflictChoice || status === 'backing-up'}
                onClick={confirmConflictResolution}
              >
                {status === 'backing-up' ? 'Updating Drive…' : 'Keep selected version'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}

// ── Local Events section ──────────────────────────────────────────────────────

function LocalEventsSection() {
  const {
    baby, ticketmasterApiKey, setTicketmasterApiKey, eventsRadiusMiles, setEventsRadiusMiles,
    newsSearchEnabled, setNewsSearchEnabled, localFeedUrl, setLocalFeedUrl,
    rss2jsonApiKey, setRss2jsonApiKey, lastEventsFetch, setLocalEvents,
  } = useAppStore()

  const [apiKeyInput, setApiKeyInput] = useState(ticketmasterApiKey)
  const [radiusInput, setRadiusInput] = useState(eventsRadiusMiles)
  const [newsInput, setNewsInput] = useState(newsSearchEnabled)
  const [feedUrlInput, setFeedUrlInput] = useState(localFeedUrl)
  const [rss2jsonKeyInput, setRss2jsonKeyInput] = useState(rss2jsonApiKey)
  const [status, setStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function persistInputs() {
    setTicketmasterApiKey(apiKeyInput.trim())
    setEventsRadiusMiles(radiusInput)
    setNewsSearchEnabled(newsInput)
    setLocalFeedUrl(feedUrlInput.trim())
    setRss2jsonApiKey(rss2jsonKeyInput.trim())
  }

  function handleSave() {
    persistInputs()
    setStatus('success')
    setTimeout(() => setStatus('idle'), 2000)
  }

  async function handleRefreshNow() {
    if (!baby.locationEnabled || !baby.location.trim()) {
      setStatus('error')
      setErrorMsg('Turn on "Enable location-based activity suggestions" above and add your postcode first.')
      return
    }
    if (!apiKeyInput.trim() && !newsInput && !feedUrlInput.trim()) {
      setStatus('error')
      setErrorMsg('Add at least one source: a Ticketmaster API key, Google News, or a local feed URL.')
      return
    }
    setStatus('refreshing')
    setErrorMsg('')
    persistInputs()
    try {
      const { events, errors } = await fetchAllLocalEvents({
        postcode: baby.location,
        ticketmasterApiKey: apiKeyInput.trim(),
        radiusMiles: radiusInput,
        newsSearchEnabled: newsInput,
        localFeedUrl: feedUrlInput.trim(),
        rss2jsonApiKey: rss2jsonKeyInput.trim(),
      })
      setLocalEvents(events, new Date().toISOString())
      if (errors.length) {
        setStatus('error')
        setErrorMsg(errors.join(' '))
      } else {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof LocalEventsFetchError ? e.message : 'Could not refresh local events.')
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-1">
        <MapPin size={18} className="text-sage-500 shrink-0" />
        <div className="flex-1">
          <h2 className="font-display text-base text-stone-700">Local Events</h2>
          <p className="text-xs text-stone-400">Real, nearby events — controlled by "Enable location-based activity suggestions" above</p>
        </div>
        {baby.locationEnabled && (ticketmasterApiKey || newsSearchEnabled || localFeedUrl) && (
          <Badge className="bg-sage-100 text-sage-700 shrink-0">Active</Badge>
        )}
      </div>

      <div className="bg-cream-100 rounded-2xl p-4 mt-3 mb-3">
        <p className="text-xs text-stone-500 leading-relaxed">
          Three optional web sources, all real, never made up: Ticketmaster's listings, a Google News search for
          local family/kids coverage, and any local blog, newsletter, or "things to do" site/handle you point at
          below. This app has no server, so each is called directly from your device, and everything refreshes
          automatically about once a week.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            label="Ticketmaster API key (optional)"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value.trim())}
            placeholder="Paste your Consumer Key"
          />
          <p className="text-xs text-stone-400 leading-relaxed mt-1.5">
            Free —{' '}
            <a
              href="https://developer.ticketmaster.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-periwinkle-500 underline"
            >
              sign up at developer.ticketmaster.com
            </a>
            , create an app, then copy its "Consumer Key" here. Gives structured events with real dates and venues.
          </p>
        </div>

        <div>
          <p className="block text-sm font-medium text-stone-600 mb-1.5">Search radius (Ticketmaster)</p>
          <div className="flex gap-2">
            {[5, 15, 30].map((m) => (
              <button
                key={m}
                onClick={() => setRadiusInput(m)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${radiusInput === m ? 'border-stone-700 bg-cream-100' : 'border-stone-100 hover:border-stone-300'}`}
              >
                {m} miles
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setNewsInput((v) => !v)}
            className={`w-10 h-6 rounded-full flex items-center transition-all shrink-0 ${newsInput ? 'bg-stone-800' : 'bg-stone-400'}`}
          >
            <span className={`w-4 h-4 bg-cream-50 rounded-full shadow-sm ml-1 transition-all ${newsInput ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm text-stone-600">Also search Google News for local family/kids coverage</span>
        </label>

        <div>
          <Input
            label="Local site or blog feed (optional)"
            value={feedUrlInput}
            onChange={(e) => setFeedUrlInput(e.target.value.trim())}
            placeholder="https://yourlocalblog.com/feed"
          />
          <p className="text-xs text-stone-400 leading-relaxed mt-1.5">
            Paste the RSS/Atom feed URL of any local site, newsletter, or "things to do" handle you already follow —
            most WordPress sites expose one at <code>/feed</code>. Its own items show up tagged with the feed's own
            site name, exactly as published — nothing here is written by this app.
          </p>
          <p className="text-xs text-periwinkle-600 bg-periwinkle-50 border border-periwinkle-200 rounded-lg px-2.5 py-2 leading-relaxed mt-2">
            Defaults to Boston.com's "Family" feed, just as a working example — not everyone's local area! If you're
            elsewhere (or just have a favorite local blog/newsletter), swap this for a feed you actually follow.
          </p>
        </div>

        <div>
          <Input
            label="rss2json API key (optional)"
            value={rss2jsonKeyInput}
            onChange={(e) => setRss2jsonKeyInput(e.target.value.trim())}
            placeholder="Only needed for higher reliability"
          />
          <p className="text-xs text-stone-400 leading-relaxed mt-1.5">
            Google News and blog feeds don't allow this app to read them directly, so both go through{' '}
            <a
              href="https://rss2json.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-periwinkle-500 underline"
            >
              rss2json.com
            </a>
            , a free feed-to-JSON converter. It works without a key for occasional weekly refreshes — add a free key
            here only if you hit its rate limit.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={handleSave}>Save</Button>
          <Button fullWidth onClick={handleRefreshNow} disabled={status === 'refreshing'}>
            {status === 'refreshing' ? 'Refreshing…' : 'Refresh now'}
          </Button>
        </div>

        {lastEventsFetch && (
          <p className="text-xs text-stone-400">Last refreshed {format(parseISO(lastEventsFetch), "d MMM 'at' h:mm a")}.</p>
        )}

        {status === 'error' && errorMsg && (
          <div className="flex items-start gap-2 bg-blush-50 border border-blush-200 rounded-xl p-3 text-sm text-blush-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-2 bg-sage-50 rounded-xl p-3 text-sm text-sage-700">
            <CheckCircle2 size={15} />
            Saved.
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Main Settings page ────────────────────────────────────────────────────────

export function Settings() {
  const { baby, setBaby } = useAppStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...baby })
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm({ ...baby }) }, [baby])

  function set(key: string, value: string | boolean | number | null) {
    setForm((prev) => ({
      ...prev,
      [key]: typeof value === 'string' ? normaliseQuotes(value) : value,
    }))
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
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center text-3xl bg-marigold-400 border-4 border-stone-800 rounded-2xl shadow-brutal-sm animate-float">
              🧸
            </div>
            <span className="font-display font-black text-stone-800 text-3xl block leading-tight">Parents'</span>
            <span className="font-display font-black text-stone-800 text-3xl block leading-tight">Little Helper</span>
            <p className="text-stone-500 font-bold text-sm mt-3">Let's get to know your little one.</p>
          </div>
          <ProfileSection form={form} set={set} onSave={save} isOnboarding />
        </div>
      ) : (
        <PageShell title="Settings" subtitle="Profile, preferences & sync">
          <div className="space-y-4">
            <ProfileSection form={form} set={set} onSave={save} saved={saved} />
            <AppearanceSection />
            <LanguagesSection />
            <LocalEventsSection />
            <GoogleSection />
            <BackupSection />
          </div>
        </PageShell>
      )}
    </div>
  )
}
