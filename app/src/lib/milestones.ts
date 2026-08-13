import type { Milestone } from '../store/useAppStore'

export const ALL_MILESTONES: Milestone[] = [
  // Week 1–2
  { id: 'm1', week: 1, title: 'Focuses on your face', description: 'Can fix gaze on a face held 20–30 cm away.', category: 'social', isOverachiever: false, supportingActivities: ['Hold baby at feeding distance and make eye contact', 'Talk softly while looking at baby'] },
  { id: 'm2', week: 1, title: 'Responds to sound', description: 'Startles or stills in response to a loud noise.', category: 'sensory', isOverachiever: false, supportingActivities: ['Play soft music', 'Narrate your day in a calm voice'] },
  { id: 'm3', week: 2, title: 'Lifts head briefly during tummy time', description: 'Raises chin off surface for a moment.', category: 'motor', isOverachiever: false, supportingActivities: ['2–3 min tummy time after nappy change', 'Place a mirror at baby\'s eye level'] },
  { id: 'm4', week: 2, title: 'Tracks a moving object briefly', description: 'Eyes follow a slow-moving toy or face.', category: 'sensory', isOverachiever: true, supportingActivities: ['Slowly move a high-contrast rattle side to side', 'Use black-and-white picture cards'] },

  // Week 3–4
  { id: 'm5', week: 3, title: 'Makes small throaty sounds', description: 'Coos or gurgles softly.', category: 'language', isOverachiever: false, supportingActivities: ['Respond to every sound baby makes', 'Read aloud in an animated voice'] },
  { id: 'm6', week: 4, title: 'First social smile', description: 'Smiles in response to a face or voice.', category: 'social', isOverachiever: false, supportingActivities: ['Smile at baby while talking', 'Play peek-a-boo close up'] },
  { id: 'm7', week: 4, title: 'Holds head steady briefly upright', description: 'Supports own head for a few seconds when held upright.', category: 'motor', isOverachiever: false, supportingActivities: ['Supported sitting on your lap', 'Gentle upright carrying'] },

  // Week 6–8
  { id: 'm8', week: 6, title: 'Recognises your voice', description: 'Turns toward the sound of a familiar voice.', category: 'language', isOverachiever: false, supportingActivities: ['Call baby\'s name from different directions', 'Sing the same lullaby each bedtime'] },
  { id: 'm9', week: 6, title: 'Extended tummy time (30+ seconds)', description: 'Keeps head raised for half a minute during tummy time.', category: 'motor', isOverachiever: true, supportingActivities: ['Use a rolled towel under chest for support', 'Tummy time on your chest'] },
  { id: 'm10', week: 8, title: 'Coos and gurgles conversationally', description: 'Takes turns vocalising in a back-and-forth exchange.', category: 'language', isOverachiever: false, supportingActivities: ['Pause after speaking to give baby a turn', 'Mirror their sounds back to them'] },
  { id: 'm11', week: 8, title: 'Follows an arc with eyes', description: 'Tracks an object moved in a 180° arc.', category: 'sensory', isOverachiever: false, supportingActivities: ['Slowly swing a colourful toy in a wide arc', 'Use a mobile above the nappy-change mat'] },

  // Week 10–12
  { id: 'm12', week: 10, title: 'Bats at dangling objects', description: 'Deliberately swipes at objects within reach.', category: 'motor', isOverachiever: false, supportingActivities: ['Hang soft toys above baby on a play gym', 'Hold a rattle just within reach'] },
  { id: 'm13', week: 12, title: 'Laughs out loud', description: 'Produces a genuine, audible laugh.', category: 'social', isOverachiever: false, supportingActivities: ['Gentle tickling games', 'Animated facial expressions and sounds'] },
  { id: 'm14', week: 12, title: 'Holds head steady unsupported', description: 'Head no longer bobs when held sitting or upright.', category: 'motor', isOverachiever: false, supportingActivities: ['Supported sit facing outward to see the world', 'Tummy time daily, 3–5 min sessions'] },
  { id: 'm15', week: 12, title: 'Recognises familiar faces', description: 'Shows excitement or calming when seeing a known caregiver.', category: 'social', isOverachiever: false, supportingActivities: ['Video calls with familiar relatives', 'Photo book of family faces'] },

  // Week 14–16
  { id: 'm16', week: 14, title: 'Reaches for and grasps objects', description: 'Deliberately grabs a toy placed in front of them.', category: 'motor', isOverachiever: false, supportingActivities: ['Offer soft rings and rattles to grab', 'Textured sensory balls'] },
  { id: 'm17', week: 16, title: 'Rolls tummy to back', description: 'Completes a full roll from front to back.', category: 'motor', isOverachiever: false, supportingActivities: ['Supervised floor time on a play mat', 'Encourage with a toy slightly out of reach'] },
  { id: 'm18', week: 16, title: 'Babbles with consonants', description: "Says sounds like 'ba', 'da', 'ma'.", category: 'language', isOverachiever: false, supportingActivities: ['Repeat their sounds with enthusiasm', 'Name objects as you use them'] },

  // Week 20–24
  { id: 'm19', week: 20, title: 'Sits with support', description: 'Holds a sitting position when propped.', category: 'motor', isOverachiever: false, supportingActivities: ['Use a Boppy pillow for supported sitting', 'Short sit sessions on the floor surrounded by cushions'] },
  { id: 'm20', week: 20, title: 'Transfers object hand to hand', description: 'Passes a toy from one hand to the other.', category: 'cognitive', isOverachiever: false, supportingActivities: ['Offer a small, light block or ring', 'Play passing games'] },
  { id: 'm21', week: 24, title: 'Rolls back to tummy', description: 'Completes a full roll in the reverse direction.', category: 'motor', isOverachiever: false, supportingActivities: ['Place a favourite toy just out of reach', 'Supervised floor playtime'] },
  { id: 'm22', week: 24, title: 'Shows stranger anxiety', description: 'May become fussy or clingy with unfamiliar people.', category: 'social', isOverachiever: false, supportingActivities: ['Let strangers approach slowly', 'Stay close and reassure baby'] },
]

