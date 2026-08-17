import { useAppStore } from '../store/useAppStore'

/**
 * Full-state backup/restore — lets a user clone everything (settings, every
 * tracked record, milestones, photos/videos as embedded base64, Google Sync
 * config, etc.) from one device/browser onto another. This is a snapshot
 * mechanism, not live sync: exporting captures "everything right now,"
 * importing fully replaces "everything on this device right now." There's no
 * per-record merge — see restoreFromBackup for exactly what that means.
 */

const STORAGE_KEY = 'parents-little-helper'
export const BACKUP_FORMAT_VERSION = 1
const APP_ID = 'parents-little-helper' as const

export interface BackupFile {
  app: typeof APP_ID
  formatVersion: number
  exportedAt: string
  // Free-form on purpose — this mirrors the app's persisted Zustand state
  // shape, which already changes as features are added. Validating exact
  // field shapes here would just create a second place to keep in sync with
  // the store; instead we validate the envelope (app id + presence of data)
  // and let the store's own setState merge handle whatever fields are or
  // aren't present in an older/newer backup.
  data: Record<string, unknown>
}

// Fields that describe *this device's current moment*, not durable user
// data — carrying them over from another device (or another point in time)
// would be meaningless or actively misleading, so imports always reset them
// rather than trusting whatever the backup happened to contain.
const SESSION_LOCAL_KEYS = ['activeFeedId', 'eventsFetchError'] as const

/** Read the app's own persisted localStorage blob and wrap it as a portable backup file. */
export function buildBackup(): BackupFile {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error('No local data found on this device to back up yet.')
  const parsed = JSON.parse(raw)
  // zustand's persist middleware wraps the actual state as { state, version }
  // — unwrap it so the backup contains just the app's own fields.
  const data = (parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed) as Record<
    string,
    unknown
  >
  return { app: APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), data }
}

export function backupFilename(babyName?: string): string {
  const datePart = new Date().toISOString().slice(0, 10)
  const namePart = babyName?.trim() ? `-${babyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''
  return `parents-little-helper-backup${namePart}-${datePart}.json`
}

/** Parse + sanity-check a candidate backup (from a file, pasted text, or Drive). Throws with a user-facing message on anything unrecognized. */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That doesn't look like valid backup text — couldn't be parsed as JSON.")
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error("That doesn't look like a Parents' Little Helper backup.")
  }
  const obj = parsed as Record<string, unknown>
  if (obj.app !== APP_ID || typeof obj.data !== 'object' || obj.data === null) {
    throw new Error("That doesn't look like a Parents' Little Helper backup — missing expected fields.")
  }
  return obj as unknown as BackupFile
}

/** A short, human-readable summary of what a backup contains, for a confirmation prompt before an (irreversible, on this device) restore. */
export function summarizeBackup(backup: BackupFile): string[] {
  const d = backup.data
  const arr = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]).length : 0)
  const baby = d.baby as { name?: string } | undefined
  const lines: string[] = []
  lines.push(baby?.name ? `Baby profile: ${baby.name}` : 'Baby profile: (unnamed)')
  lines.push(
    `${arr('feeds')} feeds · ${arr('sleep')} sleep sessions · ${arr('diaper')} nappy changes · ${arr('play')} play sessions`
  )
  lines.push(`${arr('recordedMilestones')} milestones · ${arr('celebrations')} celebration photos · ${arr('growth')} growth entries`)
  lines.push(`Exported ${new Date(backup.exportedAt).toLocaleString()}`)
  return lines
}

// Stable-key JSON stringify — so two logically-identical snapshots always
// compare equal regardless of property insertion order (defends against
// false-positive conflicts caused only by key ordering).
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// Device-local bookkeeping — like SESSION_LOCAL_KEYS above, these describe
// *this device's own* Google-sync setup and history (which client ID it
// uses, which Drive folder/sheet it's pointed at, when it last synced),
// never durable user data. Left in, they'd make backupsDiffer report a
// "conflict" on nearly every restore attempt for a spurious reason: backing
// up to Drive stamps googleLastFullBackup *after* building the snapshot
// that gets uploaded, so a device's own just-uploaded backup always looks
// slightly "behind" its own live state a moment later.
const CONFLICT_IGNORED_KEYS = [
  ...SESSION_LOCAL_KEYS,
  'googleClientId',
  'googleFolderId',
  'googleMediaFolderId',
  'googleSheetId',
  'googleLastSync',
  'googleLastFullBackup',
  'googleWriteSheetName',
  'googleParentFolderId',
] as const

function withoutIgnoredKeys(data: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...data }
  for (const key of CONFLICT_IGNORED_KEYS) delete copy[key]
  return copy
}

/**
 * Do two backups actually disagree, in a way that matters? Compares durable
 * `data` only — never `exportedAt` (differs by definition) nor the
 * device-local bookkeeping in CONFLICT_IGNORED_KEYS. This is the conflict
 * test: it doesn't try to guess which side is "right," only whether
 * restoring one over the other is a real, consequential decision rather
 * than a no-op.
 */
export function backupsDiffer(a: BackupFile, b: BackupFile): boolean {
  return stableStringify(withoutIgnoredKeys(a.data)) !== stableStringify(withoutIgnoredKeys(b.data))
}

/**
 * Fully replace this device's data with the backup's. This is a snapshot
 * restore, not a merge — anything logged on this device since the backup
 * was taken, and not also present in the backup, is gone after this call.
 * Callers should run backupsDiffer() first and route through a conflict
 * resolution step if the two disagree — see GoogleSection in Settings.tsx.
 */
export function restoreFromBackup(backup: BackupFile): void {
  const data = { ...backup.data }
  for (const key of SESSION_LOCAL_KEYS) delete data[key]
  useAppStore.setState({ ...data, activeFeedId: null, eventsFetchError: null } as never)
}
