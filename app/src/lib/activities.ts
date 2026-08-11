import type { ActivityTile } from '../store/useAppStore'
import { uid } from './utils'

interface ActivityTemplate {
  title: string
  description: string
  duration: string
  category: ActivityTile['category']
}

const ACTIVITY_BANK: ActivityTemplate[] = [
  { title: 'Morning tummy time', description: 'Place baby on their front on a firm surface. Encourage head lifting with a high-contrast toy.', duration: '5 min', category: 'play' },
  { title: 'Sensory exploration — texture bag', description: 'Let baby feel fabrics of different textures: velvet, cotton, corduroy.', duration: '10 min', category: 'sensory' },
  { title: 'Story time', description: 'Read a board book with simple, high-contrast images. Narrate the pictures.', duration: '10 min', category: 'play' },
  { title: 'Baby massage', description: 'Gentle strokes on arms, legs, and back using baby-safe oil. Great for bonding and digestion.', duration: '10 min', category: 'sensory' },
  { title: 'Mirror play', description: 'Hold baby in front of an unbreakable mirror. Narrate what you see together.', duration: '5 min', category: 'social' },
  { title: 'Fresh air walk', description: "A gentle stroll in the pram or carrier. Narrate what you see — it builds baby's vocabulary from day one.", duration: '20–30 min', category: 'outdoor' },
  { title: 'Singing & nursery rhymes', description: "Pick 3 favourite songs and repeat them daily. Familiar rhythms soothe and stimulate language.", duration: '10 min', category: 'social' },
  { title: 'High-contrast card time', description: 'Show black-and-white or bold geometric cards at 20–30 cm distance. Move slowly to encourage tracking.', duration: '5 min', category: 'sensory' },
  { title: 'Play gym floor time', description: 'Place baby under a play gym. Let them swipe at dangling toys and kick freely.', duration: '15 min', category: 'play' },
  { title: 'Water play (warm bath)', description: 'A relaxed bath with gentle water play. Describe sensations: warm, splashy, smooth.', duration: '15 min', category: 'sensory' },
  { title: 'Afternoon carrier walk', description: 'Wearing baby close provides vestibular input and skin-to-skin comfort.', duration: '30 min', category: 'outdoor' },
  { title: 'Conversation time', description: 'Talk to baby about anything — your plans, the weather, what you can see. Every word counts.', duration: '10 min', category: 'social' },
  { title: 'Bubble watching', description: 'Blow slow bubbles near baby. Let them track the bubbles and reach out to pop them.', duration: '5 min', category: 'play' },
  { title: 'Wind-down routine', description: 'Dim the lights, lower your voice, do a quiet feed, then put down drowsy but awake.', duration: '20 min', category: 'rest' },
]

export function generateDailyPlan(ageWeeks: number): ActivityTile[] {
  const slots = ageWeeks < 6 ? 4 : ageWeeks < 12 ? 5 : 6
  const shuffled = [...ACTIVITY_BANK].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, slots).map((t) => ({
    id: uid(),
    ...t,
    source: 'suggested' as const,
    completed: false,
  }))
}

export function getCategoryIcon(cat: ActivityTile['category']): string {
  const map: Record<string, string> = {
    play: '🎲',
    outdoor: '🌿',
    sensory: '✋',
    social: '💛',
    rest: '🌙',
    feed: '🍼',
  }
  return map[cat] ?? '⭐'
}

export function getCategoryStyle(cat: ActivityTile['category']): string {
  const map: Record<string, string> = {
    play: 'bg-marigold-100 text-marigold-600 border-marigold-200',
    outdoor: 'bg-sage-100 text-sage-600 border-sage-200',
    sensory: 'bg-periwinkle-100 text-periwinkle-600 border-periwinkle-200',
    social: 'bg-blush-100 text-blush-600 border-blush-200',
    rest: 'bg-stone-100 text-stone-500 border-stone-200',
    feed: 'bg-cream-200 text-stone-600 border-cream-300',
  }
  return map[cat] ?? 'bg-stone-100 text-stone-600 border-stone-200'
}

export const MILESTONE_FOLLOW_UP_QUESTIONS: Record<string, string[]> = {
  default: [
    'How did it happen — were you expecting it?',
    'Who else was there to witness it?',
    'How did you feel in that moment?',
    'Is there anything you want to remember about today?',
  ],
  motor: [
    'What was the setting — floor, bed, your arms?',
    'How many times did they do it?',
    'Did they seem surprised by themselves?',
    'How did you celebrate?',
  ],
  social: [
    'Who prompted the reaction?',
    'What were you doing together?',
    'How did it make you feel?',
    'Any funny or sweet details to remember?',
  ],
  language: [
    'What sound did they make, and can you spell it out?',
    'What were they looking at or doing at the time?',
    'Did they seem to expect a response from you?',
    'What did you say back?',
  ],
}
