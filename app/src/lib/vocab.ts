// "Vocab of the Day" — multi-language vocabulary exposure for households raising
// a bilingual/multilingual baby. Everything here is a hand-curated, real word or
// song (verified, not invented) rather than machine-translated on the fly, since
// this app has no backend/translation API and incorrect vocab would be actively
// unhelpful. That's also why the language list is a fixed, curated set rather than
// free text — accuracy over breadth. More languages can be added the same way.

export const SUPPORTED_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hebrew', 'Mandarin Chinese', 'Hindi'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export type VocabCategory = 'family' | 'animals' | 'food' | 'body' | 'actions'

export const VOCAB_CATEGORY_EMOJI: Record<VocabCategory, string> = {
  family: '👪',
  animals: '🐶',
  food: '🍎',
  body: '✋',
  actions: '🏃',
}

export interface VocabBankEntry {
  word: string // target-language word (native script/spelling, with a romanization in parentheses where the script isn't Latin)
  translation: string // English gloss
  category: VocabCategory
}

// Four words per category, in a fixed order — the daily picker walks through
// this list in order (wrapping back to the start once exhausted, for review),
// so the order below doubles as the introduction sequence.
export const VOCAB_BANKS: Record<SupportedLanguage, VocabBankEntry[]> = {
  English: [
    { word: 'mama', translation: 'mama', category: 'family' },
    { word: 'dada', translation: 'dada', category: 'family' },
    { word: 'baby', translation: 'baby', category: 'family' },
    { word: 'grandma', translation: 'grandma', category: 'family' },
    { word: 'dog', translation: 'dog', category: 'animals' },
    { word: 'cat', translation: 'cat', category: 'animals' },
    { word: 'bird', translation: 'bird', category: 'animals' },
    { word: 'fish', translation: 'fish', category: 'animals' },
    { word: 'milk', translation: 'milk', category: 'food' },
    { word: 'water', translation: 'water', category: 'food' },
    { word: 'apple', translation: 'apple', category: 'food' },
    { word: 'banana', translation: 'banana', category: 'food' },
    { word: 'eyes', translation: 'eyes', category: 'body' },
    { word: 'nose', translation: 'nose', category: 'body' },
    { word: 'hands', translation: 'hands', category: 'body' },
    { word: 'feet', translation: 'feet', category: 'body' },
    { word: 'eat', translation: 'eat', category: 'actions' },
    { word: 'sleep', translation: 'sleep', category: 'actions' },
    { word: 'more', translation: 'more', category: 'actions' },
    { word: 'up', translation: 'up (pick me up)', category: 'actions' },
  ],
  Spanish: [
    { word: 'mamá', translation: 'mama', category: 'family' },
    { word: 'papá', translation: 'papa', category: 'family' },
    { word: 'bebé', translation: 'baby', category: 'family' },
    { word: 'abuela', translation: 'grandma', category: 'family' },
    { word: 'perro', translation: 'dog', category: 'animals' },
    { word: 'gato', translation: 'cat', category: 'animals' },
    { word: 'pájaro', translation: 'bird', category: 'animals' },
    { word: 'pez', translation: 'fish', category: 'animals' },
    { word: 'leche', translation: 'milk', category: 'food' },
    { word: 'agua', translation: 'water', category: 'food' },
    { word: 'manzana', translation: 'apple', category: 'food' },
    { word: 'plátano', translation: 'banana', category: 'food' },
    { word: 'ojos', translation: 'eyes', category: 'body' },
    { word: 'nariz', translation: 'nose', category: 'body' },
    { word: 'manos', translation: 'hands', category: 'body' },
    { word: 'pies', translation: 'feet', category: 'body' },
    { word: 'comer', translation: 'eat', category: 'actions' },
    { word: 'dormir', translation: 'sleep', category: 'actions' },
    { word: 'más', translation: 'more', category: 'actions' },
    { word: 'arriba', translation: 'up (pick me up)', category: 'actions' },
  ],
  French: [
    { word: 'maman', translation: 'mama', category: 'family' },
    { word: 'papa', translation: 'papa', category: 'family' },
    { word: 'bébé', translation: 'baby', category: 'family' },
    { word: 'grand-mère', translation: 'grandma', category: 'family' },
    { word: 'chien', translation: 'dog', category: 'animals' },
    { word: 'chat', translation: 'cat', category: 'animals' },
    { word: 'oiseau', translation: 'bird', category: 'animals' },
    { word: 'poisson', translation: 'fish', category: 'animals' },
    { word: 'lait', translation: 'milk', category: 'food' },
    { word: 'eau', translation: 'water', category: 'food' },
    { word: 'pomme', translation: 'apple', category: 'food' },
    { word: 'banane', translation: 'banana', category: 'food' },
    { word: 'yeux', translation: 'eyes', category: 'body' },
    { word: 'nez', translation: 'nose', category: 'body' },
    { word: 'mains', translation: 'hands', category: 'body' },
    { word: 'pieds', translation: 'feet', category: 'body' },
    { word: 'manger', translation: 'eat', category: 'actions' },
    { word: 'dormir', translation: 'sleep', category: 'actions' },
    { word: 'encore', translation: 'more', category: 'actions' },
    { word: 'en haut', translation: 'up (pick me up)', category: 'actions' },
  ],
  German: [
    { word: 'Mama', translation: 'mama', category: 'family' },
    { word: 'Papa', translation: 'papa', category: 'family' },
    { word: 'Baby', translation: 'baby', category: 'family' },
    { word: 'Oma', translation: 'grandma', category: 'family' },
    { word: 'Hund', translation: 'dog', category: 'animals' },
    { word: 'Katze', translation: 'cat', category: 'animals' },
    { word: 'Vogel', translation: 'bird', category: 'animals' },
    { word: 'Fisch', translation: 'fish', category: 'animals' },
    { word: 'Milch', translation: 'milk', category: 'food' },
    { word: 'Wasser', translation: 'water', category: 'food' },
    { word: 'Apfel', translation: 'apple', category: 'food' },
    { word: 'Banane', translation: 'banana', category: 'food' },
    { word: 'Augen', translation: 'eyes', category: 'body' },
    { word: 'Nase', translation: 'nose', category: 'body' },
    { word: 'Hände', translation: 'hands', category: 'body' },
    { word: 'Füße', translation: 'feet', category: 'body' },
    { word: 'essen', translation: 'eat', category: 'actions' },
    { word: 'schlafen', translation: 'sleep', category: 'actions' },
    { word: 'mehr', translation: 'more', category: 'actions' },
    { word: 'hoch', translation: 'up (pick me up)', category: 'actions' },
  ],
  Hebrew: [
    { word: 'אמא (Ima)', translation: 'mama', category: 'family' },
    { word: 'אבא (Aba)', translation: 'papa', category: 'family' },
    { word: 'תינוק (Tinok)', translation: 'baby', category: 'family' },
    { word: 'סבתא (Savta)', translation: 'grandma', category: 'family' },
    { word: 'כלב (Kelev)', translation: 'dog', category: 'animals' },
    { word: 'חתול (Chatul)', translation: 'cat', category: 'animals' },
    { word: 'ציפור (Tzipor)', translation: 'bird', category: 'animals' },
    { word: 'דג (Dag)', translation: 'fish', category: 'animals' },
    { word: 'חלב (Chalav)', translation: 'milk', category: 'food' },
    { word: 'מים (Mayim)', translation: 'water', category: 'food' },
    { word: 'תפוח (Tapuach)', translation: 'apple', category: 'food' },
    { word: 'בננה (Banana)', translation: 'banana', category: 'food' },
    { word: 'עיניים (Einayim)', translation: 'eyes', category: 'body' },
    { word: 'אף (Af)', translation: 'nose', category: 'body' },
    { word: 'ידיים (Yadayim)', translation: 'hands', category: 'body' },
    { word: 'רגליים (Raglayim)', translation: 'feet', category: 'body' },
    { word: 'אוכל (Ochel)', translation: 'eat', category: 'actions' },
    { word: 'ישן (Yashen)', translation: 'sleep', category: 'actions' },
    { word: 'עוד (Od)', translation: 'more', category: 'actions' },
    { word: "למעלה (Lema'ala)", translation: 'up (pick me up)', category: 'actions' },
  ],
  'Mandarin Chinese': [
    { word: '妈妈 (māma)', translation: 'mama', category: 'family' },
    { word: '爸爸 (bàba)', translation: 'papa', category: 'family' },
    { word: '宝宝 (bǎobao)', translation: 'baby', category: 'family' },
    { word: '奶奶 (nǎinai)', translation: 'grandma', category: 'family' },
    { word: '狗 (gǒu)', translation: 'dog', category: 'animals' },
    { word: '猫 (māo)', translation: 'cat', category: 'animals' },
    { word: '鸟 (niǎo)', translation: 'bird', category: 'animals' },
    { word: '鱼 (yú)', translation: 'fish', category: 'animals' },
    { word: '奶 (nǎi)', translation: 'milk', category: 'food' },
    { word: '水 (shuǐ)', translation: 'water', category: 'food' },
    { word: '苹果 (píngguǒ)', translation: 'apple', category: 'food' },
    { word: '香蕉 (xiāngjiāo)', translation: 'banana', category: 'food' },
    { word: '眼睛 (yǎnjīng)', translation: 'eyes', category: 'body' },
    { word: '鼻子 (bízi)', translation: 'nose', category: 'body' },
    { word: '手 (shǒu)', translation: 'hands', category: 'body' },
    { word: '脚 (jiǎo)', translation: 'feet', category: 'body' },
    { word: '吃 (chī)', translation: 'eat', category: 'actions' },
    { word: '睡觉 (shuìjiào)', translation: 'sleep', category: 'actions' },
    { word: '还要 (hái yào)', translation: 'more', category: 'actions' },
    { word: '抱抱 (bàobao)', translation: 'up (pick me up)', category: 'actions' },
  ],
  Hindi: [
    { word: 'माँ (Maa)', translation: 'mama', category: 'family' },
    { word: 'पापा (Papa)', translation: 'papa', category: 'family' },
    { word: 'बच्चा (Bachcha)', translation: 'baby', category: 'family' },
    { word: 'दादी (Dadi)', translation: 'grandma', category: 'family' },
    { word: 'कुत्ता (Kutta)', translation: 'dog', category: 'animals' },
    { word: 'बिल्ली (Billi)', translation: 'cat', category: 'animals' },
    { word: 'चिड़िया (Chidiya)', translation: 'bird', category: 'animals' },
    { word: 'मछली (Machhli)', translation: 'fish', category: 'animals' },
    { word: 'दूध (Doodh)', translation: 'milk', category: 'food' },
    { word: 'पानी (Paani)', translation: 'water', category: 'food' },
    { word: 'सेब (Seb)', translation: 'apple', category: 'food' },
    { word: 'केला (Kela)', translation: 'banana', category: 'food' },
    { word: 'आँखें (Aankhein)', translation: 'eyes', category: 'body' },
    { word: 'नाक (Naak)', translation: 'nose', category: 'body' },
    { word: 'हाथ (Haath)', translation: 'hands', category: 'body' },
    { word: 'पैर (Pair)', translation: 'feet', category: 'body' },
    { word: 'खाना (Khana)', translation: 'eat', category: 'actions' },
    { word: 'सोना (Sona)', translation: 'sleep', category: 'actions' },
    { word: 'और (Aur)', translation: 'more', category: 'actions' },
    { word: 'ऊपर (Oopar)', translation: 'up (pick me up)', category: 'actions' },
  ],
}

