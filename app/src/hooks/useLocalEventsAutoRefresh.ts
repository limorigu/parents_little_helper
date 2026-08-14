import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { fetchAllLocalEvents, isWeeklyRefreshDue, LocalEventsFetchError } from '../lib/localEvents'

/**
 * Best-effort background refresh for the opt-in Local Events feature. Fires
 * once on mount if the user has opted in (`baby.locationEnabled`) and a
 * refresh is due — either there's never been a fetch yet (so opting in
 * doesn't leave the page empty until next Wednesday) or a Wednesday has
 * passed since the last one, per `isWeeklyRefreshDue`. Pulls from every
 * configured source (Ticketmaster, Google News, a user-supplied local feed)
 * and merges them. Silent on failure: the Local Events page itself surfaces
 * `eventsFetchError` with a manual "Refresh" action, so this effect doesn't
 * need to.
 */
export function useLocalEventsAutoRefresh() {
  const locationEnabled = useAppStore((s) => s.baby.locationEnabled)
  const postcode = useAppStore((s) => s.baby.location)
  const ticketmasterApiKey = useAppStore((s) => s.ticketmasterApiKey)
  const radiusMiles = useAppStore((s) => s.eventsRadiusMiles)
  const newsSearchEnabled = useAppStore((s) => s.newsSearchEnabled)
  const localFeedUrl = useAppStore((s) => s.localFeedUrl)
  const rss2jsonApiKey = useAppStore((s) => s.rss2jsonApiKey)
  const lastEventsFetch = useAppStore((s) => s.lastEventsFetch)
  const setLocalEvents = useAppStore((s) => s.setLocalEvents)
  const setEventsFetchError = useAppStore((s) => s.setEventsFetchError)

  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    if (!locationEnabled || !postcode.trim()) return
    if (!isWeeklyRefreshDue(lastEventsFetch)) return
    ran.current = true

    fetchAllLocalEvents({ postcode, ticketmasterApiKey, radiusMiles, newsSearchEnabled, localFeedUrl, rss2jsonApiKey })
      .then(({ events, errors }) => {
        setLocalEvents(events, new Date().toISOString())
        if (errors.length) setEventsFetchError(errors.join(' '))
      })
      .catch((err) => {
        setEventsFetchError(err instanceof LocalEventsFetchError ? err.message : 'Could not refresh local events.')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationEnabled, postcode, ticketmasterApiKey, radiusMiles, newsSearchEnabled, localFeedUrl, rss2jsonApiKey, lastEventsFetch])
}
