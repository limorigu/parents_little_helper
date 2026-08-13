// ---------------------------------------------------------------------------
// Google Drive + Sheets sync
//
// All app data lives in localStorage (Zustand persist). This module is a
// mirror on top of that: it can write every record into a Google Spreadsheet,
// upload base64 media to a Google Drive folder, and read an existing
// spreadsheet (any tab, any column order) back into the app's data shapes.
// ---------------------------------------------------------------------------

import { format, parseISO } from 'date-fns'
import type {
  FeedEntry,
  SleepEntry,
  DiaperEntry,
  PlayEntry,
  GrowthEntry,
  RecordedMilestone,
  DoctorVisit,
} from '../store/useAppStore'

// ── REST base URLs ──────────────────────────────────────────────────────────
const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'

type Row = (string | number)[]

const DEFAULT_HEADERS = ['Date', 'Activity', 'Start Time', 'End Time', 'Duration', 'Notes']

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/** Escape single quotes for use inside a Drive API `q` query string literal. */
function escapeQ(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Quote + escape a sheet/tab name for use in an A1-notation range (e.g. 'My Tab'!A1). */
function quoteSheetName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`
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

async function sheetsGet<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`${SHEETS}${path}`, { headers: { Authorization: `Bearer ${token}` } })
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
  const parentQ = parentId ? ` and '${escapeQ(parentId)}' in parents` : ''
  const q = `name='${escapeQ(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQ}`
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

/**
 * Set up (or reuse) the app's Drive folder tree, entirely inside the user's
 * own connected Google Drive. If `parentFolderId` is given, the app's folder
 * is nested inside that existing folder instead of the root of "My Drive" —
 * this is how a user keeps full control over exactly where their data (and
 * uploaded media) lives. Returns both folder IDs.
 */
export async function setupDrive(
  token: string,
  babyName: string,
  parentFolderId?: string | null,
): Promise<{ folderId: string; mediaFolderId: string }> {
  const label = babyName ? `Parents' Little Helper – ${babyName}` : "Parents' Little Helper"
  const folderId = await findOrCreateFolder(token, label, parentFolderId ?? undefined)
  const mediaFolderId = await findOrCreateFolder(token, 'Media', folderId)
  return { folderId, mediaFolderId }
}

/** Extract a Drive folder ID from a "Add to Drive" / folder share link, or return the value as-is. */
export function extractFolderId(urlOrId: string): string {
  const m = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : urlOrId.trim()
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
  const q = `name='${escapeQ(title)}' and mimeType='application/vnd.google-apps.spreadsheet' and '${escapeQ(folderId)}' in parents and trashed=false`
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

/** List every tab (sheet) in a spreadsheet, in left-to-right order. */
export async function listSheetTabs(
  token: string,
  spreadsheetId: string,
): Promise<{ sheetId: number; title: string }[]> {
  const json = await sheetsGet<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(
    token,
    `/${spreadsheetId}?fields=sheets.properties`,
  )
  return (json.sheets ?? []).map((s) => ({ sheetId: s.properties.sheetId, title: s.properties.title }))
}

/** Create a new tab in an existing spreadsheet, pre-filled with the standard header row. */
export async function createSheetTab(
  token: string,
  spreadsheetId: string,
  title: string,
): Promise<number> {
  const json = await sheetsPost<{ replies: { addSheet: { properties: { sheetId: number } } }[] }>(
    token,
    `/${spreadsheetId}:batchUpdate`,
    { requests: [{ addSheet: { properties: { title } } }] },
  )
  const sheetId = json.replies[0].addSheet.properties.sheetId
  await putSheet(token, spreadsheetId, title, [DEFAULT_HEADERS])
  return sheetId
}

// ── Row / field formatters ──────────────────────────────────────────────────

function fmt12(iso: string): string {
  return format(parseISO(iso), 'hh:mm a')
}

/** "H:MM" duration string from a minute count. */
function fmtDur(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

/** Canonical field set for one activity-log row, independent of column order. */
export interface EntryFields {
  date: string       // yyyy-mm-dd
  activity: string   // e.g. "Feeding (L breast)"
  startTime: string  // "06:20 PM"
  endTime: string
  duration: string   // "H:MM"
  notes: string
}

function fixedRow(f: EntryFields): Row {
  return [f.date, f.activity, f.startTime, f.endTime, f.duration, f.notes]
}

export function feedFields(f: FeedEntry): EntryFields {
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
  return {
    date: startIso.slice(0, 10),
    activity: typeLabel[f.type],
    startTime: fmt12(startIso),
    endTime: endIso ? fmt12(endIso) : '',
    duration: f.durationMinutes ? fmtDur(f.durationMinutes) : f.amountMl ? `${f.amountMl}ml` : '',
    notes: f.notes,
  }
}

export function sleepFields(s: SleepEntry): EntryFields {
  const mins =
    s.endTime
      ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000)
      : null
  return {
    date: s.startTime.slice(0, 10),
    activity: s.type === 'night' ? 'Sleep (night)' : 'Sleep (nap)',
    startTime: fmt12(s.startTime),
    endTime: s.endTime ? fmt12(s.endTime) : '',
    duration: mins !== null ? fmtDur(mins) : '',
    notes: s.notes,
  }
}

export function playFields(p: PlayEntry): EntryFields {
  const mins =
    p.endTime
      ? Math.round((new Date(p.endTime).getTime() - new Date(p.startTime).getTime()) / 60_000)
      : null
  return {
    date: p.startTime.slice(0, 10),
    activity: 'Play',
    startTime: fmt12(p.startTime),
    endTime: p.endTime ? fmt12(p.endTime) : '',
    duration: mins !== null ? fmtDur(mins) : '',
    notes: p.notes,
  }
}

export function diaperFields(d: DiaperEntry): EntryFields {
  const mins =
    d.endTime
      ? Math.round((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 60_000)
      : null
  return {
    date: d.startTime.slice(0, 10),
    activity: `Diaper (${d.type})`,
    startTime: fmt12(d.startTime),
    endTime: d.endTime ? fmt12(d.endTime) : '',
    duration: mins !== null ? fmtDur(mins) : '',
    notes: d.notes,
  }
}

// ── Header-aware row mapping ────────────────────────────────────────────────

type ColKey = 'date' | 'activity' | 'start' | 'end' | 'duration' | 'notes'

function classifyHeader(raw: string): ColKey | null {
  const n = (raw ?? '').trim().toLowerCase()
  if (!n) return null
  if (n.includes('date')) return 'date'
  if (n.includes('activity') || n.includes('type')) return 'activity'
  if (n.includes('start')) return 'start'
  if (n.includes('end')) return 'end'
  if (n.includes('duration') || n.includes('length')) return 'duration'
  if (n.includes('note')) return 'notes'
  return null
}

/** Build a row matching an arbitrary header order, for appending into any tab. */
function buildRowForHeaders(headers: string[], f: EntryFields): Row {
  return headers.map((h) => {
    switch (classifyHeader(h)) {
      case 'date': return f.date
      case 'activity': return f.activity
      case 'start': return f.startTime
      case 'end': return f.endTime
      case 'duration': return f.duration
      case 'notes': return f.notes
      default: return ''
    }
  })
}

// ── Write helpers ───────────────────────────────────────────────────────────

async function putSheet(token: string, spreadsheetId: string, sheetName: string, rows: Row[]): Promise<void> {
  const range = encodeURIComponent(`${quoteSheetName(sheetName)}!A1`)
  const r = await fetch(
    `${SHEETS}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ values: rows }),
    },
  )
  if (!r.ok) throw new Error(`Sheet write "${sheetName}" ${r.status}: ${await r.text()}`)
}

async function fetchTabRawValues(
  token: string,
  spreadsheetId: string,
  tabName: string,
  range = 'A1:Z2000',
): Promise<string[][]> {
  const path = encodeURIComponent(`${quoteSheetName(tabName)}!${range}`)
  const r = await fetch(`${SHEETS}/${spreadsheetId}/values/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) {
    if (r.status === 403) throw new Error("Access denied — make sure you've shared this sheet with the connected account, or open it so 'anyone with the link can view'.")
    throw new Error(`Could not read tab "${tabName}" (${r.status})`)
  }
  const json = await r.json()
  return json.values ?? []
}

/**
 * Append one activity-log entry to a tab, matching whatever column order that
 * tab already uses. If the tab is empty, writes the standard header row first.
 */
export async function appendEntryRow(
  token: string,
  spreadsheetId: string,
  tabName: string,
  fields: EntryFields,
): Promise<void> {
  const headerRows = await fetchTabRawValues(token, spreadsheetId, tabName, 'A1:Z1')
  let headers = headerRows[0] ?? []
  if (headers.length === 0 || headers.every((h) => !h?.trim())) {
    headers = DEFAULT_HEADERS
    await putSheet(token, spreadsheetId, tabName, [headers])
  }
  const row = buildRowForHeaders(headers, fields)
  const range = encodeURIComponent(`${quoteSheetName(tabName)}!A1`)
  const r = await fetch(
    `${SHEETS}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: auth(token), body: JSON.stringify({ values: [row] }) },
  )
  if (!r.ok) throw new Error(`Could not add row to "${tabName}" (${r.status}): ${await r.text()}`)
}

// ── Main sync (full replace of the Activity Log + reference tabs) ──────────

export interface SyncPayload {
  feeds: FeedEntry[]
  sleep: SleepEntry[]
  diaper: DiaperEntry[]
  play: PlayEntry[]
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
  const { feeds, sleep, diaper, play, growth, recordedMilestones, doctorVisits } = data

  // Activity Log — sorted by date then start time
  const activityRows: Row[] = [
    DEFAULT_HEADERS,
    ...[
      ...feeds.map(feedFields),
      ...sleep.map(sleepFields),
      ...diaper.map(diaperFields),
      ...play.map(playFields),
    ]
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .map(fixedRow),
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
  play: Omit<PlayEntry, 'id'>[]
  skipped: number
  total: number
  /** Rows where a start/end time pair couldn't be reconciled into a sane, non-negative duration. */
  warnings: string[]
}

/** Thrown when a tab has no recognizable Date column and no fallback date was given. */
export class MissingDateError extends Error {}

/** Parse a 12h or 24h time string + a date string into an ISO datetime. */
function parseTime(raw: string, dateStr: string): string | null {
  const t = (raw ?? '').trim()
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

/** Parse a date cell in whatever format a human typed it into. Returns yyyy-MM-dd. */
function parseFlexibleDate(raw: string): string | null {
  const t = (raw ?? '').trim()
  if (!t) return null

  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`

  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slash) {
    let [, mm, dd, yyyy] = slash
    if (yyyy.length === 2) yyyy = `20${yyyy}`
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  const parsed = new Date(t)
  if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd')
  return null
}

/** Parse a duration cell like "1:30" or "90" (minutes) into a minute count. */
function parseDurationToMinutes(raw: string): number | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const m = t.match(/^(\d+):(\d{2})(?::\d{2})?$/)
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const num = Number(t)
  return isNaN(num) ? null : num
}

/**
 * Start/End are parsed as time-of-day against a shared date, so a session
 * that runs past midnight (e.g. a nap starting at 10:30 PM and ending at
 * 6:00 AM) naturally comes out with an end time "before" the start time on
 * the same calendar day. If that happens, assume it rolled into the next day
 * and shift the end date forward by 24h. If the duration is still zero or
 * negative after that, we can't reliably reconcile it — rather than store a
 * negative/nonsense duration, drop the end time and return a warning so the
 * caller can surface it to the user.
 */
function resolveOvernightEnd(startIso: string, endIso: string): { endIso: string | null; warning?: string } {
  let end = endIso
  if (new Date(end).getTime() < new Date(startIso).getTime()) {
    end = format(new Date(new Date(end).getTime() + 24 * 3_600_000), "yyyy-MM-dd'T'HH:mm:ss")
  }
  if (new Date(end).getTime() <= new Date(startIso).getTime()) {
    return {
      endIso: null,
      warning: 'end time is before the start time (even assuming it rolled into the next day) — imported without an end time/duration',
    }
  }
  return { endIso: end }
}

/**
 * Parse raw sheet rows (string[][]) into typed app entries.
 *
 * Columns are detected by header name (not fixed position), so the sheet can
 * be in any order (Date first, Activity first, extra columns, etc). If the
 * sheet has its own Date column, that's the source of truth per-row (with
 * fill-down for blank cells); `fallbackDateStr` is only used when no Date
 * column exists at all, or a leading row is missing a date and nothing has
 * been seen yet — if that happens and no fallback was given, this throws
 * MissingDateError so the caller can prompt for one.
 */
export function parseActivityRows(
  rows: string[][],
  fallbackDateStr?: string,
  tabLabel = 'this tab',
): ImportedData {
  const result: ImportedData = { feeds: [], sleep: [], diaper: [], play: [], skipped: 0, total: 0, warnings: [] }
  if (rows.length === 0) return result

  // Find the header row: the first row (within the first few) that contains
  // a recognizable "activity" column.
  let headerIdx = -1
  let colMap: Partial<Record<ColKey, number>> = {}
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const map: Partial<Record<ColKey, number>> = {}
    rows[i].forEach((cell, idx) => {
      const key = classifyHeader(cell)
      if (key && map[key] === undefined) map[key] = idx
    })
    if (map.activity !== undefined) {
      headerIdx = i
      colMap = map
      break
    }
  }
  if (headerIdx === -1) return result // no usable header found — nothing to import

  if (colMap.date === undefined && !fallbackDateStr) {
    throw new MissingDateError(`${tabLabel} has no "Date" column — please pick a date to use for its rows.`)
  }

  let runningDate = fallbackDateStr ?? null

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const activity = (colMap.activity !== undefined ? row[colMap.activity] : '')?.trim().toLowerCase() ?? ''
    if (!activity) continue

    if (colMap.date !== undefined) {
      const rowDate = parseFlexibleDate(row[colMap.date] ?? '')
      if (rowDate) runningDate = rowDate
    }
    if (!runningDate) {
      if (!fallbackDateStr) throw new MissingDateError(`${tabLabel} is missing a date for row ${i + 1} — please pick a fallback date.`)
      runningDate = fallbackDateStr
    }
    const dateStr = runningDate

    result.total++
    const startIso = colMap.start !== undefined ? parseTime(row[colMap.start] ?? '', dateStr) : null
    let endIso = colMap.end !== undefined ? parseTime(row[colMap.end] ?? '', dateStr) : null

    if (startIso && endIso) {
      const resolved = resolveOvernightEnd(startIso, endIso)
      endIso = resolved.endIso
      if (resolved.warning) result.warnings.push(`${tabLabel}, row ${i + 1}: ${resolved.warning}`)
    }

    const notes = colMap.notes !== undefined ? (row[colMap.notes]?.trim() ?? '') : ''

    if (!endIso && startIso && colMap.duration !== undefined) {
      const mins = parseDurationToMinutes(row[colMap.duration] ?? '')
      if (mins) endIso = format(new Date(new Date(startIso).getTime() + mins * 60_000), "yyyy-MM-dd'T'HH:mm:ss")
    }

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
    } else if (activity === 'play' || activity.startsWith('play')) {
      result.play.push({
        startTime: startIso ?? `${dateStr}T00:00:00`,
        endTime: endIso,
        notes,
      })
    } else {
      // Unrecognized custom activity — acknowledged but not imported
      result.skipped++
    }
  }

  return result
}

