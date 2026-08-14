import type { LocalEvent } from '../store/useAppStore'

// ── Weekly refresh cadence, anchored to Wednesdays ──────────────────────────
//
// The events list is refreshed at most once a week, and that refresh is
// anchored to Wednesdays: as soon as a Wednesday has passed since the last
// fetch, the next time the app is opened it fetches again. This means the
// data doesn't have to be stale from Wednesday morning until whenever the
// user next happens to open the app on that exact day — it just always
// reflects "as of the most recent Wednesday" rather than being calendar-day
// gated. The very first fetch (no `lastFetchIso` yet) always happens right
// away, so opting in doesn't leave the page empty until the next Wednesday.

/** Midnight of the most recent Wednesday on/before `from` (defaults to now). */
export function mostRecentWednesday(from: Date = new Date()): Date {
  const d = new Date(from)
  const day = d.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, ...
  const diff = (day - 3 + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isWeeklyRefreshDue(lastFetchIso: string | null): boolean {
  if (!lastFetchIso) return true
  const last = new Date(lastFetchIso)
  if (Number.isNaN(last.getTime())) return true
  return last < mostRecentWednesday()
}

export class LocalEventsFetchError extends Error {}

// Shared family/kids keyword heuristic — the ONLY judgment call this module
// makes about any item. It's applied to a source's own real title/description
// text, never used to invent a detail that isn't already in the source data.
const FAMILY_KEYWORDS = [
  'baby', 'babies', 'toddler', 'infant', 'kids', 'kid ', 'child', 'children',
  'family', 'nursery', 'story time', 'storytime', 'sensory', 'parent and',
  'parent & ', 'playgroup', 'preschool', 'stay and play', 'messy play',
]

function looksFamilyFriendly(...texts: string[]): boolean {
  const haystack = texts.join(' ').toLowerCase()
  return FAMILY_KEYWORDS.some((kw) => haystack.includes(kw))
}

// Strip HTML tags and collapse whitespace from an RSS <description>, and cap
// its length — feeds legitimately return full HTML markup in that field, but
// we only ever show a short plain-text snippet, never the full article body.
function cleanSnippet(html: string, maxLen = 160): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text
}

// ── Source 1: Ticketmaster Discovery API ────────────────────────────────────
//
// Real, structured event data (name, venue, date, url) copied verbatim from
// Ticketmaster's own response. `familyFriendly` uses the API's own
// classification metadata plus a keyword check on the real event name.

interface TicketmasterEvent {
  id: string
  name: string
  url: string
  dates?: { start?: { localDate?: string; localTime?: string; dateTime?: string } }
  images?: Array<{ url: string; width: number }>
  _embedded?: { venues?: Array<{ name?: string }> }
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>
}

async function fetchTicketmasterEvents(
  postcode: string,
  apiKey: string,
  radiusMiles: number
): Promise<LocalEvent[]> {
  const params = new URLSearchParams({
    apikey: apiKey.trim(),
    postalCode: postcode.trim(),
    radius: String(radiusMiles),
    unit: 'miles',
    sort: 'date,asc',
    size: '50',
  })

  let res: Response
  try {
    res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`)
  } catch {
    throw new LocalEventsFetchError('Could not reach Ticketmaster — check your connection and try again.')
  }

  if (res.status === 401 || res.status === 403) {
    throw new LocalEventsFetchError('Ticketmaster rejected the API key — double check it in Settings.')
  }
  if (!res.ok) {
    throw new LocalEventsFetchError(`Ticketmaster returned an error (${res.status}). Try again later.`)
  }

  const data = await res.json()
  const raw: TicketmasterEvent[] = data?._embedded?.events ?? []

  return raw.map((e) => {
    const segment = e.classifications?.[0]?.segment?.name ?? ''
    const genre = e.classifications?.[0]?.genre?.name ?? ''
    const start = e.dates?.start
    const startDate = start?.dateTime ?? (start?.localDate ? `${start.localDate}${start.localTime ? 'T' + start.localTime : ''}` : '')
    const image = e.images?.slice().sort((a, b) => b.width - a.width)[0]
    return {
      id: e.id,
      name: e.name,
      url: e.url,
      startDate,
      venueName: e._embedded?.venues?.[0]?.name ?? '',
      imageUrl: image?.url ?? null,
      familyFriendly: segment.toLowerCase() === 'family' || looksFamilyFriendly(e.name, genre),
      segment: segment || genre,
      source: 'ticketmaster',
      sourceLabel: 'Ticketmaster',
    }
  })
}

// ── Sources 2 & 3: RSS feeds via rss2json ────────────────────────────────────
//
// Neither Google News (news.google.com) nor an arbitrary blog/site feed sets
// CORS headers that allow a browser to fetch them directly, and this app has
// no backend of its own to proxy the request through. rss2json.com is a free,
// keyless (or bring-your-own-key for higher limits), CORS-enabled service that
// fetches the feed server-side and hands back plain JSON — the same
// "no backend needed" shape as everything else this app talks to. Every field
// below is copied straight from the feed's own item, verbatim.

interface Rss2JsonItem {
  guid?: string
  link: string
  title: string
  pubDate?: string
  description?: string
  thumbnail?: string
  enclosure?: { link?: string }
}
interface Rss2JsonResponse {
  status: string
  feed?: { title?: string }
  items?: Rss2JsonItem[]
  message?: string
}

const RSS2JSON_MAX_ATTEMPTS = 3

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// rss2json's free, keyless tier is shared across every app using it without an
// API key, and it intermittently returns HTTP 5xx (with a misleading
// "make sure the Rss URL is correct" body) under load — even for a feed URL
// that succeeds moments later. That's a transient capacity issue, not a sign
// the URL is malformed, so it's worth a couple of quick retries rather than
// failing the whole refresh on one bad attempt. A genuine 4xx (bad request)
// is not retried since retrying won't help.
async function fetchViaRss2Json(feedUrl: string, rss2jsonApiKey: string): Promise<Rss2JsonResponse> {
  const params = new URLSearchParams({ rss_url: feedUrl })
  if (rss2jsonApiKey.trim()) params.set('api_key', rss2jsonApiKey.trim())
  const url = `https://api.rss2json.com/v1/api.json?${params.toString()}`

  let lastError: LocalEventsFetchError = new LocalEventsFetchError('Could not read that feed.')

  for (let attempt = 1; attempt <= RSS2JSON_MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(url)
    } catch {
      lastError = new LocalEventsFetchError('Could not reach the feed service — check your connection and try again.')
      await delay(500 * attempt)
      continue
    }

    if (res.status >= 500) {
      lastError = new LocalEventsFetchError(
        rss2jsonApiKey.trim()
          ? 'The feed service (rss2json) is temporarily overloaded. Try Refresh again shortly.'
          : 'The feed service (rss2json) is temporarily overloaded — a known limitation of its free tier ' +
              'without an API key. Add a free rss2json API key in Settings for a steadier quota, or try Refresh again shortly.'
      )
      if (attempt < RSS2JSON_MAX_ATTEMPTS) await delay(500 * attempt)
      continue
    }

    if (!res.ok) {
      // Genuine 4xx — not transient, so don't retry. rss2json's own message for
      // this case (e.g. "probably not a valid RSS feed") is usually accurate
      // and more useful than a generic one, so surface it directly if present.
      let detail = ''
      try {
        const body = (await res.json()) as { message?: string }
        detail = body?.message ?? ''
      } catch {
        // Body wasn't JSON — fall back to the generic message below.
      }
      throw new LocalEventsFetchError(
        detail
          ? `Feed service rejected the request: ${detail}`
          : `Feed service rejected the request (${res.status}). Check the feed URL in Settings.`
      )
    }

    const data: Rss2JsonResponse = await res.json()
    if (data.status !== 'ok') {
      throw new LocalEventsFetchError(data.message || 'Could not read that feed.')
    }
    return data
  }

  throw lastError
}

function itemsToLocalEvents(
  items: Rss2JsonItem[],
  source: 'news' | 'blog',
  sourceLabel: string
): LocalEvent[] {
  return items.map((it) => {
    const description = it.description ? cleanSnippet(it.description) : ''
    return {
      id: it.guid || it.link,
      name: it.title,
      url: it.link,
      startDate: '',
      venueName: '',
      imageUrl: it.thumbnail || it.enclosure?.link || null,
      familyFriendly: looksFamilyFriendly(it.title, description),
      segment: sourceLabel,
      source,
      sourceLabel,
      description,
      publishedAt: it.pubDate,
    }
  })
}

/**
 * Google News search, scoped to family/kids/local-events keywords near
 * `postcode`. Uses Google News's own (unofficial but long-stable) RSS search
 * endpoint — results are real news/listing articles Google has indexed,
 * never generated. Results are news coverage of things happening locally,
 * not a structured events database, so items show a publish date rather than
 * an event date.
 */
async function fetchGoogleNewsEvents(postcode: string, rss2jsonApiKey: string): Promise<LocalEvent[]> {
  const query = encodeURIComponent(`${postcode} (kids OR toddler OR family OR "things to do") events`)
  const newsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`
  const data = await fetchViaRss2Json(newsUrl, rss2jsonApiKey)
  return itemsToLocalEvents(data.items ?? [], 'news', 'Google News')
}

/**
 * Any RSS/Atom feed the user points at themselves — a neighborhood blog, a
 * "things to do" newsletter, a local guide's site, whatever they already
 * follow (e.g. a "Secret [City]"-style site, if it has one). We don't ship a
 * hardcoded source: the user supplies the feed URL, and the feed's own
 * `feed.title` (from rss2json) is used as the attribution label so it's
 * always accurate to whatever they configured.
 */
async function fetchLocalFeedEvents(feedUrl: string, rss2jsonApiKey: string): Promise<LocalEvent[]> {
  const data = await fetchViaRss2Json(feedUrl, rss2jsonApiKey)
  return itemsToLocalEvents(data.items ?? [], 'blog', data.feed?.title || 'Local feed')
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface LocalEventsConfig {
  postcode: string
  ticketmasterApiKey: string
  radiusMiles: number
  newsSearchEnabled: boolean
  localFeedUrl: string
  rss2jsonApiKey: string
}

export interface LocalEventsResult {
  events: LocalEvent[]
  /** Human-readable, one per source that failed — empty if everything that ran succeeded. */
  errors: string[]
}

/**
 * Runs every configured source in parallel and merges the results. Each
 * source fails independently — one bad API key or an unreachable feed
 * doesn't block the others — and every failure is reported back as a plain
 * message rather than silently swallowed or backfilled with invented data.
 */
export async function fetchAllLocalEvents(cfg: LocalEventsConfig): Promise<LocalEventsResult> {
  if (!cfg.postcode.trim()) throw new LocalEventsFetchError('Add your postcode in Settings first.')

  const jobs: Array<{ label: string; run: () => Promise<LocalEvent[]> }> = []
  if (cfg.ticketmasterApiKey.trim()) {
    jobs.push({ label: 'Ticketmaster', run: () => fetchTicketmasterEvents(cfg.postcode, cfg.ticketmasterApiKey, cfg.radiusMiles) })
  }
  if (cfg.newsSearchEnabled) {
    jobs.push({ label: 'Google News', run: () => fetchGoogleNewsEvents(cfg.postcode, cfg.rss2jsonApiKey) })
  }
  if (cfg.localFeedUrl.trim()) {
    jobs.push({ label: 'Local feed', run: () => fetchLocalFeedEvents(cfg.localFeedUrl, cfg.rss2jsonApiKey) })
  }

  if (jobs.length === 0) {
    return {
      events: [],
      errors: ['No event sources are configured — add a Ticketmaster API key, enable Google News search, or add a local feed URL in Settings.'],
    }
  }

  const settled = await Promise.allSettled(jobs.map((j) => j.run()))
  const events: LocalEvent[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      for (const e of r.value) {
        if (seen.has(e.id)) continue
        seen.add(e.id)
        events.push(e)
      }
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : 'Unknown error.'
      errors.push(`${jobs[i].label}: ${msg}`)
    }
  })

  return { events, errors }
}
