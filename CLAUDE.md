# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal portfolio site (vanilla JS + CSS, no framework) built with Vite and `vite-plugin-handlebars`, deployed to GitHub Pages from the **repo root**. Only runtime dependency is `lenis` (smooth scroll). There is no test runner or linter.

## Commands

```bash
npm install
npm run dev       # Vite dev server (root is src/), opens the browser
npm run build     # vite build -> dist/, then DELETES root assets/ fonts/ images/ index.html and copies dist/* into the repo root
npm run preview
```

## Build/deploy quirk (important)

`npm run build` is destructive by design: GitHub Pages serves the repo root, so the built output (`index.html`, `assets/`, `fonts/`, `images/`) is committed at the top level. Those root files are generated — edit `src/` and `static/`, never the root copies, and commit the rebuilt output together with source changes. `vite.config.js` sets `root: 'src/'`, `publicDir: '../static/'`, `base: './'`.

## Architecture

- **Page assembly:** `src/index.html` is a Handlebars template composed of partials in `src/App/partials/` (`{{> about}}`, `{{> work}}`, `{{> projects}}`, …). Section markup lives in the partials, not in index.html.
- **Entry:** `src/index.js` -> `new App()` (`src/App/App.js`), a singleton that creates the Lenis scroller (driven by its own rAF loop), then instantiates every component and section, passing each the DOM node from `utils/selectors.js` (queried once at import time, so partial IDs/classes must match it).
- **Sections** (`src/App/sections/*`) extend `components/Section.js`, which wraps an `IntersectionObserver` (threshold 0.3) and calls an overridable `onEnter()` once per section and, on desktop (>=650px), locks Lenis scroll to the section; each section imports its own CSS from `src/App/css/` and animates with the Web Animations API / `setTimeout` / rAF using shared keyframes in `utils/constants.js`. `src/style.css` `@import`s the per-section CSS.
- **Work + Projects:** all copy lives in `utils/content.js` (placeholder text until the user supplies real content). `vite.config.js` passes it to Handlebars as `context`, so `partials/work.html` / `projects.html` (+ `project-art-*.html`) render real HTML at build time, and `components/Overlay.js` reads the same module at runtime. Quality bar is the Awards section: scroll-coupled lerped motion (`sp += (p - sp) * 0.2`), perspective depth, pointer tilt, ink-mask wipes with the orange star riding the edge, and the shared `bezier` for big moves.
  - **Work:** `sections/Work.js` (a `Section`: letter wipe, scroll-scrubbed title card, the 3D "drum" ledger rows, accordion), `components/WorkFloor.js` (perspective floor on the title card), `WorkFigure.js` (animated hairline placeholder art), `css/work.css` + `work-fx.css`.
  - **Projects:** `sections/Projects.js` (4 sticky panels, `--i` offsets, `padding-top: var(--nav-h)` on the stack), `components/ProjectFx.js` (reveals, panel depth, rAF loop), `ProjectMedia.js` (tilt, tunnel, cursor dot), `ProjectArt.js` (placeholder art), `Embed.js` (live thumbnails), `css/projects.css` + `projects-fx.css`.
  - **Detail page:** `components/Overlay.js` (shell: history `#projects/<slug>` captured as `app.initialHash` before `resetToTop`, inert page, `scroll.stop()/start()`, `app.isOverlayOpen` guard in `Section._lockScroll`, page-turn between projects) with `OverlayPage.js`, `OverlayFx.js`, `OverlayArt.js`, `css/overlay.css` + `overlay-fx.css`. Mounted on `<body>` at z-index 500 (nav 99, cursor 999).
  - Keep these hooks stable: `.project-panel[data-slug]`, `.project-media`, `.project-open`, the `Embed` API (`new Embed(frame, opts).mount()/.destroy()`), `#work`, `#work-ledger`, `.work-row`.
  - Known pre-existing bug: `Awards` overwrites `Section`'s `this.scroll`, so every Awards intersect logs `this.scroll.scrollTo is not a function` (Awards never scroll-locks). Not fixed on purpose; fixing it would change Awards behaviour.
- **Shared state:** `utils/state.js` (small flag object).
- Animation is hand-rolled (no GSAP in the code), even though GSAP skills are installed (see below).

## Claude skills in this repo

`.claude/skills/` is committed so every cloud session gets them: the GSAP skills (installed via `npx skills add`, tracked in `skills-lock.json`), `frontend-design`, `impeccable` (manual copy, so its design hook/subagents are not enabled), and four from MengTo/Skills (`cinematic-scroll-storytelling`, `staggered-word-reveal`, `masked-reveal`, `marquee-loop`).
