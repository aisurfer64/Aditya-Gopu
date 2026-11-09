import '../css/overlay.css';
import '../css/overlay-fx.css';
import App from '../App';
import OverlayPage from './OverlayPage';
import { projects } from '../utils/content';
import { pageFrames, bezier, power3out, prefersReducedMotion } from '../utils/constants';
import { Roll, Magnet, band, cancelTweens, inOut, clamp } from './OverlayFx';

const ruleIn = [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fontsReady = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), sleep(700)]);
const ended = a => a.finished.then(() => true, () => false);

/**
 * Full-screen project detail "chapter page". Mounted on <body> at z-index 500 (nav 99, cursor 999).
 * This shell owns what must stay unique: history (#projects/<slug>), focus, inert page, Lenis,
 * keyboard, the bar, and the choreography between the thumbnail and the page. Each project's
 * content lives in an OverlayPage; moving between projects sweeps one page over the other
 * with an ink band (the Awards mask and star).
 */
export default class Overlay {
	constructor() {
		this.app = new App();
		this.root = null;
		this.page = null;
		this.pages = [];
		this.index = -1;
		this.busy = false;
		this.closing = false;
		this.pushed = false;
		this.ptr = null;
		this.magnets = [];

		this.mq = window.matchMedia('(max-width: 750px)');
		this.fineMq = window.matchMedia('(pointer: fine)');
		this.rmq = window.matchMedia('(prefers-reduced-motion: reduce)');

		window.addEventListener('popstate', e => this._onPop(e));
		document.addEventListener('keydown', e => this._onKey(e));
	}

	// ---- public ----------------------------------------------------------

	open(slug, originEl, trigger = null, { fromHistory = false } = {}) {
		const i = projects.findIndex(p => p.slug === slug);
		if (i < 0 || this.root || this.busy) return;

		this.busy = true;
		this.closing = false;
		this.index = i;
		this.trigger = trigger || originEl || null;
		this.mobile = this.mq.matches;

		this._build();
		this._preconnect();
		this.savedY = window.scrollY;
		this.app.isOverlayOpen = true;
		document.dispatchEvent(new CustomEvent('overlay:open', { detail: { slug } }));
		this.app.scroll.stop();
		[...document.body.children].forEach(el => {
			if (el !== this.root && !el.classList.contains('mouse')) el.inert = true;
		});

		if (!fromHistory) {
			history.pushState({ project: slug }, '', `#projects/${slug}`);
			this.pushed = true;
		} else {
			this.pushed = false;
		}

		this._start(this._originRect(originEl, true));
	}

