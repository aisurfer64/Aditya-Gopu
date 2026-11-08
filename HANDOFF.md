# HANDOFF

Written at the end of a Claude Code cloud session. Read this, then `CLAUDE.md` and `DESIGN.md`.

## ⚠️ Check first: are the plugins active?

`.claude/settings.json` enables **Ponytail** and **claude-mem** for this repo, but this was never tested in a fresh session. At the start of the new session:

1. Run `/plugin` and confirm `ponytail@ponytail` and `claude-mem@thedotmack` are listed and enabled. Run `/hooks` to confirm their hooks are registered.
2. **If either is missing or disabled, tell the user immediately**, before doing any other work. Do not silently carry on.
3. Likely causes and fixes: the trust prompt for project marketplaces was declined; the session started from a branch without `.claude/settings.json`; or the install failed. Manual fallback: `/plugin marketplace add DietrichGebert/ponytail` then `/plugin install ponytail@ponytail`, and `/plugin marketplace add thedotmack/claude-mem` then `/plugin install claude-mem`.
4. Run `npx claude-mem doctor` to check claude-mem's worker, Bun and uv. It was installed but its worker was never confirmed to start. Its README describes an optional sign-in; setting `CLAUDE_MEM_ONLINE_OPTIN=false` skips it.
5. Ponytail reported 4 optional settings not yet set: `/plugin configure ponytail@ponytail`.

## What this project is

Aditya Gopu's personal portfolio: vanilla JS/CSS, built with Vite + `vite-plugin-handlebars`, deployed to GitHub Pages from the **repo root** (live: aisurfer64.github.io/Aditya-Gopu). Only runtime dependency is `lenis`. No tests or linter. `npm run build` is destructive: it deletes root `assets/ fonts/ images/ index.html` and copies `dist/*` there, so root files are generated; edit `src/` and `static/`. See `CLAUDE.md` for architecture.

## What is set up

- **Skills** in `.claude/skills/` (committed, project-level):
  - GSAP official: `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-frameworks`, `gsap-performance` (via `npx skills add`; hashes in `skills-lock.json`).
  - `frontend-design` (Anthropic).
  - `impeccable` v4.8.1, manually copied because `impeccable.style` is blocked by the cloud network policy. Its design hook and subagents are **not** installed. On a machine with normal network, `npx impeccable install --providers=claude --scope=project` adds them.
  - From MengTo/Skills: `cinematic-scroll-storytelling`, `staggered-word-reveal`, `masked-reveal`, `marquee-loop` (whole folders including ~11MB of `demo/` assets).
- **Plugins** in `.claude/settings.json`: `ponytail@ponytail` and `claude-mem@thedotmack`, via `extraKnownMarketplaces` + `enabledPlugins`.
- **CLAUDE.md**: done (commands, build quirk, architecture).
- **DESIGN.md**: written and committed as a **draft**; the user has not approved it yet.
- **Not installed on purpose:** FreeLLMAPI (its host `freellmapi.co` is blocked in the cloud environment, and it is a self-hosted Docker gateway, not a skill). The user was told to install it on their own machine if wanted.
- **Agent Reach** and **SkillSpector** were installed earlier in a previous container's home directory only. They do not persist.

## Done vs not done

Done: skills and plugin config installed and committed; CLAUDE.md; DESIGN.md draft; dev server + screenshots verified the site renders (loader, About, Works, Awards, Contact).

**Not done: no UI or code under `src/` has been changed.** Nothing from the DESIGN.md has been applied.

Open decisions on DESIGN.md (see its "Known drift" section) that the user has not answered:
- Retire yellow `#f9cf71` (loader) and purple `#989ec0` (Works), or keep as exceptions? Rule is ONE accent (orange `#fb6f3e`).
- Replace the shared in-out easing `cubic-bezier(0.76,0,0.24,1)` (`src/App/utils/constants.js` and Awards CSS) with `power3.out`/`power4.out`?
- Unify numbered label formats (`00(1)`, `(001)`, `Issue 01`)?
- Keep Fraktion Mono and Bigger Display as Awards-only fonts?
- DESIGN.md should also mention the perspective SVG grid behind the Awards hairline grid.

## Next steps, in order

### 1. Motion upgrade: Lenis + GSAP scroll animations, per DESIGN.md
- First get the user's answers to the decisions above (at least easing and the accent-color question).
- Use the `gsap-scrolltrigger`, `gsap-core`, `gsap-timeline`, `gsap-performance` skills, plus `cinematic-scroll-storytelling` / `masked-reveal` / `staggered-word-reveal` where they fit. Use `impeccable` (`animate`) for design checks.
- Lenis already drives smooth scroll (`App.js`). Connect it to ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)` and drive `gsap.ticker`), and avoid running two rAF loops. `npm install gsap`; GSAP is free including SplitText.
- Motion rules from DESIGN.md: `power3.out` default, `power4.out` for large moves, no bounce/elastic/overshoot, 250–1500ms, respect `prefers-reduced-motion`.
- The current animations are hand-rolled (Web Animations API, `setTimeout`, rAF) and `Section.js` locks scroll to sections on desktop. Decide whether to migrate gradually or section by section; keep the sticky-stack layout.
- **Investigate first:** a headless run logged `this.scroll.scrollTo is not a function` (Lenis 1.3.11; calls in `Section.js`, `Navbar.js`, `Contact.js`, `App.js`). Not diagnosed; may have come from the test script.

### 2. Replace the placeholder Works entries with the user's real projects, as expandable entries
- Current entries are template placeholders in `src/App/utils/data.js` (Persona, Gallery, Edition, Estudio Persona, Third, OSP; images under `static/images/works/<id>/`), rendered by `src/App/sections/Projects.js` into `.projects-top/middle/bottom`.
- Ask the user for their real projects (title, short description, images/video, links) before building; do not invent content.
- Make each entry expandable (title row with `(001)` mono label expands to detail), using the hairline-grid language and no cards/boxes/shadows per DESIGN.md.

## Workflow notes
- Dev server: `npx vite --host 0.0.0.0 --open false` (port 5173). `server.open: true` in `vite.config.js` errors harmlessly in the container. Preview-port reporting may not render in the user's app; screenshots (Playwright is pre-installed) were used instead and sent with `SendUserFile`.
- Commit and push changes; remember `npm run build` output at the repo root is what GitHub Pages serves, so rebuild before deploying.
- GitHub Pages serves the root with `.nojekyll`, so everything committed in the root (including `.claude/`, DESIGN.md, CLAUDE.md) is publicly reachable.
