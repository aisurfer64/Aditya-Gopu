---
name: Aditya Gopu Portfolio
description: An editorial, type-led portfolio. Condensed display type, mono micro-labels and a serif accent on off-white and black, with one orange accent and a 1px hairline grid.
colors:
  paper: "#fcfcfc"
  ink: "#000000"
  orange: "#fb6f3e"
  orange-deep: "#d94b23"
  grey: "#d3d3d3"
typography:
  display:
    fontFamily: "founders-grotesk-x-condensed-bold, helvetica, sans-serif"
    fontSize: "clamp(52px, min(28dvh, 21vw), 350px)"
    fontWeight: 700
    lineHeight: 0.75
    letterSpacing: "0em"
  headline:
    fontFamily: "founders-grotesk-x-condensed-bold, helvetica, sans-serif"
    fontSize: "clamp(72px, min(8.6vw, 15dvh), 140px)"
    fontWeight: 700
    lineHeight: 0.7
  label:
    fontFamily: "GT-America-Mono-Regular, helvetica, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0em"
  label-sm:
    fontFamily: "GT-America-Mono-Regular, helvetica, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1
  grid-title:
    fontFamily: "Fraktion Mono, GT-America-Mono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "24px"
    letterSpacing: "0.1em"
  serif-accent:
    fontFamily: "Editorial New, serif"
    fontSize: "2.25rem"
    fontWeight: 200
    lineHeight: 1.13
  serif-caption:
    fontFamily: "Editorial New, serif"
    fontSize: "1.25rem"
    fontWeight: 200
    lineHeight: 1.3
  wordmark:
    fontFamily: "Bigger Display, founders-grotesk-x-condensed-bold, sans-serif"
    fontSize: "6.5625rem"
    fontWeight: 700
    lineHeight: 0.82
rounded:
  none: "0"
  full: "50%"
spacing:
  xs: "8px"
  sm: "16px"
  regular: "24px"
  lg: "48px"
  xl: "80px"
  2xl: "120px"
  page-pad: "clamp(14px, 1.8vw, 28px)"
  hairline: "1px"
components:
  micro-label:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  link-hover:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "1px"
  grid-title-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.grid-title}"
    rounded: "{rounded.none}"
    height: "24px"
  grid-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.serif-accent}"
    rounded: "{rounded.none}"
    padding: "0.75rem"
  cursor-dot:
    backgroundColor: "{colors.orange}"
    rounded: "{rounded.full}"
    size: "20px"
---

# Design System: Aditya Gopu Portfolio

## Overview

**Creative North Star: "The Printed Folio"**

A single long scroll that reads like an editorial spread: oversized condensed type, tiny mono annotations, and a serif used sparingly for quiet, human text. Paper and ink do nearly all the work. One orange is the only color that is allowed to speak. Structure is drawn with 1px rules and white space, never with cards, fills or shadows.

The page is a stack of full-viewport sections that pin (`position: sticky; top: 0`) and are revealed one after another, with Lenis smooth scrolling. Density is low and scale contrast is high: a 350px display word next to a 14px label. Motion is slow, deliberate and decelerating.

**Key Characteristics:**
- Hierarchy comes from type size, family and spacing, not from boxes or backgrounds.
- Three typographic voices with fixed roles: condensed display, mono label, serif accent.
- Off-white `#fcfcfc` and black `#000000`, plus exactly one accent: orange `#fb6f3e`.
- The Awards section is the reference for structure: a 1px black hairline grid with diagonal hatching exposed in empty cells.
- Everything is square. The only round thing is the cursor dot.
- Micro-labels are numbered and parenthesised: `(001)`, `00(1)`, `Issue 01`.

## Colors

A two-tone paper-and-ink palette with a single orange accent. Nothing else carries meaning.

