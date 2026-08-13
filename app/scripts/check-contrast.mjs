#!/usr/bin/env node
/**
 * Palette contrast check.
 *
 * The app themes itself by re-declaring the same `--color-*` custom properties
 * inside a `.dark` block, so every compiled utility class silently swaps value
 * when the theme flips. That is a nice trick, but it means a foreground and a
 * background chosen in light mode can end up illegible in dark mode without
 * anyone touching the component.
 *
 * This script reads both palettes straight out of src/index.css and checks the
 * foreground/background pairs the UI actually renders, in BOTH themes, against
 * the WCAG 2.1 contrast thresholds. Run it with `npm run check:contrast`.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../src/index.css'), 'utf8')

// ── Palette extraction ───────────────────────────────────────────────────────

function colorVarsIn(block) {
  const out = {}
  for (const m of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g)) out[m[1]] = m[2]
  return out
}

const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)
const darkBlock = css.match(/\n\.dark\s*\{([\s\S]*?)\n\}/)
if (!themeBlock || !darkBlock) {
  console.error('Could not locate the @theme and .dark blocks in src/index.css')
  process.exit(1)
}

const light = { ...colorVarsIn(themeBlock[1]), white: '#ffffff', black: '#000000' }
const dark = { ...light, ...colorVarsIn(darkBlock[1]) }

// ── WCAG maths ───────────────────────────────────────────────────────────────

function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function contrast(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

// ── The pairs the UI actually renders ────────────────────────────────────────
// `size` drives the threshold:
//   'sm'    body/caption text            → 4.5:1 (WCAG AA)
//   'lg'    >=18px, or >=14px bold       → 3:1   (WCAG AA)
//   'ui'    icons/controls that are the only affordance, and meaningful
//           non-text content             → 3:1   (WCAG 2.1 SC 1.4.11)
//   'decor' deliberately-subtle chrome: gridlines, dial rings, hairline
//           dividers, and legend dots that always sit beside their own text
//           label. These are exempt from 1.4.11 because they carry no
//           information on their own, but they still have to be *visible*, so
//           we hold them to a low bar rather than dropping them entirely.

const PAIRS = [
  // Core surfaces
  ['body text on page', 'stone-800', 'cream-100', 'sm'],
  ['body text on card', 'stone-800', 'cream-50', 'sm'],
  ['secondary text on card', 'stone-700', 'cream-50', 'sm'],
  ['muted text on card', 'stone-600', 'cream-50', 'sm'],
  ['caption text on card', 'stone-500', 'cream-50', 'sm'],
  ['faint caption on card', 'stone-400', 'cream-50', 'sm'],
  ['row action icons', 'stone-400', 'cream-50', 'ui'],

  // Quick-log tiles (dashboard) — coloured surface, dark-in-light-mode label
  ['quicklog feed tile label', 'stone-800', 'sand-300', 'sm'],
  ['quicklog sleep tile label', 'stone-800', 'periwinkle-100', 'sm'],
  ['quicklog nappy tile label', 'stone-800', 'blush-100', 'sm'],
  ['quicklog play tile label', 'stone-800', 'sage-100', 'sm'],
  ['quicklog active tile label', 'stone-800', 'marigold-300', 'sm'],
  ['quicklog active tile timer', 'stone-600', 'marigold-300', 'sm'],
  ['quicklog logged tile label', 'stone-800', 'sage-300', 'sm'],
  ['quicklog recent strip', 'stone-700', 'cream-50', 'sm'],

  // Nudge / recommendation cards (LEVEL_STYLES)
  ['nudge good body', 'stone-600', 'sage-50', 'sm'],
  ['nudge good label', 'sage-700', 'sage-50', 'sm'],
  ['nudge watch body', 'stone-600', 'blush-50', 'sm'],
  ['nudge watch label', 'blush-600', 'blush-50', 'sm'],
  ['nudge info body', 'stone-600', 'marigold-50', 'sm'],
  ['nudge info label', 'marigold-600', 'marigold-50', 'sm'],

  // Sheet table chips
  ['chip sage', 'sage-700', 'sage-100', 'sm'],
  ['chip marigold', 'marigold-600', 'marigold-100', 'sm'],
  ['chip blush', 'blush-600', 'blush-100', 'sm'],
  ['chip periwinkle', 'periwinkle-700', 'periwinkle-100', 'sm'],
  ['sheet header', 'cream-50', 'stone-600', 'sm'],

  // Navigation
  ['nav active item', 'stone-800', 'sage-100', 'sm'],
  ['nav inactive item', 'stone-500', 'cream-50', 'sm'],

  // Tab switchers / segmented controls
  ['active tab pill', 'stone-800', 'cream-50', 'sm'],
  ['inactive tab pill', 'stone-500', 'stone-100', 'sm'],
  ['active viz-style button', 'cream-50', 'stone-800', 'sm'],
  ['active day chip', 'stone-800', 'marigold-300', 'sm'],
  ['active filter pill', 'cream-50', 'stone-800', 'sm'],

  // Coloured info panels
  ['sleep-in-progress panel', 'periwinkle-700', 'periwinkle-50', 'sm'],
  ['sleep-in-progress caption', 'periwinkle-500', 'periwinkle-50', 'sm'],
  ['calendar add-photo tile', 'blush-400', 'blush-50', 'lg'],
  ['icon tile periwinkle', 'periwinkle-500', 'periwinkle-100', 'ui'],
  ['icon tile sage', 'sage-600', 'sage-100', 'ui'],
  ['icon tile marigold', 'marigold-600', 'marigold-100', 'ui'],

  // Solid accent surfaces (bright in BOTH themes — ink must stay dark in both)
  ['primary button', 'cream-50', 'sage-500', 'lg'],
  ['danger button', 'cream-50', 'blush-500', 'lg'],
  ['sticker star', 'charcoal', 'marigold-400', 'ui'],
  ['completed checkbox tick', 'charcoal', 'sage-400', 'ui'],
  ['onboarding logo tile border', 'stone-800', 'cream-100', 'ui'],

  // Decorative dots on a card
  ['dot celebration', 'blush-500', 'cream-50', 'decor'],
  ['dot special day', 'blush-400', 'cream-50', 'decor'],
  ['dot event', 'periwinkle-400', 'cream-50', 'decor'],
  ['dot milestone', 'sage-400', 'cream-50', 'decor'],
  ['dot overachiever', 'marigold-400', 'cream-50', 'decor'],

  // Borders that carry meaning
  ['card border', 'stone-800', 'cream-50', 'ui'],
  ['subtle divider', 'stone-200', 'cream-50', 'decor'],

  // Charts / SVG
  ['chart axis ticks', 'stone-400', 'cream-50', 'sm'],
  ['chart gridlines', 'cream-300', 'cream-50', 'decor'],
  ['clock dial ring', 'cream-300', 'cream-50', 'decor'],
  ['clock hour labels', 'stone-400', 'cream-50', 'sm'],
  ['activity feed', 'sage-500', 'cream-50', 'ui'],
  ['activity sleep', 'periwinkle-500', 'cream-50', 'ui'],
  ['activity nappy', 'blush-500', 'cream-50', 'ui'],
  ['activity play', 'marigold-500', 'cream-50', 'ui'],
  ['heatmap empty cell', 'cream-300', 'cream-50', 'decor'],

  // Toggle switches
  ['toggle knob (on)', 'cream-50', 'stone-800', 'ui'],
  ['toggle knob (off)', 'cream-50', 'stone-400', 'ui'],
]

const THRESHOLD = { sm: 4.5, lg: 3, ui: 3, decor: 1.5 }

// ── Run ──────────────────────────────────────────────────────────────────────

let failures = 0
const rows = []

for (const [label, fgTok, bgTok, size] of PAIRS) {
  for (const [themeName, palette] of [['light', light], ['dark', dark]]) {
    const fg = palette[fgTok]
    const bg = palette[bgTok]
    if (!fg || !bg) {
      console.error(`  unknown token in "${label}": ${!fg ? fgTok : bgTok}`)
      failures++
      continue
    }
    const ratio = contrast(fg, bg)
    const min = THRESHOLD[size]
    const pass = ratio >= min
    if (!pass) failures++
    rows.push({ label, themeName, fgTok, bgTok, fg, bg, ratio, min, pass })
  }
}

const width = Math.max(...rows.map((r) => r.label.length))
for (const r of rows.filter((x) => !x.pass)) {
  console.log(
    `FAIL  ${r.themeName.padEnd(5)} ${r.label.padEnd(width)}  ` +
      `${r.fgTok}(${r.fg}) on ${r.bgTok}(${r.bg})  ` +
      `${r.ratio.toFixed(2)}:1 < ${r.min}:1`
  )
}

const checked = rows.length
if (failures === 0) {
  console.log(`All ${checked} palette pairs pass WCAG AA in both themes.`)
} else {
  console.log(`\n${failures} of ${checked} palette pairs fail WCAG AA.`)
}

// ── Guard: no raw white/black utilities ──────────────────────────────────────
// `bg-white` and friends are Tailwind built-ins defined outside @theme, so they
// can't participate in the .dark flip — a `bg-white` card keeps a near-white
// text token on a near-white surface in dark mode (~1.2:1). The pairs above
// can't catch these because they aren't palette tokens at all, so grep for them.
// Use `cream-50` for surfaces and `charcoal` for ink that must stay dark in
// both themes. Overlays on top of user photos (`bg-black/50 text-white`) are
// exempt: the photo is the background, not the theme.

const WHITE_UTIL = /(?<![\w-])(bg|text|fill|stroke|border)-white(?![\w-])/
const EXEMPT = /bg-black\//

let strays = 0
for (const file of walk(resolve(here, '../src'))) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (WHITE_UTIL.test(line) && !EXEMPT.test(line)) {
      console.log(`STRAY ${file.replace(resolve(here, '..') + '/', '')}:${i + 1}  ${line.trim().slice(0, 100)}`)
      strays++
    }
  })
}
if (strays > 0) {
  console.log(
    `\n${strays} raw white utility/utilities found. These can't flip with the dark ` +
      `theme — use cream-50 (surface) or charcoal (always-dark ink) instead.`
  )
}

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p)
  }
  return out
}

// Set the code rather than calling process.exit(), so Node flushes stdout and
// tears down normally — process.exit() races the pending writes from the loops
// above and can abort the process mid-flush.
process.exitCode = failures === 0 && strays === 0 ? 0 : 1
