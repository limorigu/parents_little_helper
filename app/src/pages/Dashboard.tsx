import { Link } from 'react-router-dom'
import { Star, TrendingUp, ListChecks, ChevronRight, Camera } from 'lucide-react'
import { format, parseISO, addDays, addMonths } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { getBabyAgeLabel, getBabyAgeWeeks, today, formatDate, localDayKey } from '../lib/utils'
import { getMilestonesForWeek } from '../lib/milestones'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageShell } from '../components/layout/PageShell'
import { QuickLog } from '../components/dashboard/QuickLog'

// `id` matches the auto-generated CalendarEvent id (see Calendar.tsx's
// getAutoEvents) so a celebration photo added from either the Dashboard
// banner or the Calendar's "Celebrate" flow shows up in both places.
function getTodaySpecialEvent(birthDate: string): { id: string; title: string } | null {
  if (!birthDate) return null
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const birth = parseISO(birthDate)
  if (todayStr === birthDate) return { id: 'birth', title: 'Birth day' }
  if (format(addDays(birth, 100), 'yyyy-MM-dd') === todayStr) return { id: 'day100', title: '100 days old! 🎉' }
  for (let m = 1; m <= 12; m++) {
    if (format(addMonths(birth, m), 'yyyy-MM-dd') === todayStr)
      return { id: `month-${m}`, title: `${m} month${m > 1 ? 's' : ''} old!` }
  }
  return null
}

