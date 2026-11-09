import {
	bezier,
	pageFrames,
	power3out,
	prefersReducedMotion,
} from '../utils/constants';
import ProjectMedia from './ProjectMedia';
import { createArt } from './ProjectArt';

const clamp01 = t => Math.max(0, Math.min(1, t));

const wipeFrames = [
	{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
	{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' },
];

const riseFrames = [
	{ opacity: 0, transform: 'translateY(18px)' },
	{ opacity: 1, transform: 'none' },
];

/**
 * Motion layer for the Projects stack. Everything here is hand-rolled (Web Animations API + one rAF loop).
 *  - Reveal: per-letter pageFrames wipes, an ink mask wipe with the orange star riding the edge,
 *    hairlines that draw in, placeholder art that draws itself (CSS) once a panel becomes `.is-in`.
 *  - Depth: a lerped, scroll-coupled 3D recede of each panel while the next one slides over it
 *    (the Awards `sp += (p - sp) * 0.2` idea), plus a lag-and-settle parallax as a panel arrives.
 *  - Media: pointer tilt, tunnel parallax and cursor dot live in ProjectMedia; art loops in ProjectArt.
 * Reduced motion: nothing is armed, no loop runs, art settles into a still composition.
 */
export default class ProjectFx {
	constructor(projects) {
		this.projects = projects;
		this.root = projects.element;
		this.panels = projects.panels;
		this.app = projects.app;
		this.reduced = prefersReducedMotion();
		this.mobileMq = window.matchMedia('(width <= 750px)');
		const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

		this.state = this.panels.map(() => ({ e: 0, r: 0, covered: false, parked: false, written: '' }));
		this.inView = false;
		this._raf = null;
		this.awardsEl = document.getElementById('awards');

		this.parts = this.panels.map(panel => this._prepare(panel));
		this.media = this.panels.map(
			panel => new ProjectMedia(panel, this.app, { tilt: fine && !this.reduced })
		);
		this.arts = this.panels.map(panel => {
			const frame = panel.querySelector('.frame');
			return frame ? createArt(frame) : null;
		});

		// stagger index for the CSS draw-ins of the placeholder art
		this.panels.forEach(panel => {
			panel.querySelectorAll('.pm-art i, .pm-art h6, .pm-art figcaption').forEach((el, k) => {
				if (!el.classList.contains('pp-focus') && !el.classList.contains('pp-scan')) {
					el.style.setProperty('--k', Math.min(k, 46));
				}
			});
		});

		window.addEventListener('resize', () => this._onResize(), { passive: true });

		// the art can only be measured once the section is displayed (and again whenever its frame resizes)
		this.artObserver = new ResizeObserver(entries =>
			entries.forEach(entry => {
				const i = this.arts.findIndex(a => a && a.art === entry.target);
				if (i >= 0) this.arts[i].measure();
			})
		);
		this.arts.forEach(a => a && this.artObserver.observe(a.art));

		if (this.reduced) {
			this.arts.forEach(a => a && a.settle());
			this.media.forEach(m => {
				m.measure();
				m.draw();
			});
			return;
		}

		this.root.classList.add('is-armed');
		this._initReveal();
		this._initActive();
		this.media.forEach(m => m.draw());
	}

	// ---- text prep -------------------------------------------------------

	_split(el) {
		const text = el.textContent.trim();
		el.setAttribute('aria-label', text);
		el.textContent = '';
		const words = text.split(/\s+/);
		words.forEach((word, wi) => {
			const w = document.createElement('span');
			w.className = 'pl-word';
			w.setAttribute('aria-hidden', 'true');
			[...word].forEach(ch => {
				const c = document.createElement('span');
				c.className = 'pl-char';
				c.textContent = ch;
				w.appendChild(c);
			});
			el.appendChild(w);
			if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
		});
		return [...el.querySelectorAll('.pl-char')];
	}

	_prepare(panel) {
		const q = {
			heading: [],
			title: [],
			num: [],
			cap: panel.querySelector('.pn-cap'),
		};

		const heading = panel.querySelector('.projects-heading');
		if (heading) q.heading = this._split(heading);
		q.title = this._split(panel.querySelector('.project-title'));

		// the huge numeral comes from the strip's "01 / 04"
		const numEl = panel.querySelector('.project-num');
		const n = panel.querySelector('.project-n');
		const m = n && n.textContent.match(/(\d+)\s*\/\s*(\d+)/);
		if (numEl && m) {
			numEl.innerHTML = `<span class="pn-d"></span><span class="pn-cap">(of ${m[2]})</span>`;
			const d = numEl.querySelector('.pn-d');
			d.textContent = m[1];
			q.num = this._split(d);
			q.cap = numEl.querySelector('.pn-cap');
		} else if (numEl) {
			numEl.remove();
		}

		panel.querySelectorAll('.ps-t').forEach((el, k) => el.style.setProperty('--k', k));

		q.summary = panel.querySelector('.project-summary');
		q.tag = panel.querySelector('.project-tag');
		q.open = panel.querySelector('.project-meta .hover');
		q.inner = panel.querySelector('.project-inner');
		q.wipe = panel.querySelector('.pm-wipe');
		return q;
	}

	// ---- reveal ----------------------------------------------------------

	_initReveal() {
		this.revealObserver = new IntersectionObserver(
			entries =>
				entries.forEach(entry => {
					if (!entry.isIntersecting) return;
					const panel = entry.target;
					// while the nav is travelling, wait: the wipe should play where the user lands
					if (this.app.isNavigating || !this.app.isReady) {
						setTimeout(() => {
							this.revealObserver.unobserve(panel);
							this.revealObserver.observe(panel);
						}, 280);
						return;
					}
					this.revealObserver.unobserve(panel);
					this._reveal(panel);
				}),
			{ threshold: 0.18 }
		);
		this.panels.forEach(p => this.revealObserver.observe(p));
	}

	_play(el, frames, options) {
		if (!el) return null;
		const anim = el.animate(frames, { fill: 'both', ...options });
		// the end state equals the natural state, so drop the animation instead of holding a layer
		anim.finished.then(() => anim.cancel()).catch(() => {});
		return anim;
	}

	_reveal(panel) {
		const i = this.panels.indexOf(panel);
		const q = this.parts[i];
		panel.classList.add('is-in');

		q.heading.forEach((c, k) =>
			this._play(c, pageFrames, { duration: 900, easing: bezier, delay: 80 + k * 28 })
		);
		q.title.forEach((c, k) =>
			this._play(c, pageFrames, { duration: 900, easing: bezier, delay: 220 + k * 26 })
		);
		q.num.forEach((c, k) =>
			this._play(c, pageFrames, { duration: 900, easing: bezier, delay: 560 + k * 70 })
		);
		this._play(q.summary, pageFrames, { duration: 1000, easing: bezier, delay: 520 });
		this._play(q.cap, riseFrames, { duration: 800, easing: power3out, delay: 760 });
		this._play(q.tag, riseFrames, { duration: 800, easing: power3out, delay: 820 });
		this._play(q.open, riseFrames, { duration: 800, easing: power3out, delay: 900 });

		// ink mask wipes off to the right with the orange star riding its edge (Awards pattern)
		if (q.wipe) {
			const ink = q.wipe.querySelector('.pm-wipe-ink');
			const rail = q.wipe.querySelector('.pm-wipe-rail');
			const opts = { duration: 1300, easing: bezier, delay: 120, fill: 'forwards' };
			const a = ink.animate(wipeFrames, opts);
			rail.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], opts);
			a.finished.then(() => q.wipe.remove()).catch(() => {});
		}

		const art = this.arts[i];
		if (art) art.begin(performance.now());
	}

	// ---- visibility gating -----------------------------------------------

	_initActive() {
		this.nearObserver = new IntersectionObserver(
			entries =>
				entries.forEach(entry => entry.target.classList.toggle('is-near', entry.isIntersecting)),
			{ rootMargin: '10% 0px' }
		);
		this.panels.forEach(p => this.nearObserver.observe(p));

		this.viewObserver = new IntersectionObserver(
			entries => {
				this.inView = entries.some(e => e.isIntersecting);
				if (this.inView) this._start();
			},
			{ rootMargin: '15% 0px' }
		);
		this.viewObserver.observe(this.root);
	}

	_onResize() {
		this.navH = 0; // re-read next frame (--nav-h follows the header height)
		this.media.forEach(m => m.measure());
		this.arts.forEach(a => a && a.measure());
	}

	_start() {
		if (this._raf) return;
		this._raf = requestAnimationFrame(t => this._tick(t));
	}

	// ---- the loop --------------------------------------------------------

	_tick(now) {
		this._raf = null;
		if (!this.inView) return;
		this._raf = requestAnimationFrame(t => this._tick(t));
		if (this.app.isOverlayOpen) return;

		const vh = window.innerHeight || 800;
		const mobile = this.mobileMq.matches;
		const navH = this.navH || (this.navH = parseFloat(getComputedStyle(this.root).paddingTop) || 58);
		const strip = 34;
		const n = this.panels.length;

		// reads first
		const tops = this.panels.map(p => p.getBoundingClientRect().top);
		const awardsTop = this.awardsEl ? this.awardsEl.getBoundingClientRect().top : vh * 2;

		const targetE = tops.map((top, i) => clamp01((vh - top) / (vh - (navH + i * strip))));
		const targetR = targetE.map((_, i) =>
			i < n - 1 ? targetE[i + 1] : clamp01((vh - awardsTop) / (vh * 0.9))
		);

		// then lerp + writes
		for (let i = 0; i < n; i++) {
			const s = this.state[i];
			s.e += (targetE[i] - s.e) * 0.2;
			s.r += (targetR[i] - s.r) * 0.2;
			if (Math.abs(targetE[i] - s.e) < 0.0005) s.e = targetE[i];
			if (Math.abs(targetR[i] - s.r) < 0.0005) s.r = targetR[i];

			this._applyDepth(i, mobile);

			const panel = this.panels[i];

			// Live thumbnails: a site is paused once the next panel has buried it, and woken a hair before it is exposed
			// again. Judged on the raw target (not the smoothed value), so a jump in scroll never leaves one asleep in view.
			const park = !mobile && (s.parked ? targetR[i] > 0.96 : targetR[i] > 0.995);
			if (park !== s.parked) {
				s.parked = park;
				this.projects.setCovered(panel, park);
			}

			const covered = !mobile && s.r > 0.995 && i < n;
			if (covered !== s.covered) {
				s.covered = covered;
				panel.classList.toggle('is-covered', covered);
			}

			if (covered || !panel.classList.contains('is-near')) continue;
			this.media[i].tick((s.e + s.r) / 2, !mobile);

			const art = this.arts[i];
			if (art && panel.classList.contains('is-in')) art.update(now);
		}
	}

	// A panel is a physical layer: it arrives lagging a little, then recedes (tilts back, shrinks, drifts up)
	// as the next layer slides over it.
	_applyDepth(i, mobile) {
		const s = this.state[i];
		const inner = this.parts[i].inner;
		if (mobile) {
			if (s.written !== '') {
				inner.style.transform = '';
				s.written = '';
			}
			return;
		}
		const lag = (1 - s.e) * 56;
		const r = s.r;
		const t = `perspective(1400px) translate3d(0, ${lag.toFixed(2)}px, ${(-r * 110).toFixed(2)}px) rotateX(${(-r * 3).toFixed(3)}deg)`;
		if (t === s.written) return;
		s.written = t;
		inner.style.transform = Math.abs(lag) < 0.01 && r < 0.0005 ? '' : t;
	}
}