### Primary
- **Signal Orange** (#fb6f3e, `--orange`): the one accent. Used for the cursor dot, the accent word in the about headline, the sparkle mask in Awards, and as the full-bleed field of the Contact section.
- **Burnt Orange** (#d94b23, `--dark-orange`): the same hue, darker. Hover state of orange or of display text only. It is a shade of the accent, not a second accent.

### Neutral
- **Paper** (#fcfcfc, `--white`): page background and all text-on-ink. Never pure `#fff`.
- **Ink** (#000000, `--black`): all text, all hairlines, the Awards title bar and selection highlight.
- **Mist Grey** (#d3d3d3, `--grey`): placeholder fill behind images while they load. Not a surface colour for layout.

### Named Rules
**The One Voice Rule.** Orange is the only accent. If a new element needs emphasis, get it from size, case, family or position first. Orange is used on a small share of any screen; its rarity is the point.

**The Paper-and-Ink Rule.** Text is ink on paper, or paper on ink. Never grey text, never tints of the accent, never a gradient (the Awards hatch is hard-edged ink lines, not a gradient fill).

## Typography

**Display Font:** Founders Grotesk X-Condensed Bold (`founders-grotesk-x-condensed-bold`, helvetica) — `--family-main`
**Label/Body Font:** GT America Mono Regular (helvetica) — `--family-secondary`, the `body` default
**Serif Accent:** PP Editorial New, Ultralight 200 (Regular 400 is loaded but not used)

**Character:** A very tall, tight grotesque shouting over a quiet typewriter-like mono, with a thin high-contrast serif for the occasional human sentence. The size gap is the design.

### Hierarchy
- **Display** (700, `clamp(52px, min(28dvh, 21vw), 350px)`, line-height 0.75): section-opening words such as "Selected (Works)". Line-height under 1 is deliberate; lines nearly touch.
- **Headline** (700, `clamp(72px, min(8.6vw, 15dvh), 140px)`, 0.7): the About statement, Contact lines, mobile menu items.
- **Label** (400, 15px / 14px at ≤1250px, line-height 1, uppercase): nav, dates, project titles, "Keep Scrolling +". The whole `body` is uppercase mono by default; uppercase is the label voice.
- **Grid Title** (Fraktion Mono 700, 12px, 24px line-height, 0.1em tracking, uppercase): the one black title bar over the Awards grid.
- **Serif Accent** (Editorial New 200, 2.25rem down to 1.15rem responsive, 1.13, sentence case, `text-wrap: balance`): award names and other quiet, human text inside the grid. Captions at 1.25rem / 1.3, wrapped in parentheses.
- **Wordmark** (Bigger Display 700, 6.5625rem, 0.82): the acronym wordmarks inside Awards cells (USAEO, IEO, USACO) only.

### Named Rules
**The Three Voices Rule.** Display condensed = what the thing *is*. Mono uppercase = *where / when / which* (labels, indices, nav, dates). Serif = a quiet *sentence*. Do not swap roles, and do not set body paragraphs in display type.

**The Scale Contrast Rule.** Adjacent type tiers differ by at least ~4× in size. No in-between sizes; if two things look similar, make one a label or make it display.

## Layout

A full-bleed, sticky-stacked vertical sequence: loading screen → About → scattered media → Work title → Work ledger → Projects (four sticky panels, each opening a full-screen detail page) → Awards → Contact. Sections are mostly `100dvh`, padded by `--page-pad` (`clamp(14px, 1.8vw, 28px)`). Project rows centre in a max width of `165dvh`. The scattered media section runs on a 60-column grid.

Spacing is a short ladder: 8 / 16 / 24 / 48 / 80 / 120px. Rhythm comes from whitespace and from the gap between tiers, not from dividers or containers. Breakpoints used: 1250px (nav collapses to flex, cursor hidden, label drops to 14px), 1080px, 767px and 750px (mobile menu), 576px.

### Named Rules
**The No-Box Rule.** Group things with space and alignment. Do not wrap content in cards, tiles, panels, badges or filled containers. A 1px rule is allowed when it is part of the hairline grid (below).

## Elevation & Depth

Flat. There are no shadows, no blur and no radius. Depth is conveyed by sticky stacking (each section slides over the previous one), by scale, and by clip-path reveals.

### Named Rules
**The Flat-Always Rule.** No `box-shadow`, no `border-radius` (except the 50% cursor dot), no glass, no gradients.

## Shapes

Square and rectilinear. Edges are 1px ink hairlines. The only curved forms are the cursor dot (20px circle) and the wireframe globe / four-point star glyphs in Awards, which are line art.

### The Hairline Grid (from Awards)
The Awards section is the reference for editorial structure:
- A 4-column grid inside a single 1px solid ink border, topped by a solid ink **title bar** with centred paper-on-ink mono text.
- Every cell draws its own 1px ink border (via a `::before` inset by -1px so adjacent borders collapse to a single hairline).
- Cells have a fixed ratio (width/4 ÷ 0.751) and span multiple columns and rows to form an irregular, magazine-like layout.
- **Empty cells are not left blank:** a hard-edged 45° ink hatch (`repeating-linear-gradient(-45deg …)`, 1.5px lines on ~11px pitch) shows through, so the grid reads as a printed matrix.
- Content is centred in text cells (serif), bottom-left in counter cells (wordmark + serif caption).
- Cells reveal by clip-path wipe with the orange sparkle mask; hover scales content to 0.95.

## Components

### Micro-labels (numbered)
Mono, uppercase, 14–15px, ink, usually in parentheses with a zero-padded index: `(001)` over a project, `00(1)` over each scattered image, `Issue 01 / Folio`, `60% / 100`, `©2024`. They annotate, never headline. Zero-pad to at least two digits and keep the parenthesis style consistent.

### Navigation links
Mono uppercase labels separated by `/`. Hover draws a 1px ink underline that scales in from 0 to 1 on the X axis (250ms), clipped by `overflow: hidden`. No colour change, no background.

### Cursor dot
A 20px orange circle that follows the pointer on desktop (hidden at ≤1250px).

### Awards grid cell
See *The Hairline Grid* above.

## Motion

Smooth and decelerating. Things arrive fast and settle softly; they never overshoot.

- **Default ease:** `power3.out` = `cubic-bezier(0.215, 0.61, 0.355, 1)`. Use for reveals, fades, small moves, hover.
- **Large moves:** `power4.out` = `cubic-bezier(0.165, 0.84, 0.44, 1)`. Use for page-scale transitions, clip-path wipes and big translations.
- **Durations:** 250ms hover, 800ms element reveals, ~1500ms for page-scale transitions. Stagger text by word or letter in the 20–60ms range.
- **Smooth scroll:** Lenis on the whole page.
- **Respect `prefers-reduced-motion`.**

### Named Rules
**The No-Bounce Rule.** No `back`, `elastic`, `bounce` or spring easing, and no cubic-bezier with a control-point y outside 0–1. Nothing wobbles, snaps back or overshoots.

## Do's and Don'ts

### Do:
- **Do** build hierarchy from type size, family and whitespace.
- **Do** keep text to ink on paper (`#000` on `#fcfcfc`) or paper on ink.
- **Do** use orange `#fb6f3e` as the single accent, sparingly.
- **Do** use the hairline grid (1px ink border, optional 45° hatch) when you need structure, as Awards does.
- **Do** number labels in mono, zero-padded, in parentheses: `(001)`.
- **Do** ease with `power3.out` / `power4.out`, and keep durations in the 250–1500ms range.

### Don't:
- **Don't** introduce a second accent colour (yellow, purple, green or any other).
- **Don't** use cards, filled panels, badges, shadows, gradients, glass or rounded corners.
- **Don't** set body copy in display type, or display words in mono.
- **Don't** use bouncy, elastic, spring or overshooting easing, or symmetric in-out easing for reveals.
- **Don't** use grey text or opacity-based tints to create hierarchy.
- **Don't** add decorative icons or illustrations. Imagery is photography/video and the existing line-art glyphs only.

## Known drift from these rules (current code)

Documented, not yet changed. These are what a future cleanup would address, pending your decision:

- **Extra colours are in use.** `--yellow #f9cf71` (loading screen background, and the pre-load `body` colour), `--purple #989ec0` (formerly the Works background; the Work section is now paper and ink, so it is unused) and unused `--light-purple`, `--dark-purple`, `--green` are all defined. Under the One Voice Rule these are non-system.
- **Easing is symmetric in-out, not out.** The shared `bezier` in `src/App/utils/constants.js` and all Awards transitions use `cubic-bezier(0.76, 0, 0.24, 1)` (easeInOutQuart). Other places use the CSS keywords `ease`, `ease-out` and `ease-in-out`; `Loading.js` uses a hand-written easeOutCubic. None are bouncy, but only the loader count-up matches the power3/4-out target.
- **Two mono families and four total families in the grid.** GT America Mono is the global label font, while Fraktion Mono is used only for the Awards title bar. Bigger Display is used only for Awards wordmarks. Editorial New Regular (400) is declared but unused, and the Ultralight is used only in Awards.
- **Serif is confined to Awards.** The serif accent does not appear elsewhere on the page.
- **Numbered labels are inconsistent:** `00(1)` (scattered), `(001)` (projects), `Issue 01` (about), `60%` (loader).
- **Font paths:** `style.css` loads fonts from absolute `/fonts/…` URLs, which only resolve because Vite rewrites them at build time; `index.html` at the repo root references `./fonts/`.


## Work and Projects

- **Embedded work is a window, not a card.** A live-site preview or poster sits in a flat 1px ink frame with a mono caption underneath; it is the one sanctioned content window. Empty or pending media shows the 45° hatch (`.hatch`), never a placeholder box.
- **Work** is a hairline ledger (index, display name, mono meta, hatch cell). Rows reveal on scroll and expand as an accordion; hover or open washes the row in ink with an orange index.
- **Projects** are sticky panels whose index strips accumulate under the nav. A click opens a full-screen paper detail page (text left, media right) with Escape, Close, Prev/Next and back-button support.