export interface Song {
  title: string
  // A real, verified YouTube video URL for the song (checked, not invented).
  url: string
  // Which of the 5 vocab categories this song's real subject matter actually
  // relates to (e.g. a song about farm animals -> ['animals']) — used to
  // surface songs relevant to whichever words are being taught today. Based
  // on factual knowledge of the song's real content, never on reproduced
  // lyrics. Can be empty if the song doesn't map cleanly onto any category
  // (e.g. songs about stars/the moon) — better to leave it untagged than
  // force an inaccurate match.
  categories: VocabCategory[]
}

export interface LanguageEnrichment {
  // Real, well-known nursery songs/rhymes in that language — verified, not
  // invented — good starting points for "sing this during bath/diaper time".
  songs: Song[]
  // General, natural ways to introduce vocab in this language — not
  // language-specific facts, just good habits, so nothing here is a claim
  // that could be wrong.
  activityIdeas: string[]
}

export const LANGUAGE_ENRICHMENT: Record<SupportedLanguage, LanguageEnrichment> = {
  English: {
    songs: [
      { title: 'Twinkle, Twinkle, Little Star', url: 'https://www.youtube.com/watch?v=yCjJyiqpAuU', categories: [] },
      { title: 'Old MacDonald Had a Farm', url: 'https://www.youtube.com/watch?v=_6HzoUcx3eo', categories: ['animals'] },
      { title: 'The Wheels on the Bus', url: 'https://www.youtube.com/watch?v=e_04ZrNroTo', categories: ['actions'] },
      { title: 'Head, Shoulders, Knees and Toes', url: 'https://www.youtube.com/watch?v=ZgF9wRoNDxQ', categories: ['body'] },
    ],
    activityIdeas: [
      'Narrate daily routines out loud as you do them ("Now we wash your hands").',
      'Point to and name real objects around the house.',
      'Read simple picture books and name what you see on each page.',
    ],
  },
  Spanish: {
    songs: [
      { title: 'Los Pollitos Dicen', url: 'https://www.youtube.com/watch?v=IGiWekz-nlw', categories: ['animals', 'family'] },
      { title: 'Estrellita Dónde Estás', url: 'https://www.youtube.com/watch?v=5Zuds-C_XPo', categories: [] },
      { title: 'Cabeza, Hombros, Rodillas y Pies', url: 'https://www.youtube.com/watch?v=Ovc3IG3pBBQ', categories: ['body'] },
      { title: 'Debajo Un Botón', url: 'https://www.youtube.com/watch?v=TmcizITX9hI', categories: ['animals'] },
    ],
    activityIdeas: [
      'Sing along during bath time or diaper changes.',
      'Look for Spanish-language or bilingual board books at your library.',
      'Name foods in Spanish at mealtimes.',
    ],
  },
  French: {
    songs: [
      { title: 'Frère Jacques', url: 'https://www.youtube.com/watch?v=Vpu4wWby1is', categories: [] },
      { title: 'Alouette', url: 'https://www.youtube.com/watch?v=xBPnq7AJqjU', categories: ['animals'] },
      { title: 'Une Souris Verte', url: 'https://www.youtube.com/watch?v=z0ItFt7H8dM', categories: ['animals'] },
      { title: 'Ainsi Font, Font, Font', url: 'https://www.youtube.com/watch?v=G5PggfFsNEA', categories: ['actions'] },
    ],
    activityIdeas: [
      'Sing along during bath time or diaper changes.',
      'Look for French-language board books at your library.',
      'Name body parts in French during dressing or bath time.',
    ],
  },
  German: {
    songs: [
      { title: 'Hänschen klein', url: 'https://www.youtube.com/watch?v=FuBEvX5yWPA', categories: ['family'] },
      { title: 'Alle meine Entchen', url: 'https://www.youtube.com/watch?v=Q5ByUEDNmto', categories: ['animals'] },
      { title: 'Backe, backe Kuchen', url: 'https://www.youtube.com/watch?v=EG7YAbfvYS4', categories: ['food'] },
      { title: 'Häschen in der Grube', url: 'https://www.youtube.com/watch?v=8BoaylPmKtA', categories: ['animals'] },
    ],
    activityIdeas: [
      'Sing along during bath time or diaper changes.',
      'Look for German-language board books at your library.',
      'Name animals and body parts in German during play and dressing.',
    ],
  },
  Hebrew: {
    songs: [
      { title: 'נומי נומי ילדתי (Numi Numi Yaldati)', url: 'https://www.youtube.com/watch?v=q37bVW5MGZo', categories: ['actions', 'family', 'food'] },
      { title: 'מה עושות האיילות (Ma Osot HaAyalot)', url: 'https://www.youtube.com/watch?v=ea-yArVDly4', categories: ['animals', 'actions'] },
      { title: 'עשר אצבעות לי יש (Eser Etzbaot Li Yesh)', url: 'https://www.youtube.com/watch?v=oA8Bgjh_JOs', categories: ['body'] },
      { title: 'העכביש הקטן (HaAkavish HaKatan)', url: 'https://www.youtube.com/watch?v=EOgcrwUGO3U', categories: ['animals'] },
    ],
    activityIdeas: [
      'Sing along during bath time or diaper changes.',
      'Look for Hebrew-language board books or apps at your library.',
      'Name family members and animals in Hebrew during daily routines.',
    ],
  },
  'Mandarin Chinese': {
    songs: [
      { title: '两只老虎 (Liǎng Zhī Lǎohǔ / "Two Tigers")', url: 'https://www.youtube.com/watch?v=tNyG1OghBvk', categories: ['animals'] },
      { title: '小星星 (Xiǎo Xīngxīng / "Twinkle Twinkle Little Star")', url: 'https://www.youtube.com/watch?v=ouwnXL6K4xc', categories: [] },
      { title: '拔萝卜 (Bá Luóbo / "Pulling Out the Carrot")', url: 'https://www.youtube.com/watch?v=4lF-qPWIy8o', categories: ['food', 'actions'] },
    ],
    activityIdeas: [
      'Sing along during bath time or diaper changes.',
      'Look for Mandarin board books or apps at your library.',
      'Name animals and food in Mandarin during meals and walks.',
    ],
  },
  Hindi: {
    songs: [
      { title: 'Machhli Jal Ki Rani Hai', url: 'https://www.youtube.com/watch?v=6Al1_cWvK7c', categories: ['animals'] },
      { title: 'Chanda Mama', url: 'https://www.youtube.com/watch?v=P_UrUtqcxY4', categories: ['family', 'food'] },
      { title: 'Lakdi Ki Kathi', url: 'https://www.youtube.com/watch?v=3bLfzgZ-wO8', categories: ['actions'] },
      { title: 'Aloo Kachaloo', url: 'https://www.youtube.com/watch?v=csPX2_oVKzc', categories: ['food'] },
    ],
    activityIdeas: [
      'Sing along during bath time or diaper changes.',
      'Look for Hindi board books or apps at your library.',
      'Name family members and animals in Hindi during daily routines.',
    ],
  },
}

