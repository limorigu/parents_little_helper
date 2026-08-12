import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, CloudOff, RefreshCw, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PageShell } from '../components/layout/PageShell'
import { getBabyAgeLabel, normaliseQuotes, today, uid } from '../lib/utils'
import { signIn, signOut, getToken, isSignedIn } from '../lib/googleApi'
import {
  setupDrive,
  findOrCreateSpreadsheet,
  syncAllData,
  importFromTabs,
  extractSpreadsheetId,
  listSheetTabs,
  createSheetTab,
  MissingDateError,
} from '../lib/googleSync'
import type { ImportedData } from '../lib/googleSync'

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
          All your data is stored locally on this device only, unless you opt in to Google Sync below.
        </p>
      )}
    </div>
  )
}

// ── Google Sync section ───────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'importing' | 'previewing' | 'error' | 'success'

function GoogleSection() {
  const store = useAppStore()
  const {
    baby, googleClientId, googleFolderId, googleSheetId, googleLastSync, googleWriteSheetName,
    setGoogleConfig, feeds, sleep, diaper, play, growth, recordedMilestones, doctorVisits,
    addFeed, addSleep, addDiaper, addPlay,
  } = store

  const [clientIdInput, setClientIdInput] = useState(googleClientId)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

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

  // Derive connection from in-memory token (re-checks on each render)
  const connected = isSignedIn()

  function err(msg: string) { setStatus('error'); setErrorMsg(msg) }

  async function ensureDriveAndSheet(token: string): Promise<{ folderId: string; sheetId: string }> {
    let folderId = googleFolderId
    let sheetId = googleSheetId

    if (!folderId || !sheetId) {
      const { folderId: fi } = await setupDrive(token, baby.name)
      folderId = fi
      const title = baby.name ? `${baby.name}'s Log` : "Baby's Log"
      sheetId = await findOrCreateSpreadsheet(token, folderId, title)
      setGoogleConfig({ folderId, sheetId })
    }
    return { folderId, sheetId }
  }

  async function handleConnect() {
    if (!clientIdInput.trim()) { err('Please enter your Google Client ID first.'); return }
    setStatus('connecting')
    setErrorMsg('')
    try {
      const token = await signIn(clientIdInput.trim())
      setGoogleConfig({ clientId: clientIdInput.trim() })
      // Immediately set up Drive folder + sheet on first connect
      const { sheetId } = await ensureDriveAndSheet(token)
      await syncAllData(token, sheetId, { feeds, sleep, diaper, play, growth, recordedMilestones, doctorVisits })
      setGoogleConfig({ lastSync: new Date().toISOString() })
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
      const { sheetId } = await ensureDriveAndSheet(token)
      await syncAllData(token, sheetId, { feeds, sleep, diaper, play, growth, recordedMilestones, doctorVisits })
      setGoogleConfig({ lastSync: new Date().toISOString() })
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

  const fmtLastSync = googleLastSync
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(googleLastSync))
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

      {!connected ? (
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

          {/* Client ID field */}
          <div className="space-y-1">
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
              <span className="text-stone-300">{showWriteTarget ? '▲' : '▼'}</span>
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

          {/* Import section */}
          <div>
            <button
              className="w-full flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              onClick={() => setShowImport((v) => !v)}
            >
              <Download size={14} />
              <span className="font-medium">Import from existing Google Sheet</span>
              <span className="ml-auto text-stone-300">{showImport ? '▲' : '▼'}</span>
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
          Synced successfully.
        </div>
      )}
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
            <GoogleSection />
          </div>
        </PageShell>
      )}
    </div>
  )
}