	// Deep link support: App captures the hash before resetToTop strips it.
	openFromHash() {
		const m = (this.app.initialHash || '').match(/^#projects\/([\w-]+)$/);
		if (!m || !projects.some(p => p.slug === m[1])) return;
		history.replaceState({ project: m[1] }, '', this.app.initialHash);
		this.open(m[1], null, null, { fromHistory: true });
	}

	// ---- shell -----------------------------------------------------------

	_build() {
		const root = document.createElement('div');
		root.className = 'overlay';
		root.setAttribute('role', 'dialog');
		root.setAttribute('aria-modal', 'true');
		root.setAttribute('data-lenis-prevent', '');
		root.innerHTML = `
			<span class="ov-trap" tabindex="0" data-trap="start" aria-hidden="true"></span>
			<div class="ov-shell">
				<div class="ov-bar">
					<div class="ov-bar-l"><span class="ov-idx"></span><span class="ov-count"></span></div>
					<div class="ov-nav">
						<button type="button" class="ov-btn" data-ov="prev" data-magnet aria-label="Previous project"><span class="ov-u"><span>‹</span><span class="ov-lab"> Prev</span></span></button>
						<button type="button" class="ov-btn" data-ov="next" data-magnet aria-label="Next project"><span class="ov-u"><span class="ov-lab">Next </span><span>›</span></span></button>
					</div>
					<div class="ov-bar-r"><button type="button" class="ov-btn ov-close" data-ov="close" data-magnet aria-label="Close project"><span class="ov-u">Close ✕</span></button></div>
					<i class="ov-rule"></i>
					<i class="ov-progress"></i>
				</div>
				<div class="ov-main"></div>
			</div>
			<span class="ov-trap" tabindex="0" data-trap="end" aria-hidden="true"></span>`;
		document.body.appendChild(root);
		this.root = root;
		this.shell = root.querySelector('.ov-shell');
		this.bar = root.querySelector('.ov-bar');
		this.main = root.querySelector('.ov-main');
		this.progressEl = root.querySelector('.ov-progress');
		this.ruleEl = root.querySelector('.ov-rule');
		this.idxRoll = new Roll(root.querySelector('.ov-idx'));
		this.countRoll = new Roll(root.querySelector('.ov-count'));
		this.magnets = [...root.querySelectorAll('[data-magnet]')].map(el => new Magnet(el));
		this._lastProgress = -1;

		root.addEventListener('click', e => {
			const go = e.target.closest('[data-ov-go]');
			if (go) {
				e.preventDefault();
				this._go(Number(go.dataset.ovGo));
				return;
			}
			const b = e.target.closest('[data-ov]');
			if (!b) return;
			if (b.dataset.ov === 'close') this._requestClose();
			else this._step(b.dataset.ov === 'next' ? 1 : -1);
		});

		// cursor dot goes paper-white over ink washes (orange dot would vanish into the orange star)
		this._over = e => {
			const t = e.target.closest && e.target.closest('[data-cursor]');
			this.app.mouse.mouse.style.background = t && t.dataset.cursor === 'paper' ? 'var(--white)' : '';
		};
		root.addEventListener('mouseover', this._over);
		root.addEventListener('mouseleave', () => (this.app.mouse.mouse.style.background = ''));

		// Focus stays inside the dialog: Tab past the last stop (a live site's own tab stops come last) wraps to the first
		// (Prev, then Next, Close), Shift+Tab before the first stop lands on the last one.
		root.addEventListener('focusin', e => {
			const t = e.target.closest && e.target.closest('.ov-trap');
			if (!t) return;
			const stops = this._tabStops();
			const to = t.dataset.trap === 'end' ? stops[0] : stops[stops.length - 1];
			if (to) to.focus({ preventScroll: true });
		});
	}

	// DNS + TLS for the live sites' origins while the page is still arriving (once per origin, kept for later opens).
	_preconnect() {
		projects.forEach(p => {
			const u = p.media && p.media.type === 'embed' && p.media.url;
			if (!u) return;
			let origin;
			try {
				origin = new URL(u, location.href).origin;
			} catch {
				return;
			}
			if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
			const l = document.createElement('link');
			l.rel = 'preconnect';
			l.href = origin;
			document.head.appendChild(l);
		});
	}

	_tabStops() {
		return [...this.root.querySelectorAll('a[href], button:not([disabled]), iframe, [tabindex="0"]')].filter(
			el => !el.classList.contains('ov-trap') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'
		);
	}

	_syncBar(dir = 1, animate = true) {
		const p = projects[this.index];
		this.idxRoll.set(`(${p.id})`, dir, animate);
		this.countRoll.set(p.n, dir, animate);
	}

	_barIn(delay) {
		if (this.rmq.matches) return;
		const o = { duration: 800, easing: bezier, fill: 'backwards' };
		this.bar.querySelectorAll('.ov-idx, .ov-count, .ov-nav .ov-btn, .ov-close').forEach((el, i) => el.animate(pageFrames, { ...o, delay: delay + i * 70 }));
		this.ruleEl.animate(ruleIn, { duration: 1200, easing: bezier, fill: 'backwards', delay });
	}

	_originRect(el, mustShow = false) {
		const f = el && (el.querySelector('.frame') || el);
		if (!f) return null;
		const r = f.getBoundingClientRect();
		if (r.width < 8 || r.height < 8) return null;
		if (mustShow && (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth)) return null;
		return r;
	}

	_release() {
		this.busy = false;
		if (this._wantClose) {
			this._wantClose = false;
			this._requestClose();
		}
	}

	// ---- open ------------------------------------------------------------

	async _start(rect) {
		const root = this.root;
		root.style.visibility = 'hidden';
		await fontsReady();
		if (this.root !== root) return;

		const reduced = this.rmq.matches;
		const useRect = !!rect && !reduced;
		const page = new OverlayPage(this.index, { mobile: this.mobile });
		page.mount(this.main, { ghosted: useRect });
		this.page = page;
		this.pages = [page];
		root.setAttribute('aria-labelledby', page.titleId);
		this._syncBar(1, false);
		this._startLoop();

		const D = 1000;
		let win;
		let ghost;
		let edge;

		if (reduced) {
			win = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: power3out });
			page.introText(0);
			page.introFrame(0);
		} else if (useRect) {
			const W = root.clientWidth;
			const H = root.clientHeight;
			const inset = `${rect.top}px ${W - rect.right}px ${H - rect.bottom}px ${rect.left}px`;
			win = root.animate([{ clipPath: `inset(${inset})` }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: D, easing: bezier, fill: 'backwards' });

			edge = document.createElement('i');
			edge.className = 'ov-edge';
			this.shell.appendChild(edge);
			edge.animate(
				[
					{ top: `${rect.top}px`, right: `${W - rect.right}px`, bottom: `${H - rect.bottom}px`, left: `${rect.left}px` },
					{ top: '0px', right: '0px', bottom: '0px', left: '0px' },
				],
				{ duration: D, easing: bezier, fill: 'both' }
			);

			const r1 = page.frameRect();
			ghost = document.createElement('i');
			ghost.className = 'ov-ghost ov-hatch';
			this.shell.appendChild(ghost);
			const px = v => `${v}px`;
			ghost.animate(
				[
					{ left: px(rect.left), top: px(rect.top), width: px(rect.width), height: px(rect.height) },
					{ left: px(r1.left), top: px(r1.top), width: px(r1.width), height: px(r1.height) },
				],
				{ duration: D, easing: bezier, fill: 'both' }
			);

			page.introText(D * 0.42);
			this._barIn(D * 0.4);
		} else {
			// no thumbnail to grow from (deep link): the ink band sweeps the page in
			const tw = band(root, { next: this.shell, dir: 'ltr', width: 0.22, size: 72, duration: D + 150, ease: inOut });
			win = { finished: tw.finished };
			page.introText(D * 0.3);
			page.introFrame(D * 0.7);
			this._barIn(D * 0.2);
		}