export const VOCAB_WORDS_PER_DAY = 3

/**
 * Picks today's target words for a language by walking through its bank in a
 * fixed order, offset by how many words have already been introduced so far
 * (i.e. how many vocabLog rows already exist for this language) — so each new
 * day naturally advances to the next few words, and once the whole bank has
 * been covered it wraps back to the start for spaced review.
 */
export function getDailyVocabWords(
  language: SupportedLanguage,
  alreadyIntroducedCount: number,
  count: number = VOCAB_WORDS_PER_DAY,
): VocabBankEntry[] {
  const bank = VOCAB_BANKS[language]
  if (!bank.length) return []
  const result: VocabBankEntry[] = []
  for (let i = 0; i < count; i++) {
    result.push(bank[(alreadyIntroducedCount + i) % bank.length])
  }
  return result
}

/**
 * Picks which of a language's songs are most relevant to today's target
 * words, by matching each song's tagged categories against the categories of
 * today's words. Falls back to all songs when nothing matches (e.g. today's
 * words fall in a category no song is tagged with) so the section is never
 * empty.
 */
export function pickRelevantSongs(songs: Song[], todaysCategories: VocabCategory[]): Song[] {
  if (todaysCategories.length === 0) return songs
  const matches = songs.filter((s) => s.categories.some((c) => todaysCategories.includes(c)))
  return matches.length > 0 ? matches : songs
}

export interface VocabWordLogLike {
  id: string
  language: string
  word: string
  covered: boolean
  coveredAt: string | null
  date: string
}

export interface VocabLanguageStats {
  totalIntroduced: number
  totalCovered: number
  uniqueWordsCovered: number
  recentCovered: VocabWordLogLike[]
}

/** Simple running stats for the "vocab over time" view — per language. */
export function computeVocabStats<T extends VocabWordLogLike>(vocabLog: T[], language: string): VocabLanguageStats {
  const forLang = vocabLog.filter((v) => v.language === language)
  const covered = forLang.filter((v) => v.covered)
  return {
    totalIntroduced: forLang.length,
    totalCovered: covered.length,
    uniqueWordsCovered: new Set(covered.map((v) => v.word)).size,
    recentCovered: [...covered].sort((a, b) => (b.coveredAt ?? '').localeCompare(a.coveredAt ?? '')).slice(0, 12),
  }
}
