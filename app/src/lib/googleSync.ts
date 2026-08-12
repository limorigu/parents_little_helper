// ---------------------------------------------------------------------------
// Google Drive + Sheets sync
//
// All app data lives in localStorage (Zustand persist). This module is a
// one-way mirror: on demand it writes every record into a Google Spreadsheet
// and uploads any base64 media to a Google Drive folder.
//
// Import direction: fetch an existing sheet with the activity-log format
// (Activity | Start Time | End Time | Duration | Notes) and translate rows
// into FeedEntry / SleepEntry / DiaperEntry objects the store can absorb.
// ---------------------------------------------------------------------------

import { format, parseISO } from 'date-fns'
import type {
  FeedEntry,
  SleepEntry,
  DiaperEntry,
  GrowthEntry,
  RecordedMilestone,
  DoctorVisit,
} from '../store/useAppStore'

// ── REST base URLs ──────────────────────────────────────────────────────────
const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'

type Row = (string | number)[]

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function driveGet<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`${DRIVE}${path}`, { headers: auth(token) })
  if (!r.ok) throw new Error(`Drive ${r.status}: ${await r.text()}`)
  return r.json()
}

async function drivePost<T>(token: string, body: unknown): Promise<T> {
  const r = await fetch(DRIVE, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Drive create ${r.status}: ${await r.text()}`)
  return r.json()
}

async function drivePatch<T>(token: string, fileId: string, params: string, body: unknown = {}): Promise<T> {
  const r = await fetch(`${DRIVE}/${fileId}?${params}`, {
    method: 'PATCH',
    headers: auth(token),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Drive patch ${r.status}: ${await r.text()}`)
  return r.json()
}

async function sheetsPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const r = await fetch(`${SHEETS}${path}`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${await r.text()}`)
  return r.json()
}

// ── Drive folder helpers ────────────────────────────────────────────────────

/** Find or create a Drive folder, optionally inside a parent. */
export async function findOrCreateFolder(
  token: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const parentQ = parentId ? ` and '${parentId}' in parents` : ''
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQ}`
  const { files } = await driveGet<{ files: { id: string }[] }>(
    token,
    `?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
  )
  if (files.length) return files[0].id

  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) body.parents = [parentId]
  const { id } = await drivePost<{ id: string }>(token, body)
  return id
}

/** Set up (or reuse) the app's Drive folder tree. Returns both folder IDs. */
export async function setupDrive(
  token: string,
  babyName: string,
): Promise<{ folderId: string; mediaFolderId: string }> {
  const label = babyName ? `Parents' Little Helper – ${babyName}` : "Parents' Little Helper"
  const folderId = await findOrCreateFolder(token, label)
  const mediaFolderId = await findOrCreateFolder(token, 'Media', folderId)
  return { folderId, mediaFolderId }
}

/** Upload a base64 data URL to Drive. Returns { id, webViewLink }. */
export async function uploadMedia(
  token: string,
  folderId: string,
  base64DataUrl: string,
  filename: string,
): Promise<{ id: string; webViewLink: string }> {
  const [header, data] = base64DataUrl.split(',')
  const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const meta = JSON.stringify({ name: filename, parents: [folderId] })
  const form = new FormData()
  form.append('metadata', new Blob([meta], { type: 'application/json' }))
  form.append('file', new Blob([bytes], { type: mimeType }), filename)

  const r = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!r.ok) throw new Error(`Media upload ${r.status}: ${await r.text()}`)
  return r.json()
}

// ── Spreadsheet helpers ─────────────────────────────────────────────────────

const SHEET_NAMES = ['Activity Log', 'Milestones', 'Growth', 'Doctor Visits'] as const

