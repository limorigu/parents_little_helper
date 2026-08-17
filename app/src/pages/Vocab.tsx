import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Music, Sparkles, Languages, Video } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { PageShell } from '../components/layout/PageShell'
import { today, uid, formatShort } from '../lib/utils'
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_ENRICHMENT,
  VOCAB_BANKS,
  getDailyVocabWords,
  computeVocabStats,
  pickRelevantSongs,
  type SupportedLanguage,
} from '../lib/vocab'
import type { VocabWordLog } from '../store/useAppStore'

function LanguageCard({ language, wordsToday, vocabLog, onToggle }: {
  language: SupportedLanguage
  wordsToday: VocabWordLog[]
  vocabLog: VocabWordLog[]
  onToggle: (id: string, covered: boolean) => void
}) {
  const enrichment = LANGUAGE_ENRICHMENT[language]
  const stats = computeVocabStats(vocabLog, language)
  const doneToday = wordsToday.filter((w) => w.covered).length

  // Match today's words back to the bank to find their categories, so we can
  // surface songs that actually relate to what's being taught today (falling
  // back to the full list if nothing matches).
  const bank = VOCAB_BANKS[language]
  const todaysCategories = wordsToday
    .map((w) => bank.find((b) => b.word === w.word)?.category)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
  const relevantSongs = pickRelevantSongs(enrichment.songs, todaysCategories)

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base text-stone-700">{language}</h2>
        <Badge className="bg-periwinkle-100 text-periwinkle-700 border-periwinkle-200">
          {doneToday}/{wordsToday.length} today
        </Badge>
      </div>

      {/* Today's words — todo-list style */}
      <div className="space-y-1.5">
        {wordsToday.map((w) => (
          <label
            key={w.id}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${w.covered ? 'border-sage-200 bg-sage-50/40' : 'border-stone-100 hover:border-stone-200'}`}
          >
            <input
              type="checkbox"
              checked={w.covered}
              onChange={(e) => onToggle(w.id, e.target.checked)}
              className="accent-sage-500 w-4 h-4 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${w.covered ? 'line-through text-stone-400' : 'text-stone-700'}`}>{w.word}</p>
              <p className="text-xs text-stone-400">{w.translation}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Natural ways to introduce these words */}
      <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
        <p className="text-xs font-black uppercase tracking-wide text-stone-400 flex items-center gap-1.5">
          <Music size={12} /> Songs featuring today's words
        </p>
        <div className="flex flex-wrap gap-1.5">
          {relevantSongs.map((s) => (
            <a
              key={s.title}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              <Badge className="bg-marigold-100 text-marigold-700 border-marigold-200 hover:bg-marigold-200 transition-colors">
                <Video size={11} className="shrink-0" /> {s.title}
              </Badge>
            </a>
          ))}
        </div>
        <ul className="text-xs text-stone-500 leading-relaxed list-disc list-inside space-y-0.5">
          {enrichment.activityIdeas.map((idea) => <li key={idea}>{idea}</li>)}
        </ul>
      </div>

      {/* Progress over time */}
      <div className="mt-3 pt-3 border-t border-stone-100">
        <p className="text-xs font-black uppercase tracking-wide text-stone-400 flex items-center gap-1.5 mb-1.5">
          <Sparkles size={12} /> Vocab so far
        </p>
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-700">{stats.uniqueWordsCovered}</span> word{stats.uniqueWordsCovered !== 1 ? 's' : ''} covered
          {' '}(out of {stats.totalIntroduced} introduced).
        </p>
        {stats.recentCovered.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {stats.recentCovered.map((w) => (
              <span key={w.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                {w.word}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export function Vocab() {
  const { targetLanguages, vocabLog, addVocabWords, setVocabWordCovered } = useAppStore()
  const todayStr = today()

  // Generate today's word set for each configured language, once per day per
  // language — idempotent (skipped once today's entries already exist), same
  // pattern as DailyPlan's daily generation.
  useEffect(() => {
    targetLanguages.forEach((lang) => {
      if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) return
      const hasToday = vocabLog.some((v) => v.language === lang && v.date === todayStr)
      if (hasToday) return
      const introducedCount = vocabLog.filter((v) => v.language === lang).length
      const words = getDailyVocabWords(lang as SupportedLanguage, introducedCount)
      addVocabWords(
        words.map((w) => ({
          id: uid(),
          language: lang,
          word: w.word,
          translation: w.translation,
          date: todayStr,
          covered: false,
          coveredAt: null,
        }))
      )
    })
  }, [targetLanguages, vocabLog, todayStr, addVocabWords])

  function handleToggle(id: string, covered: boolean) {
    setVocabWordCovered(id, covered)
  }

  return (
    <PageShell title="Vocab of the Day" subtitle={formatShort(todayStr + 'T00:00:00')}>
      {targetLanguages.length === 0 ? (
        <EmptyState
          icon="🗣️"
          title="No languages set up yet"
          description="Pick which language(s) you'd like to expose baby to, and we'll suggest a few new words each day."
          action={
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 text-sm font-bold text-periwinkle-600 hover:underline"
            >
              <Languages size={14} /> Choose languages in Settings
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {targetLanguages
            .filter((lang): lang is SupportedLanguage => (SUPPORTED_LANGUAGES as readonly string[]).includes(lang))
            .map((lang) => (
              <LanguageCard
                key={lang}
                language={lang}
                wordsToday={vocabLog.filter((v) => v.language === lang && v.date === todayStr)}
                vocabLog={vocabLog}
                onToggle={handleToggle}
              />
            ))}
        </div>
      )}
    </PageShell>
  )
}