/** Fetch a single tab by name and parse it into typed entries. */
export async function importFromSpreadsheet(
  token: string,
  spreadsheetId: string,
  tabName: string,
  fallbackDateStr?: string,
): Promise<ImportedData> {
  const rows = await fetchTabRawValues(token, spreadsheetId, tabName)
  return parseActivityRows(rows, fallbackDateStr, `The "${tabName}" tab`)
}

/** Fetch and merge multiple tabs from the same spreadsheet. */
export async function importFromTabs(
  token: string,
  spreadsheetId: string,
  tabNames: string[],
  fallbackDateStr?: string,
): Promise<ImportedData> {
  const merged: ImportedData = { feeds: [], sleep: [], diaper: [], play: [], skipped: 0, total: 0, warnings: [] }
  for (const tab of tabNames) {
    const part = await importFromSpreadsheet(token, spreadsheetId, tab, fallbackDateStr)
    merged.feeds.push(...part.feeds)
    merged.sleep.push(...part.sleep)
    merged.diaper.push(...part.diaper)
    merged.play.push(...part.play)
    merged.skipped += part.skipped
    merged.total += part.total
    merged.warnings.push(...part.warnings)
  }
  return merged
}

/** Extract a spreadsheet ID from a Google Sheets URL, or return the value as-is. */
export function extractSpreadsheetId(urlOrId: string): string {
  const m = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : urlOrId.trim()
}
