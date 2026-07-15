---
name: mono_new_tab_clock
description: Maintain and improve the user's custom "Mono New Tab Clock" Chrome extension (a from-scratch, monochrome new-tab clock). Use this skill whenever the user wants to modify, extend, debug, or discuss their new-tab clock extension — e.g. changing the clock display, fonts, settings panel, colors, layout, or adding new features. The project root is the `mono_new_tab_clock/` directory (this skill lives inside it).
---

# Mono New Tab Clock — custom Chrome extension

A self-built Manifest V3 Chrome extension that replaces the browser's new tab page with
a minimalist, monochrome (grayscale) clock. Built from scratch as a personal,
dependency-free project inspired by existing new-tab clock extensions. The name "Mono"
reflects its colorless / grayscale design. No build step, no frameworks — plain HTML/CSS/JS.

Product name: **Mono New Tab Clock** (identifier: `mono_new_tab_clock`).
In code the name appears in `manifest.json` (`"name": "Mono New Tab Clock"`) and in the
Export filename (`mono_new_tab_clock-settings.json`, in newtab.js).

## Project location

```
mono_new_tab_clock/                                   <- git repo root
├── manifest.json      # MV3, chrome_url_overrides.newtab -> newtab.html; commands + background
├── newtab.html        # markup: clock + gear button + settings panel
├── newtab.css         # all styling
├── newtab.js          # clock rendering + settings logic (localStorage)
├── background.js      # service worker: keyboard-shortcut command -> message to newtab page
├── fonts/             # bundled variable fonts (offline, no network)
│   ├── Montserrat.ttf
│   ├── JosefinSans.ttf
│   └── Roboto.ttf
└── .claude/skills/mono_new_tab_clock/SKILL.md   # THIS file — lives in-repo, git-managed
```

This SKILL.md is a **project skill** stored inside the repo (not user-level), so it is
version-controlled alongside the code. It is auto-discovered as a skill when Claude Code is
launched from (or within) the project directory. If you launch Claude from a parent dir
(e.g. ~/developer) it may not appear in the skill list — open the project dir directly, or
just Read this file.

## How it works (architecture)

- `manifest.json` sets `chrome_url_overrides.newtab` to `newtab.html`, so Chrome shows
  our page on every new tab. No permissions requested — everything is local.
- `newtab.js` runs on page load: `render()` updates the time every second via
  `setInterval`, and settings are loaded from `localStorage`, applied, and re-saved on change.
- MV3 CSP forbids inline scripts/handlers — all JS is in `newtab.js` (external file).
- Fonts are bundled as `.ttf` variable fonts and loaded via `@font-face` (no Google CDN,
  works offline, no external requests / privacy leak).
- **Keyboard shortcut**: `manifest.json` `commands` defines `toggle-settings` with NO
  `suggested_key` (intentionally unassigned to avoid conflicts; user assigns it themselves
  at `chrome://extensions/shortcuts`). The
  command fires in `background.js` (service worker), which `chrome.runtime.sendMessage`s
  `{type:"toggle-settings"}`. `newtab.js` listens via `chrome.runtime.onMessage` and calls
  `toggleSettings()`, but only if `document.hasFocus()` so just the focused tab responds.
  No extra permissions needed (commands API + own-extension messaging).

## Current feature set

- **Time**: 24-hour `HH:MM` (no seconds). Updated every second so minute changes are instant.
- **Date**: English format like `Tuesday, July 14` (custom WEEKDAYS/MONTHS arrays in JS).
- **Colon separator**: NOT a font glyph. Rendered as two perfect CSS circles
  (`.colon::before/::after`, `border-radius:50%`, `currentColor`) so it stays round in any
  font and follows size/opacity automatically. This was a deliberate fix because the macOS
  system font's colon looked square/ugly.