		root.style.visibility = '';
		this.root.querySelector('.ov-close').focus({ preventScroll: true });

		const ok = win.finished ? await ended(win) : true;
		if (this.root !== root) return;
		if (edge) edge.remove();
		if (ghost) {
			ghost.remove();
			if (ok) page.introFrame(0);
		}
		this._release();
	}

	// ---- loop (tilt, grid, scroll coupling, magnets, progress) -----------

	_startLoop() {
		if (this._raf) return;
		this._onMove = e => {
			this.prevPtr = this.ptr;
			this.ptr = { x: e.clientX, y: e.clientY, t: e.timeStamp };
			if (this.inSite) this._setInSite(false);
		};
		this._onLeave = () => (this.ptr = null);
		this._onResize = () => {
			this.mobile = this.mq.matches;
			this.pages.forEach(p => p.setMobile(this.mobile));
		};
		window.addEventListener('pointermove', this._onMove, { passive: true });
		document.documentElement.addEventListener('mouseleave', this._onLeave);
		window.addEventListener('resize', this._onResize, { passive: true });

		const loop = () => {
			this._raf = requestAnimationFrame(loop);
			this._tick();
		};
		this._raf = requestAnimationFrame(loop);
	}

	_stopLoop() {
		cancelAnimationFrame(this._raf);
		this._raf = 0;
		window.removeEventListener('pointermove', this._onMove);
		document.documentElement.removeEventListener('mouseleave', this._onLeave);
		window.removeEventListener('resize', this._onResize);
		this._setInSite(false);
		this._setSiteFocus(false);
		this.ptr = this.prevPtr = null;
	}

	// The pointer is over the live site (inferred: the page stopped hearing it right beside the iframe). The cursor dot
	// would be stuck at the frame's edge and the tilt would keep the site skewed, so the dot hides and the frame flattens.
	_setInSite(v) {
		if (v === this.inSite) return;
		this.inSite = v;
		this.app.mouse.mouse.style.opacity = v ? '0' : '';
	}

	// The site has keyboard focus: Escape and the arrows now belong to it, so say how to get them back.
	_setSiteFocus(v) {
		if (v === this.siteFocus) return;
		this.siteFocus = v;
		if (v) this._setInSite(true);
		if (this.page) this.page.setFocusHint(v && this.fineMq.matches);
	}

	_pointerEnteredSite() {
		const f = this.page && this.page.siteFrame();
		const p = this.ptr;
		if (!f || !p || !p.t || this.closing) return false;
		const now = performance.now();
		// events still arriving (the page hears it) means it is not in the site; wait for a short silence
		if (now - p.t < 90 || now - p.t > 1500) return false;
		const r = f.getBoundingClientRect();
		const q = this.prevPtr;
		const dt = q ? Math.max(1, p.t - q.t) : 16;
		const mx = q ? p.x - q.x : 0;
		const my = q ? p.y - q.y : 0;
		const speed = Math.hypot(mx, my) / dt; // px per ms
		const margin = clamp(speed * 48, 14, 96);
		const cx = clamp(p.x, r.left, r.right);
		const cy = clamp(p.y, r.top, r.bottom);
		const gx = cx - p.x;
		const gy = cy - p.y;
		const gap = Math.hypot(gx, gy);
		if (gap > margin) return false;
		// last movement must have been aimed at the frame (or the pointer is already over its box)
		return gap === 0 || mx * gx + my * gy > 0;
	}

	_tick() {
		if (!this.root) return;
		const reduced = this.rmq.matches;
		const fine = this.fineMq.matches;
		// A cross-origin iframe swallows every pointer and key event and the page behind it hears nothing at all (no
		// mouseleave, no :hover), so the site is detected from what we can see: the pointer vanishing at its edge, and
		// document.activeElement being the iframe (a click or Tab into it).
		if (!this.inSite && fine && this._pointerEnteredSite()) this._setInSite(true);
		const sf = this.page && this.page.siteFrame();
		const focused = !!sf && document.activeElement === sf;
		if (focused !== !!this.siteFocus) this._setSiteFocus(focused);
		const ctx = { ptr: this.ptr, fine, reduced, lockTilt: this.closing, inSite: this.inSite };
		let prog = 0;
		this.pages.forEach(p => {
			const v = p.tick(ctx);
			if (p === this.page) prog = v;
		});
		if (prog !== this._lastProgress) {
			this._lastProgress = prog;
			this.progressEl.style.transform = `scaleX(${prog.toFixed(4)})`;
		}
		if (fine && !reduced) {
			const ptr = this.closing ? null : this.ptr;
			this.magnets.forEach(m => m.step(ptr));
			this.pages.forEach(p => p.magnets.forEach(m => m.step(ptr)));
		}
	}

	// ---- between projects -------------------------------------------------

	_step(dir) {
		const n = projects.length;
		this._go((this.index + dir + n) % n, dir);
	}

	async _go(i, dir, { history: useHistory = true } = {}) {
		if (!this.root || this.busy || i === this.index || i < 0 || i >= projects.length) return;
		this.busy = true;
		dir = dir || (i > this.index ? 1 : -1);

		const old = this.page;
		const hadFocus = old && old.el.contains(document.activeElement);
		this.index = i;
		const p = projects[i];
		if (useHistory) history.replaceState({ project: p.slug }, '', `#projects/${p.slug}`);

		const page = new OverlayPage(i, { mobile: this.mobile });
		page.mount(this.main);
		this.pages.push(page);
		this.root.setAttribute('aria-labelledby', page.titleId);
		this._syncBar(dir, !this.rmq.matches);

		// Two live sites must never run at once: the incoming one is only mounted after the outgoing page (and its
		// iframe) is gone, and the turn's frames stay free of the heavy site's startup.
		if (this.rmq.matches) {
			page.introText(0);
			page.introFrame(0, { mount: false });
			await ended(page.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: power3out }));
		} else {
			const rtl = dir > 0; // next: the band travels right to left, like a page turned forward
			const sign = rtl ? -1 : 1;
			this.main.classList.add('is-turning');
			page.introText(rtl ? 640 : 160);
			page.introFrame(rtl ? 260 : 640, { mount: false });
			const spin = (el, v) => (el.style.transform = v);
			const t = band(this.main, {
				old: old.el,
				next: page.el,
				dir: rtl ? 'rtl' : 'ltr',
				width: 0.2,
				size: 72,
				duration: 1150,
				onProgress: k => {
					spin(old.inner, `perspective(1800px) translate3d(${(sign * k * 5).toFixed(3)}%, 0, 0) rotateY(${(-sign * k * 8).toFixed(3)}deg)`);
					spin(page.inner, `perspective(1800px) translate3d(${(-sign * (1 - k) * 5).toFixed(3)}%, 0, 0) rotateY(${(sign * (1 - k) * 8).toFixed(3)}deg)`);
				},
			});
			await ended(t);
			page.inner.style.transform = '';
		}

		old.destroy();
		this.pages = this.pages.filter(x => x !== old);
		this.page = page;
		this.main.classList.remove('is-turning');
		this._setSiteFocus(false);
		this._setInSite(false);
		// the new frame's own reveal may still be running when the band has passed: start the site once it is done
		page.startEmbed();
		if (hadFocus) page.text.focus({ preventScroll: true });
		this._release();
	}

	// ---- closing ---------------------------------------------------------

	_requestClose() {
		if (!this.root) return;
		if (this.busy) {
			this._wantClose = true;
			return;
		}
		if (this.pushed && history.state && history.state.project) this._back();
		else this._close();
	}

	// history.back() walks the joint session history, and a live site that navigates one of its own frames (the 3D viewer
	// does) adds entries there: the back is then spent inside the iframe and the overlay stays open. So walk to the page's
	// own previous entry with the Navigation API (it lists top-level entries only) and never trust a back that produced
	// no popstate: if none arrives, close directly.
	_back() {
		let popped = false;
		const on = () => (popped = true);
		window.addEventListener('popstate', on, { once: true });
		let used = false;
		try {
			const nav = window.navigation;
			if (nav && nav.entries && nav.currentEntry) {
				const prev = nav.entries()[nav.currentEntry.index - 1];
				if (prev && !/#projects\//.test(prev.url)) {
					const t = nav.traverseTo(prev.key);
					if (t) {
						t.committed.catch(() => {});
						t.finished.catch(() => {});
					}
					used = true;
				}
			}
		} catch {}
		if (!used) history.back();
		setTimeout(() => {
			window.removeEventListener('popstate', on);
			if (!popped && this.root && !this.closing && !this.busy) this._close();
		}, 700);
	}

	async _close() {
		if (!this.root || this.busy) return;
		this.busy = true;
		this.closing = true;
		const root = this.root;
		const page = this.page;

		// Give the page back first so the thumbnail is measured in its natural layout.
		this.app.scroll.start();
		if (Math.abs(window.scrollY - this.savedY) > 1) {
			this.app.scroll.scrollTo(this.savedY, { immediate: true, force: true });
		}

		const slug = projects[this.index].slug;
		const origin = document.querySelector(`.project-panel[data-slug="${slug}"] .project-media`);
		const rect = this._originRect(origin, true);

		cancelTweens();
		root.getAnimations({ subtree: true }).forEach(a => a.cancel());

		if (this.rmq.matches) {
			await ended(root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: power3out, fill: 'forwards' }));
		} else if (rect) {
			await this._closeToRect(root, page, rect);
		} else {
			const t = band(root, { old: this.shell, dir: 'ltr', width: 0.22, size: 72, duration: 1000, keep: true });
			page.outro();
			await ended(t);
		}

		this._teardown();
	}

	async _closeToRect(root, page, rect) {
		const W = root.clientWidth;
		const H = root.clientHeight;
		const D = 880;
		const px = v => `${v}px`;

		page.outro();
		await sleep(340);
		if (this.root !== root) return;

		// the real frame hands over to a hatch ghost that shrinks back into the thumbnail
		const r1 = page.frameRect();
		r1.left += page.dx || 0;
		r1.top += page.dy || 0;
		page.setGhosted(true);
		const ghost = document.createElement('i');
		ghost.className = 'ov-ghost ov-hatch';
		this.shell.appendChild(ghost);
		ghost.animate(
			[
				{ left: px(r1.left), top: px(r1.top), width: px(r1.width), height: px(r1.height) },
				{ left: px(rect.left), top: px(rect.top), width: px(rect.width), height: px(rect.height) },
			],
			{ duration: D, easing: bezier, fill: 'forwards' }
		);

		const edge = document.createElement('i');
		edge.className = 'ov-edge';
		this.shell.appendChild(edge);
		edge.animate(
			[
				{ top: '0px', right: '0px', bottom: '0px', left: '0px' },
				{ top: px(rect.top), right: px(W - rect.right), bottom: px(H - rect.bottom), left: px(rect.left) },
			],
			{ duration: D, easing: bezier, fill: 'forwards' }
		);

		const inset = `${rect.top}px ${W - rect.right}px ${H - rect.bottom}px ${rect.left}px`;
		const win = root.animate([{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: `inset(${inset})` }], { duration: D, easing: bezier, fill: 'forwards' });
		await ended(win);
	}

	_teardown() {
		const root = this.root;
		if (!root) return;
		this._stopLoop();
		this.pages.forEach(p => p.destroy());
		this.pages = [];
		this.page = null;
		this.magnets.forEach(m => m.reset());
		this.magnets = [];
		root.remove();
		this.root = null;
		this.app.mouse.mouse.style.background = '';
		[...document.body.children].forEach(el => (el.inert = false));

		// a deep link has no history entry of our own to pop (and a back spent inside an iframe leaves the hash): drop it
		if (/^#projects\//.test(location.hash)) {
			history.replaceState(null, '', location.pathname + location.search);
		}

		this.app.scroll.start();
		document.dispatchEvent(new CustomEvent('overlay:close'));
		setTimeout(() => (this.app.isOverlayOpen = false), 200);
		if (this.trigger && this.trigger.focus) this.trigger.focus({ preventScroll: true });
		this.closing = false;
		this.busy = false;
		this._wantClose = false;
	}

	_onPop(e) {
		const slug = e.state && e.state.project;
		if (slug) {
			if (!this.root) this.open(slug, null, null, { fromHistory: true });
			else {
				const i = projects.findIndex(p => p.slug === slug);
				if (i >= 0 && i !== this.index) this._go(i, undefined, { history: false });
			}
		} else if (this.root) {
			if (this.busy) this._wantClose = true;
			else this._close();
		}
	}

	_onKey(e) {
		if (!this.root) return;
		if (e.key === 'Escape') this._requestClose();
		else if (this.page && this.page.poster && !this.closing && this.page.poster.handleKey(e)) e.preventDefault();
		else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			if (e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('pre, input, textarea, [contenteditable], iframe'))) return;
			// the live site is focused: its arrows are its own (orbit, carousel...), not a page turn
			if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
			this._step(e.key === 'ArrowRight' ? 1 : -1);
		}
	}
}
