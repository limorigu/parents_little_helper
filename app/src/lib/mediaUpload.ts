// ---------------------------------------------------------------------------
// Fire-and-forget Drive upload triggered the moment a new photo/video is
// captured (milestone or celebration), so it doesn't have to wait for the
// next full "Sync now". Entirely best-effort: if Google isn't connected yet,
// or the upload fails, this silently does nothing — the entry stays local
// (mediaUrl already saved), and the next full sync will pick it up since it
// still won't have a `driveFileId`.
// ---------------------------------------------------------------------------

import { getToken, isSignedIn } from './googleApi'
import { uploadMediaIfNeeded, mediaFilename } from './googleSync'
import { useAppStore } from '../store/useAppStore'

/**
 * Upload a just-captured milestone/celebration photo or video to the user's
 * Drive "Media" folder, if Google Sync is connected. `existingDriveFileId`
 * lets callers skip the check entirely when they already know this exact
 * media was uploaded before (e.g. re-saving a caption without changing the
 * photo) — no duplicate-check needed for callers.
 */
export function autoUploadMedia(
  kind: 'milestone' | 'celebration',
  id: string,
  mediaUrl: string,
  existingDriveFileId?: string | null,
): void {
  if (existingDriveFileId) return

  const { googleMediaFolderId, updateRecordedMilestone, updateCelebration } = useAppStore.getState()
  if (!googleMediaFolderId || !isSignedIn()) return
  const token = getToken()
  if (!token) return

  const filename = mediaFilename(kind, id, mediaUrl)
  uploadMediaIfNeeded(token, googleMediaFolderId, filename, mediaUrl)
    .then(({ id: driveFileId, webViewLink }) => {
      const updates = { driveFileId, driveWebViewLink: webViewLink }
      if (kind === 'milestone') updateRecordedMilestone(id, updates)
      else updateCelebration(id, updates)
    })
    .catch(() => {
      // Best-effort only — the photo is already safe in localStorage, and
      // the next manual/auto full sync will retry the upload.
    })
}