function greet(name: string) {
  const hour = new Date().getHours()
  const prefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${prefix}, ${name}` : prefix
}

function getTip(weeks: number): string {
  if (weeks < 2) return "You're doing an incredible job. Rest as much as you can — healing takes time."
  if (weeks < 6) return "Skin-to-skin time with your baby has measurable benefits for both of you. Even 10 minutes counts."
  if (weeks < 12) return "Narrating your day out loud is one of the best things you can do for language development."
  if (weeks < 20) return "Floor time and tummy time every day help build the core strength that leads to sitting and crawling."
  return "Your baby is developing so fast right now. Taking even short videos captures things photos can't."
}

export function Dashboard() {
  const { baby, recordedMilestones, feeds, sleep, plans, celebrations } = useAppStore()
  const weeks = getBabyAgeWeeks(baby.birthDate)
  const currentMilestones = getMilestonesForWeek(weeks)
  const todayDate = today()
  const todayPlan = plans.find((p) => p.date === todayDate)
  const recentMilestone = recordedMilestones[0]

  const todayFeeds = feeds.filter((f) => localDayKey(f.date) === todayDate)
  const lastSleep = sleep.find((s) => s.endTime)
  const specialToday = getTodaySpecialEvent(baby.birthDate)
  const specialTodayPhoto = specialToday ? celebrations.find((c) => c.eventId === specialToday.id) : undefined

  return (
    <PageShell
      title={greet(baby.parentName)}
      subtitle={baby.name ? `${baby.name} is ${getBabyAgeLabel(baby.birthDate)}` : undefined}
    >
      <div className="space-y-5">
        {/* Logo. The wordmark is baked into the PNG in charcoal, which disappears
            against the Night Owl page background — so it always sits on `bg-cream`,
            one of the two brand tokens deliberately left out of the `.dark` block
            and therefore light in both themes. */}
        <div className="flex items-center justify-center py-2">
          <span className="bg-cream rounded-2xl px-4 py-2 inline-flex">
            <img src="/logo-horizontal.png" alt="Parents' Little Helper" className="h-14 w-auto" />
          </span>
        </div>

        {/* Special day banner */}
        {specialToday && (
          <Link to="/calendar">
            <Card className="bg-gradient-to-br from-blush-50 to-cream-100 border-blush-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <span className="text-3xl inline-block animate-wiggle">🎂</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base text-stone-800">
                    {baby.name ? `${baby.name} is ` : ''}{specialToday.title}
                  </p>
                  {!specialTodayPhoto && (
                    <p className="text-xs text-blush-500 mt-0.5 flex items-center gap-1">
                      <Camera size={11} /> Tap to add a celebration photo
                    </p>
                  )}
                </div>
              </div>
              {specialTodayPhoto && (
                <div className="mt-3 rounded-xl overflow-hidden">
                  {specialTodayPhoto.mediaType === 'video' ? (
                    <video src={specialTodayPhoto.mediaUrl} controls className="w-full max-h-56 object-cover rounded-xl" />
                  ) : (
                    <img src={specialTodayPhoto.mediaUrl} alt="celebration" className="w-full max-h-56 object-cover rounded-xl" />
                  )}
                </div>
              )}
            </Card>
          </Link>
        )}

        {/* Quick log — track it in a tap */}
        <QuickLog />

        {/* Tip of the day */}
        <Card className="bg-gradient-to-br from-cream-200 to-cream-100 border-cream-300">
          <p className="text-sm text-stone-600 leading-relaxed">
            <span className="font-medium text-stone-700">Today's gentle reminder: </span>
            {getTip(weeks)}
          </p>
        </Card>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-display text-stone-800">{weeks}</p>
            <p className="text-xs text-stone-400 mt-0.5">weeks old</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-display text-stone-800">{todayFeeds.length}</p>
            <p className="text-xs text-stone-400 mt-0.5">feeds today</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-display text-stone-800">{recordedMilestones.length}</p>
            <p className="text-xs text-stone-400 mt-0.5">moments logged</p>
          </Card>
        </div>

        {/* Current milestones preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-stone-700">This week's milestones</h2>
            <Link to="/milestones" className="text-sm text-stone-400 hover:text-stone-600 flex items-center gap-1">
              See all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {currentMilestones.slice(0, 3).map((m) => (
              <Card key={m.id} padding="sm" className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.isOverachiever ? 'bg-marigold-400' : 'bg-sage-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700">{m.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{m.description}</p>
                </div>
                {m.isOverachiever && (
                  <Badge className="bg-marigold-100 text-marigold-600 shrink-0">overachiever</Badge>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Today's plan preview */}
        <Card hover onClick={() => window.location.href = '/plan'}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-periwinkle-400" />
              <h2 className="font-display text-base text-stone-700">Today's plan</h2>
            </div>
            <ChevronRight size={16} className="text-stone-400" />
          </div>
          {todayPlan ? (
            <div className="space-y-1.5">
              {todayPlan.tiles.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-sage-400' : 'bg-stone-200'}`} />
                  <p className={`text-sm ${t.completed ? 'line-through text-stone-400' : 'text-stone-600'}`}>{t.title}</p>
                </div>
              ))}
              {todayPlan.tiles.length > 3 && (
                <p className="text-xs text-stone-400">+{todayPlan.tiles.length - 3} more activities</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-400">No plan yet — tap to generate one.</p>
          )}
        </Card>

        {/* Quick actions */}
        <div>
          <h2 className="font-display text-lg text-stone-700 mb-3">More shortcuts</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/milestones/record">
              <Card hover padding="sm" className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-periwinkle-100 flex items-center justify-center text-periwinkle-500">
                  <Camera size={17} />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-700">Record moment</p>
                  <p className="text-xs text-stone-400">photo or video</p>
                </div>
              </Card>
            </Link>
            <Link to="/growth">
              <Card hover padding="sm" className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center text-sage-600">
                  <TrendingUp size={17} />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-700">Log growth</p>
                  <p className="text-xs text-stone-400">weight & height</p>
                </div>
              </Card>
            </Link>
            <Link to="/doctor">
              <Card hover padding="sm" className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-marigold-100 flex items-center justify-center text-marigold-600">
                  <Star size={17} />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-700">Doctor prep</p>
                  <p className="text-xs text-stone-400">questions list</p>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Most recent milestone */}
        {recentMilestone && (
          <div>
            <h2 className="font-display text-lg text-stone-700 mb-3">Latest moment</h2>
            <Card className="flex items-start gap-4">
              {recentMilestone.mediaUrl && (
                <img
                  src={recentMilestone.mediaUrl}
                  alt={recentMilestone.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-700">{recentMilestone.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{formatDate(recentMilestone.date)}</p>
                {recentMilestone.notes && (
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{recentMilestone.notes}</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Last sleep summary */}
        {lastSleep && (
          <Card padding="sm" className="flex items-center gap-3 bg-stone-50">
            <span className="text-xl">🌙</span>
            <div>
              <p className="text-sm font-medium text-stone-700">
                Last {lastSleep.type === 'night' ? 'night sleep' : lastSleep.type === 'nap' ? 'nap' : 'sleep'}
              </p>
              <p className="text-xs text-stone-400">
                {lastSleep.endTime
                  ? `${Math.round((new Date(lastSleep.endTime).getTime() - new Date(lastSleep.startTime).getTime()) / 3600000 * 10) / 10}h`
                  : 'In progress'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
