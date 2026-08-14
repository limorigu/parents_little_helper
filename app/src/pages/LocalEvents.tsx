import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { fetchAllLocalEvents, LocalEventsFetchError } from '../lib/localEvents'
import { getBabyAgeLabel } from '../lib/utils'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'
import type { LocalEvent } from '../store/useAppStore'

function formatEventDate(startDate: string): string {
  if (!startDate) return ''
  try {
    const d = parseISO(startDate)
    if (Number.isNaN(d.getTime())) return startDate
    return startDate.includes('T') ? format(d, 'EEE d MMM · h:mm a') : format(d, 'EEE d MMM')
  } catch {
    return startDate
  }
}

function formatPublished(pubDate: string): string {
  try {
    const d = new Date(pubDate)
    if (Number.isNaN(d.getTime())) return ''
    return format(d, 'd MMM')
  } catch {
    return ''
  }
}

const SOURCE_BADGE: Record<LocalEvent['source'], string> = {
  ticketmaster: 'bg-periwinkle-100 text-periwinkle-700',
  news: 'bg-marigold-100 text-marigold-600',
  blog: 'bg-blush-100 text-blush-600',
}

export function LocalEvents() {
  const navigate = useNavigate()
  const {
    baby,
    ticketmasterApiKey,
    eventsRadiusMiles,
    newsSearchEnabled,
    localFeedUrl,
    rss2jsonApiKey,
    localEvents,
    lastEventsFetch,
    eventsFetchError,
    setLocalEvents,
    setEventsFetchError,
  } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [familyOnly, setFamilyOnly] = useState(true)

  async function refresh() {
    setLoading(true)
    setEventsFetchError(null)
    try {
      const { events, errors } = await fetchAllLocalEvents({
        postcode: baby.location, ticketmasterApiKey, radiusMiles: eventsRadiusMiles,
        newsSearchEnabled, localFeedUrl, rss2jsonApiKey,
      })
      setLocalEvents(events, new Date().toISOString())
      if (errors.length) setEventsFetchError(errors.join(' '))
    } catch (err) {
      setEventsFetchError(err instanceof LocalEventsFetchError ? err.message : 'Could not refresh local events.')
    } finally {
      setLoading(false)
    }
  }

  if (!baby.locationEnabled) {
    return (
      <PageShell title="Local Events" subtitle="Real events near you, opt-in only">
        <EmptyState
          icon="📍"
          title="Local events are turned off"
          description="Opt in with your postcode in Settings to see real, nearby events — nothing is shown or fetched until you turn this on."
          action={<Button onClick={() => navigate('/settings')}>Go to Settings</Button>}
        />
      </PageShell>
    )
  }

  if (!baby.location.trim()) {
    return (
      <PageShell title="Local Events" subtitle="Real events near you, opt-in only">
        <EmptyState
          icon="🔑"
          title="Add your postcode in Settings"
          description="Local Events pulls from Ticketmaster, Google News, and any local blog/feed you point at — all it needs from you is a postcode."
          action={<Button onClick={() => navigate('/settings')}>Go to Settings</Button>}
        />
      </PageShell>
    )
  }

  const visible = familyOnly ? localEvents.filter((e) => e.familyFriendly) : localEvents

  return (
    <PageShell
      title="Local Events"
      subtitle={baby.birthDate ? `Near ${baby.location} · for ${getBabyAgeLabel(baby.birthDate)}` : `Near ${baby.location}`}
      action={
        <Button size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-stone-400">
          Real items pulled from Ticketmaster, Google News, and any local feed you've added in Settings — never
          invented. Refreshes automatically about once a week.
          {lastEventsFetch && ` Last updated ${format(parseISO(lastEventsFetch), "d MMM 'at' h:mm a")}.`}
        </p>

        {eventsFetchError && (
          <Card className="bg-blush-50 border-blush-200 flex items-start gap-3">
            <AlertCircle size={18} className="text-blush-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blush-700">Some sources couldn't load</p>
              <p className="text-xs text-blush-600 mt-0.5">{eventsFetchError}</p>
            </div>
          </Card>
        )}

        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={familyOnly}
            onChange={(e) => setFamilyOnly(e.target.checked)}
            className="accent-sage-500"
          />
          Family-friendly only (tagged Family by Ticketmaster, or matching family/kids keywords)
        </label>

        {visible.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title={localEvents.length === 0 ? 'Nothing fetched yet' : 'No family-friendly matches found'}
            description={
              localEvents.length === 0
                ? 'Tap Refresh to pull real events, news, and local picks near your postcode.'
                : 'Try turning off the family-friendly filter to see everything from your sources.'
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((e) => (
              <Card key={e.id} className="flex gap-3">
                {e.imageUrl && (
                  <img src={e.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border-2 border-stone-800" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-stone-700 text-sm">{e.name}</p>
                    {e.familyFriendly && <Badge className="bg-sage-100 text-sage-700">family-friendly</Badge>}
                    <Badge className={SOURCE_BADGE[e.source]}>{e.sourceLabel}</Badge>
                  </div>

                  {e.source === 'ticketmaster' ? (
                    <>
                      <p className="text-xs text-stone-400 mt-1">{formatEventDate(e.startDate) || 'Date TBA'}</p>
                      {e.venueName && (
                        <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} /> {e.venueName}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {e.description && <p className="text-xs text-stone-500 mt-1">{e.description}</p>}
                      {e.publishedAt && formatPublished(e.publishedAt) && (
                        <p className="text-xs text-stone-400 mt-0.5">Published {formatPublished(e.publishedAt)}</p>
                      )}
                    </>
                  )}

                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-periwinkle-500 hover:underline inline-flex items-center gap-1 mt-1.5"
                  >
                    {e.source === 'ticketmaster' ? 'View on Ticketmaster' : 'Read more'} <ExternalLink size={11} />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
