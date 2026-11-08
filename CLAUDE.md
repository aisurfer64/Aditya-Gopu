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

- **Page assembly:** `src/index.html` is a Handlebars template composed of partials in `src/App/partials/` (`{{> about}}`, `{{> works}}`, …). Section markup lives in the partials, not in index.html.
- **Entry:** `src/index.js` -> `new App()` (`src/App/App.js`), a singleton that creates the Lenis scroller (driven by its own rAF loop), then instantiates every component and section, passing each the DOM node from `utils/selectors.js` (queried once at import time, so partial IDs/classes must match it).
- **Sections** (`src/App/sections/*`) extend `components/Section.js`, which wraps an `IntersectionObserver` (threshold 0.3) and calls an overridable `onEnter()` once per section and, on desktop (>=650px), locks Lenis scroll to the section; each section imports its own CSS from `src/App/css/` and animates with the Web Animations API / `setTimeout` / rAF using shared keyframes in `utils/constants.js`. `src/style.css` `@import`s the per-section CSS.
- **Shared state/data:** `utils/state.js` (small flag object), `utils/data.js` (project list rendered by `Projects`, which fills the `.projects-top/middle/bottom` sections).
- Animation is hand-rolled (no GSAP in the code), even though GSAP skills are installed (see below).

## Claude skills in this repo

`.claude/skills/` is committed so every cloud session gets them: the GSAP skills (installed via `npx skills add`, tracked in `skills-lock.json`), `frontend-design`, `impeccable` (manual copy, so its design hook/subagents are not enabled), and four from MengTo/Skills (`cinematic-scroll-storytelling`, `staggered-word-reveal`, `masked-reveal`, `marquee-loop`).
