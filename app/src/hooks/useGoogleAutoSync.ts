import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getToken } from '../lib/googleApi'
import { appendEntryRow, feedFields, sleepFields, diaperFields } from '../lib/googleSync'
import type { EntryFields } from '../lib/googleSync'

/**
 * Watches feeds/sleep/diaper for newly-added entries (added, not imported —
 * see the "seed without pushing" logic below) and appends each one as a row
 * to the configured Google Sheet tab, if Google is connected. This is a
 * best-effort mirror on top of localStorage, which stays authoritative:
 * failures here are swallowed silently and don't block the UI. The manual
 * "Sync now" button in Settings still does a full rewrite of the Activity
 * Log tab, so any row that fails to append here gets picked up there too.
 */
export function useGoogleAutoSync() {
  const feeds = useAppStore((s) => s.feeds)
  const sleep = useAppStore((s) => s.sleep)
  const diaper = useAppStore((s) => s.diaper)
  const googleSheetId = useAppStore((s) => s.googleSheetId)
  const googleWriteSheetName = useAppStore((s) => s.googleWriteSheetName)

  const seenFeed = useRef<Set<string> | null>(null)
  const seenSleep = useRef<Set<string> | null>(null)
  const seenDiaper = useRef<Set<string> | null>(null)

  function push(fieldsList: EntryFields[]) {
    if (!fieldsList.length || !googleSheetId) return
    const token = getToken()
    if (!token) return
    const tabName = googleWriteSheetName || 'Activity Log'
    fieldsList.forEach((f) => {
      appendEntryRow(token, googleSheetId, tabName, f).catch(() => {
        // Best-effort only — the entry is already safe in localStorage, and
        // the next manual/auto full sync will reconcile the Activity Log tab.
      })
    })
  }

  useEffect(() => {
    if (seenFeed.current === null) {
      seenFeed.current = new Set(feeds.map((f) => f.id))
      return
    }
    const fresh = []
    for (const f of feeds) {
      if (seenFeed.current.has(f.id)) break
      fresh.push(f)
    }
    if (fresh.length) {
      fresh.forEach((f) => seenFeed.current!.add(f.id))
      push(fresh.map(feedFields))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds])

  useEffect(() => {
    if (seenSleep.current === null) {
      seenSleep.current = new Set(sleep.map((s) => s.id))
      return
    }
    const fresh = []
    for (const s of sleep) {
      if (seenSleep.current.has(s.id)) break
      fresh.push(s)
    }
    if (fresh.length) {
      fresh.forEach((s) => seenSleep.current!.add(s.id))
      push(fresh.map(sleepFields))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleep])

  useEffect(() => {
    if (seenDiaper.current === null) {
      seenDiaper.current = new Set(diaper.map((d) => d.id))
      return
    }
    const fresh = []
    for (const d of diaper) {
      if (seenDiaper.current.has(d.id)) break
      fresh.push(d)
    }
    if (fresh.length) {
      fresh.forEach((d) => seenDiaper.current!.add(d.id))
      push(fresh.map(diaperFields))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaper])
}