export function getMilestonesForWeek(week: number): Milestone[] {
  return ALL_MILESTONES.filter((m) => m.week <= week && m.week >= week - 2)
}

export function getUpcomingMilestones(week: number): Milestone[] {
  return ALL_MILESTONES.filter((m) => m.week > week && m.week <= week + 4)
}

export function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    motor: 'bg-sage-100 text-sage-700',
    social: 'bg-blush-100 text-blush-700',
    language: 'bg-periwinkle-100 text-periwinkle-700',
    cognitive: 'bg-marigold-100 text-marigold-700',
    sensory: 'bg-cream-200 text-stone-700',
  }
  return map[cat] ?? 'bg-stone-100 text-stone-600'
}

export function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    motor: 'Motor',
    social: 'Social',
    language: 'Language',
    cognitive: 'Cognitive',
    sensory: 'Sensory',
  }
  return map[cat] ?? cat
}

// Solid sticker-face background + emoji per category, for the "digital sticker
// book" collectible view of recorded milestones (see StickerBook.tsx).
export function getCategoryStickerBg(cat: string): string {
  const map: Record<string, string> = {
    motor: 'bg-sage-400',
    social: 'bg-blush-400',
    language: 'bg-periwinkle-400',
    cognitive: 'bg-marigold-400',
    sensory: 'bg-sand-400',
  }
  return map[cat] ?? 'bg-stone-300'
}

export function getCategoryIcon(cat: string): string {
  const map: Record<string, string> = {
    motor: '🏃',
    social: '😊',
    language: '💬',
    cognitive: '🧠',
    sensory: '👀',
  }
  return map[cat] ?? '⭐'
}