- **Settings panel**: hidden by default, toggled by a gear icon (inline SVG, Feather-style)
  fixed at bottom-left, OR by a keyboard shortcut (unassigned by default; set at
  chrome://extensions/shortcuts). Gear rotates 60°
  while open. Panel sits above the gear. Toggle logic is `toggleSettings()` in newtab.js
  (shared by gear click and shortcut message).
  - Layout: two columns inside `#controls` (flex row). `.panel-left` = 3 sliders stacked
    (Background/Size/Opacity); `.panel-right` = Font select (top), Reset button (middle),
    `.button-row` with Export/Import (bottom). Left labels use a fixed `90px 260px` grid so
    slider start/end points align; `.font-label` uses `auto 1fr`.
  - All UI labels are in **English**.
- **Controls** (each persisted to localStorage, included in Export/Import, reset by Reset):
  - **Background**: grayscale brightness. slider 0–100 -> `rgb(gray,gray,gray)` where
    `gray = 26 + (level/100)*(140-26)`, i.e. `#1a1a1a`(dark) .. `#8c8c8c`(light).
  - **Size**: text scale. slider 50–400 -> CSS var `--scale` = level/100. `#time` and
    `#date` font-sizes are `calc(... * var(--scale))`.
  - **Opacity**: clock opacity. slider 0–100 -> `opacity = level/100`. Affects whole clock.
  - **Font**: `System` (default) / `Montserrat` / `JosefinSans` / `Roboto`. "System" uses
    `-apple-system, "Helvetica Neue", Arial, sans-serif`.
  - **Reset**: restores DEFAULTS (primary, full-width button).
  - **Export / Import**: small secondary buttons. Export downloads
    `mono_new_tab_clock-settings.json`; Import reads a JSON file, validates, applies, saves.
- **Position**: the clock is draggable (mousedown/mousemove/mouseup). Saved as viewport
  percentages `{x,y}` so it survives window resizing; clamped 0–100%.

## Current defaults (newtab.js `DEFAULTS`)

```js
const DEFAULTS = { bg: 23, size: 150, pos: { x: 50, y: 50 }, font: "system", opacity: 10 };
```

- `bg` and `opacity` are raw slider values (the numbers shown in exported JSON), not percentages of range.
- `size: 150` = 1.5x base. `#time` base is 8rem, `#date` base 1.8rem.
- Font weights: `#time` is `font-weight: 100` (thin), `#date` is `300`.

## Key CSS knobs (newtab.css)

- Colon dots: `.colon::before/::after { width/height: 0.045em }`, `.colon { gap: 0.28em }`.
  (History: shrank dots twice to match the thin font; widened gap back up.)
- Clock base sizes: `#time { font-size: calc(8rem * var(--scale)); font-weight: 100 }`,
  `#date { font-size: calc(1.8rem * var(--scale)); font-weight: 300; opacity: 0.75 }`.
- Panel: `#controls` is a flex ROW with `.panel-left` (sliders, flex-column) and
  `.panel-right` (Font/Reset/buttons, flex-column, `width:220px`). `.panel-left label` uses
  `grid-template-columns: 90px 260px`; `.font-label` uses `auto 1fr`; sliders/select are
  `width:100%`. `.button-row .small` buttons are `flex:1` (equal width).

## How to do common changes

- **Add a slider/setting**: (1) add `<label><span>Name</span><input ...></label>` to
  `.panel-left` in newtab.html; (2) add a KEYS entry + DEFAULTS entry in newtab.js;
  (3) add an `applyX()` + load-from-localStorage + `input` listener block; (4) add it to
  `reset` handler, `getCurrentSettings()`, and `applySettings()` (all three!) so persistence,
  reset, and Export/Import stay in sync.
- **Add a font**: download a variable `.ttf` into `fonts/` (from
  `https://github.com/google/fonts/raw/main/ofl/<family>/<File>.ttf`), add an `@font-face`
  block in newtab.css (`font-weight: 100 900`), and add an `<option>` to the font `<select>`.
- **Change time/date format**: edit `render()` in newtab.js.

## Install / test / iterate

1. `chrome://extensions` -> enable Developer mode -> "Load unpacked" -> select the folder.
2. After any edit: click the extension's **reload** button in `chrome://extensions`, then
   open a new tab.
3. No build/lint/test tooling exists — it's static files.

## Notes & gotchas

- Never use inline `<script>`/`onclick` (MV3 CSP blocks them).
- Raleway was bundled early then **removed** per user preference — don't re-add it.
- The user prefers thin, simple, stylish fonts and a minimal, uncluttered UI. Default to
  removing/avoiding extra features unless asked.
- Settings persist via `localStorage` (not `chrome.storage`), so they're per-profile and
  need no permissions. Export/Import JSON is the way to move settings between machines.
- Not a git repo yet. Suggest `git init` if the user wants change history.
- **Position/pos gotcha (fixed)**: the clock's position lives in CSS (`left/top: 50%`) until
  dragged, so before any drag `clock.style.left/top` are empty strings. Historically this made
  Export write `pos: {x:null, y:null}` (parseFloat("")→NaN→JSON null), and Import mis-restored
  it to the top-left corner because `Number(null)===0` passed the `isFinite` guard. Fixes:
  (1) on load, always call `applyPosition(saved-or-DEFAULT)` so inline styles are always set;
  (2) `getCurrentSettings()` falls back to `DEFAULTS.pos` when parseFloat is NaN;
  (3) `applySettings()` explicitly rejects `null`/`undefined` pos values before the isFinite
  check. If you touch pos serialization, keep all three consistent.
