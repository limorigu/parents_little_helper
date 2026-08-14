# Feature Roadmap

What's already shipped, what's being considered next, and how to weigh in.

---

## v1 — Shipped

Everything below is implemented and live in the app today.

| Feature | Description |
|---|---|
| **Onboarding & Settings** | Collects baby name, birth date, sex, measurements, parent name, and (optional) location on first launch; all editable later |
| **Dashboard** | Tip of the day, at-a-glance stats, and one-tap Quick Log shortcuts for feeds, sleep, diapers, and play |
| **Calendar** | Monthly grid tracking key dates from birth — monthly anniversaries, 100-day celebration, custom events, doctor appointments |
| **Milestones** | Weekly standard and ⭐ overachiever milestone cards with supporting activities; flags milestones recorded unusually early for discussion with a doctor |
| **Milestone Recorder** | 3-step flow: select or describe the moment → add a photo or video → answer gentle follow-up questions to capture the full memory |
| **Celebration Photos** | Attach a photo or video to key calendar moments (birth, monthly anniversaries, 100 days); drag-and-drop to reorder, adjustable focal point for cropped frames |
| **Daily Plan** | Auto-generated activity tiles based on baby's age; fully reorderable via drag-and-drop; mark complete, delete, or add your own; confirm and lock the day's schedule |
| **Activity Research** | Curated age-appropriate activity bank; tiles indicate category (play, outdoor, sensory, social, rest, feed) with duration |
| **Feeding, Sleep, Diaper & Play Tracker** | Log breast feeds (left/right/both, duration), bottle feeds (formula/pumped, ml), and solid food; sleep with start/end times; diaper changes (wet/dirty/both, EC/potty tracking); play sessions — plus a rolling insights view across recent history |
| **Growth Chart** | Log weight (grams), height (cm), and head circumference over time; interactive line graph; weight-gain-since-birth summary with gentle guidance |
| **Doctor Visit Prep** | Schedule upcoming visits; auto-generated question list keyed to baby's current age in weeks; add custom questions; mark visit complete and archive |
| **Local Events** *(opt-in)* | Real, never-invented activity and event suggestions near an opt-in postcode, pulled weekly (anchored to Wednesdays) from Ticketmaster, Google News, and any local blog/feed URL you add — each source fails independently, so one bad key never blocks the others |
| **Google Drive Sync** | Optional Google sign-in to back up photos/videos (milestones and celebrations) to your own Drive and keep them synced across devices |
| **Night Owl / Dark Mode** | High-contrast dark theme built for 3 AM feeds — easy on the eyes, easy to toggle |
| **Design system** | Warm, tactile visual language (cream background, stone neutrals, blush/sage/periwinkle/marigold accents); responsive layout (sidebar on desktop, bottom tab bar on mobile); kind, tactful microcopy throughout |
| **Local-first data** | Everything lives in `localStorage` via Zustand persist — nothing leaves your device unless you explicitly opt into Google Drive sync or Local Events |

---

## v2 Candidates

Under consideration for the next major release, in rough priority order.

### 1. Partner & Family Sharing
Invite a co-parent, grandparent, or caregiver with role-based access so feeding logs, milestones, and the daily plan sync across devices in real time.

### 2. Postpartum Wellness Check-ins
Gentle, non-clinical daily mood and energy prompts for the parent (not just the baby), with pattern tracking and a soft nudge toward resources if scores trend low over time.

### 3. Memory Book / Export
Auto-compile photos, videos, milestone notes, and key dates into a beautiful shareable timeline — exportable as PDF, Instagram story set, or a printed book via third-party integration.

---

## v3 Candidates

Further out, and more speculative.

### 4. Community Feed
Anonymous, moderated local parent feed where users in the same age bracket share activity reviews, local class recommendations, and tips — curated and surfaced by the app's AI.

### 5. Voice-First Logging
Hands-free logging: "Hey Helper, log a feed" or "log a smile today" — so parents can capture moments while holding the baby without fumbling with a phone.

### 6. Return-to-Work Planner
A dedicated mode that activates 4–6 weeks before the end of parental leave: childcare research checklist, gradual transition schedule for baby and parent, and emotional support content.

### 7. Product & Gear Recommendations
Age-appropriate, evidence-based product suggestions (books, toys, gear) surfaced at the right developmental stage, with affiliate links or one-tap purchase integration.

---

## Got a suggestion?

This roadmap is a living document, not a fixed plan — priorities and phase assignments can and will shift based on what parents actually want. If there's a feature you wish existed, a v2/v3 idea you'd bump up in priority, or something not listed here at all, please open an [issue](https://github.com/limorigu/parents_little_helper/issues) or [discussion](https://github.com/limorigu/parents_little_helper/discussions) on the repo. Real feedback from real parents is what should drive what gets built next.