/** Find or create the app spreadsheet inside the given Drive folder. */
export async function findOrCreateSpreadsheet(
  token: string,
  folderId: string,
  title: string,
): Promise<string> {
  const q = `name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`
  const { files } = await driveGet<{ files: { id: string }[] }>(
    token,
    `?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
  )
  if (files.length) return files[0].id

  // Create spreadsheet with all needed sheets via Sheets API
  const { spreadsheetId } = await sheetsPost<{ spreadsheetId: string }>(token, '', {
    properties: { title },
    sheets: SHEET_NAMES.map((name, i) => ({
      properties: { sheetId: i, title: name, index: i },
    })),
  })

  // Move from root into the app folder
  await drivePatch(token, spreadsheetId, `addParents=${folderId}&removeParents=root&fields=id`)

  return spreadsheetId
}

// ── Row formatters ──────────────────────────────────────────────────────────

function fmt12(iso: string): string {
  return format(parseISO(iso), 'hh:mm a')
}

/** "H:MM" duration string from a minute count. */
function fmtDur(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

function feedRow(f: FeedEntry): Row {
  const typeLabel: Record<FeedEntry['type'], string> = {
    'breast-left': 'Feeding (L breast)',
    'breast-right': 'Feeding (R breast)',
    'bottle-formula': 'Feeding (formula)',
    'bottle-pumped': 'Feeding (pumped)',
    solid: 'Feeding (solid)',
  }
  const startIso = f.date
  const endIso = f.durationMinutes
    ? new Date(new Date(startIso).getTime() + f.durationMinutes * 60_000).toISOString()
    : ''
  return [
    typeLabel[f.type],
    fmt12(startIso),
    endIso ? fmt12(endIso) : '',
    f.durationMinutes ? fmtDur(f.durationMinutes) : f.amountMl ? `${f.amountMl}ml` : '',
    f.notes,
    startIso.slice(0, 10),
  ]
}

function sleepRow(s: SleepEntry): Row {
  const mins =
    s.endTime
      ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000)
      : null
  return [
    s.type === 'night' ? 'Sleep (night)' : 'Sleep (nap)',
    fmt12(s.startTime),
    s.endTime ? fmt12(s.endTime) : '',
    mins !== null ? fmtDur(mins) : '',
    s.notes,
    s.startTime.slice(0, 10),
  ]
}

function diaperRow(d: DiaperEntry): Row {
  const mins =
    d.endTime
      ? Math.round((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 60_000)
      : null
  return [
    `Diaper (${d.type})`,
    fmt12(d.startTime),
    d.endTime ? fmt12(d.endTime) : '',
    mins !== null ? fmtDur(mins) : '',
    d.notes,
    d.startTime.slice(0, 10),
  ]
}

// ── Write helpers ───────────────────────────────────────────────────────────

async function putSheet(token: string, sheetId: string, sheetName: string, rows: Row[]): Promise<void> {
  const range = encodeURIComponent(`'${sheetName}'!A1`)
  const r = await fetch(
    `${SHEETS}/${sheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ values: rows }),
    },
  )
  if (!r.ok) throw new Error(`Sheet write "${sheetName}" ${r.status}: ${await r.text()}`)
}

// ── Main sync ───────────────────────────────────────────────────────────────

export interface SyncPayload {
  feeds: FeedEntry[]
  sleep: SleepEntry[]
  diaper: DiaperEntry[]
  growth: GrowthEntry[]
  recordedMilestones: RecordedMilestone[]
  doctorVisits: DoctorVisit[]
}

/** Write all app data into the spreadsheet (full replace, not append). */
export async function syncAllData(
  token: string,
  spreadsheetId: string,
  data: SyncPayload,
): Promise<void> {
  const { feeds, sleep, diaper, growth, recordedMilestones, doctorVisits } = data

  // Activity Log — sorted by date then start time
  const activityRows: Row[] = [
    ['Activity', 'Start Time', 'End Time', 'Duration', 'Notes', 'Date'],
    ...[
      ...feeds.map(feedRow),
      ...sleep.map(sleepRow),
      ...diaper.map(diaperRow),
    ].sort((a, b) =>
      String(a[5]).localeCompare(String(b[5])) || String(a[1]).localeCompare(String(b[1])),
    ),
  ]
  await putSheet(token, spreadsheetId, 'Activity Log', activityRows)

  // Milestones
  const milestoneRows: Row[] = [
    ['Date', 'Week', 'Title', 'Category', 'Notes', 'Media URL'],
    ...recordedMilestones.map((m) => [
      m.date,
      m.week,
      m.title,
      m.milestoneId ?? 'custom',
      m.notes,
      m.mediaUrl ?? '',
    ]),
  ]
  await putSheet(token, spreadsheetId, 'Milestones', milestoneRows)

  // Growth
  const growthRows: Row[] = [
    ['Date', 'Weight (g)', 'Height (cm)', 'Head Circ (cm)', 'Notes'],
    ...growth.map((g) => [
      g.date,
      g.weightGrams ?? '',
      g.heightCm ?? '',
      g.headCircCm ?? '',
      g.notes,
    ]),
  ]
  await putSheet(token, spreadsheetId, 'Growth', growthRows)

  // Doctor Visits
  const doctorRows: Row[] = [
    ['Date', 'Type', 'Notes', 'Questions', 'Completed'],
    ...doctorVisits.map((v) => [
      v.date,
      v.type,
      v.notes,
      v.questions.join('\n'),
      v.completed ? 'Yes' : 'No',
    ]),
  ]
  await putSheet(token, spreadsheetId, 'Doctor Visits', doctorRows)
}

