# Parents' Little Helper

A sophisticated, warm companion app for parents on parental leave — tracking milestones, daily plans, feeding, sleep, growth, and everything in between.

---

## Features

### Core

| Feature | Description |
|---|---|
| **Calendar** | Tracks key dates from birth — monthly anniversaries, 100-day celebration, custom events, doctor appointments — displayed on an interactive monthly grid |
| **Milestones** | Weekly standard and ⭐ overachiever milestone cards with supporting activities; flags milestones recorded unusually early for discussion with a doctor |
| **Daily Plan** | Auto-generated activity tiles based on baby's age; fully reorderable via drag-and-drop; mark complete, delete, or add your own; confirm and lock the day's schedule |
| **Milestone Recorder** | 3-step flow: select or describe the moment → add photo or video → answer gentle follow-up questions to capture the full memory |
| **Activity Research** | Curated age-appropriate activity bank; tiles indicate category (play, outdoor, sensory, social, rest, feed) with duration; local activities surfaced via location (Phase 2) |

### Phase 1 additions

| Feature | Description |
|---|---|
| **Feeding & Sleep Tracker** | Log breast feeds (left/right, duration), bottle feeds (formula/pumped, ml), and solid food; log naps and night sleep with start/end times; visualise recent history |
| **Growth Chart** | Log weight (grams), height (cm), and head circumference over time; interactive Recharts line graph; weight-gain-since-birth summary card with gentle guidance |
| **Doctor Visit Prep** | Schedule upcoming visits; auto-generated question list keyed to baby's current age in weeks; add custom questions; mark visit complete and archive |

### UX & Design

- **Onboarding flow** — collects baby name, birth date, measurements, parent name, and location on first launch
- **Responsive layout** — sidebar navigation on desktop, bottom tab bar on mobile
- **Sophisticated palette** — warm cream background, stone neutrals, blush / sage / periwinkle / marigold accents; DM Serif Display for headings, DM Sans for body
- **Kind, tactful tone** — tips, empty states, and prompts written with warmth and emotional intelligence
- **Local-first** — all data stored in `localStorage` via Zustand persist; nothing leaves the device

---

## Tech stack

| Layer | Library |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 + `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 (custom theme tokens) |
| Routing | React Router v6 |
| State | Zustand with `persist` middleware |
| Drag-and-drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| Date utilities | date-fns |

---

## Project structure

```
app/
├── src/
│   ├── App.tsx                   # Router + onboarding gate
│   ├── main.tsx
│   ├── index.css                 # Tailwind v4 + design tokens
│   ├── store/
│   │   └── useAppStore.ts        # Zustand store — all data models
│   ├── lib/
│   │   ├── milestones.ts         # Milestone data bank + helpers
│   │   ├── activities.ts         # Activity templates + follow-up questions
│   │   └── utils.ts              # Date helpers, WHO references, uid
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navigation.tsx    # Sidebar + mobile bottom bar
│   │   │   └── PageShell.tsx     # Sticky header + content container
│   │   └── ui/
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Modal.tsx
│   │       ├── Input.tsx         # Input + Textarea
│   │       └── EmptyState.tsx
│   └── pages/
│       ├── Dashboard.tsx         # Home: tip, stats, quick log, latest moment
│       ├── Milestones.tsx        # Filtered milestone list + recorded timeline
│       ├── MilestoneRecord.tsx   # 3-step recorder (what → media → follow-up)
│       ├── DailyPlan.tsx         # Drag-and-drop activity planner
│       ├── Tracker.tsx           # Feed & sleep logging tabs
│       ├── GrowthChart.tsx       # Measurements + Recharts line graph
│       ├── Calendar.tsx          # Monthly grid + upcoming events
│       ├── DoctorPrep.tsx        # Visit scheduler + auto question list
│       └── Settings.tsx          # Profile / onboarding form
feature_roadmap_ideas.md          # Features 4–10 for future phases
```

---

## Getting started

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

---

## Git workflow (recommended)

The project is a standard git repo. Suggested commit rhythm:

```bash
# After each working session
git add -p               # review and stage changes interactively
git commit -m "feat: ..."
git push origin main     # or your branch
```

Suggested branch naming:
- `feat/<feature-name>` for new features
- `fix/<description>` for bug fixes
- `design/<description>` for visual changes

---

## Roadmap

See [`feature_roadmap_ideas.md`](./feature_roadmap_ideas.md) for the full Phase 2 and Phase 3 feature backlog, including partner sharing, postpartum wellness check-ins, memory book export, community feed, voice logging, return-to-work planner, and product recommendations.

---

## Data & privacy

All user data (baby profile, milestones, feeds, sleep, growth entries, plans) is stored exclusively in the browser's `localStorage`. No data is transmitted to any server. Clearing browser data or uninstalling the app will erase everything — export functionality is planned for Phase 2.