// ── Import ──────────────────────────────────────────────────────────────────

export interface ImportedData {
  feeds: Omit<FeedEntry, 'id'>[]
  sleep: Omit<SleepEntry, 'id'>[]
  diaper: Omit<DiaperEntry, 'id'>[]
  skipped: number
  total: number
}

/** Parse a 12h or 24h time string + a date string into an ISO datetime. */
function parseTime(raw: string, dateStr: string): string | null {
  const t = raw.trim()
  if (!t) return null

  // "6:20:00 PM" — with seconds
  const m3 = t.match(/^(\d{1,2}):(\d{2}):\d{2}\s*(AM|PM)?$/i)
  if (m3) return toISO(m3[1], m3[2], m3[3], dateStr)

  // "6:20 PM" or "06:20"
  const m2 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (m2) return toISO(m2[1], m2[2], m2[3], dateStr)

  return null
}

function toISO(hStr: string, mStr: string, meridiem: string | undefined, dateStr: string): string {
  let h = parseInt(hStr, 10)
  const m = mStr.padStart(2, '0')
  if (meridiem) {
    const mer = meridiem.toUpperCase()
    if (mer === 'PM' && h !== 12) h += 12
    if (mer === 'AM' && h === 12) h = 0
  }
  return `${dateStr}T${String(h).padStart(2, '0')}:${m}:00`
}

/** Parse raw sheet rows (string[][]) into typed app entries. */
export function parseActivityRows(rows: string[][], dateStr: string): ImportedData {
  const result: ImportedData = { feeds: [], sleep: [], diaper: [], skipped: 0, total: 0 }

  // Skip header row(s) — look for "activity" in column 0
  let start = 0
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === 'activity') { start = i + 1; break }
  }

  for (let i = start; i < rows.length; i++) {
    const row = rows[i]
    const activity = row[0]?.trim().toLowerCase() ?? ''
    if (!activity) continue

    result.total++
    const startIso = parseTime(row[1] ?? '', dateStr)
    const endIso   = parseTime(row[2] ?? '', dateStr)
    const notes    = row[4]?.trim() ?? ''

    if (activity === 'feeding' || activity.startsWith('feeding')) {
      const durationMins =
        startIso && endIso
          ? Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)
          : null
      result.feeds.push({
        date: startIso ?? `${dateStr}T00:00:00`,
        type: 'breast-left',  // default; user can edit individual entries later
        durationMinutes: durationMins && durationMins > 0 ? durationMins : null,
        amountMl: null,
        notes,
      })
    } else if (activity === 'sleep' || activity.startsWith('sleep')) {
      const durMs =
        startIso && endIso
          ? new Date(endIso).getTime() - new Date(startIso).getTime()
          : 0
      result.sleep.push({
        startTime: startIso ?? `${dateStr}T00:00:00`,
        endTime: endIso,
        type: durMs >= 3 * 3_600_000 ? 'night' : 'nap',
        location: '',
        notes,
      })
    } else if (activity === 'diaper' || activity.startsWith('diaper')) {
      result.diaper.push({
        startTime: startIso ?? `${dateStr}T00:00:00`,
        endTime: endIso,
        type: 'unknown',
        notes,
      })
    } else {
      // Play, custom activity, etc. — acknowledged but not imported
      result.skipped++
    }
  }

  return result
}

/** Fetch a spreadsheet by ID and parse its first visible sheet. */
export async function importFromSpreadsheet(
  token: string,
  spreadsheetId: string,
  dateStr: string,
): Promise<ImportedData> {
  const r = await fetch(
    `${SHEETS}/${spreadsheetId}/values/A:F?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!r.ok) {
    if (r.status === 403) throw new Error("Access denied — make sure you've shared this sheet with the connected account, or open it so 'anyone with the link can view'.")
    throw new Error(`Could not read spreadsheet (${r.status})`)
  }
  const json = await r.json()
  const rows: string[][] = json.values ?? []
  return parseActivityRows(rows, dateStr)
}

/** Extract a spreadsheet ID from a Google Sheets URL, or return the value as-is. */
export function extractSpreadsheetId(urlOrId: string): string {
  const m = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : urlOrId.trim()
}
