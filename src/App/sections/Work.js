import '../css/work.css';
import '../css/work-fx.css';
import Section from '../components/Section';
import WorkFloor from '../components/WorkFloor';
import { figureMarkup, FIGURE_COUNT } from '../components/WorkFigure';
import { elementOptions, pageFrames, power3out, prefersReducedMotion } from '../utils/constants';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
	const t = clamp((v - a) / (b - a));
	return t * t * (3 - 2 * t);
};

// JS twin of the shared cubic-bezier(0.76, 0, 0.24, 1), for the scroll/time-coupled values.
function bezierEase(x1, y1, x2, y2) {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	return x => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let lo = 0;
		let hi = 1;
		let t = x;
		for (let i = 0; i < 24; i++) {
			const sx = ((ax * t + bx) * t + cx) * t;
			if (sx < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return ((ay * t + by) * t + cy) * t;
	};
}
const BEZ = bezierEase(0.76, 0, 0.24, 1);

const SIDE = {
	l: 'inset(0px 100% 0px 0px)',
	r: 'inset(0px 0px 0px 100%)',
	t: 'inset(0px 0px 100% 0px)',
	b: 'inset(100% 0px 0px 0px)',
};
const FULL = 'inset(0px 0px 0px 0px)';

const make = (tag, cls, text) => {
	const node = document.createElement(tag);
	if (cls) node.className = cls;
	if (text !== undefined) node.textContent = text;
	return node;
};

export default class Work extends Section {
	constructor(element) {
		super(element);

		this.reduced = prefersReducedMotion();
		this.compactMq = window.matchMedia('(max-width: 750px)');
		this.fineMq = window.matchMedia('(hover: hover) and (pointer: fine)');

		this.sy = window.scrollY;
		this.dirty = true;
		this.live = new Set();
		this._raf = null;
		this._enterToken = 0;
		this.pen = { running: false, t0: 0 };
		this.mouseAt = { x: 0, y: 0, inside: false };
		this.look = { x: 0, y: 0, amt: 0 };
		this.lastOrigin = null;
		this.lastLarge = '';

		this._initTitle();
		this._initLedger();
		this._initLoop();
	}

	/* ------------------------------------------------------------------ */
	/* Title card                                                          */
	/* ------------------------------------------------------------------ */

	_initTitle() {
		this.wrapper = this.element.closest('.work-wrapper');
		this.floor = new WorkFloor(this.element.querySelector('.work-floor'));
		this.penEl = this.element.querySelector('.work-pen');
		this.large = this.element.querySelector('.work-large');
		this.flex = this.element.querySelector('.work-flex');
		this.letters = Array.from(this.element.querySelectorAll('.work-letters'));
		this.stars = Array.from(this.wrapper.querySelectorAll('.work-star'));
		this.letterX = this.letters.map(() => 0);
		this.letterStr = this.letters.map(() => ['', '']);

		if (this.reduced) {
			this.letters.forEach(letter => (letter.style.opacity = 1));
			this.floor.svg.style.clipPath = 'inset(0 0% 0 0)';
		}
	}

	_setInitialState() {
		this.letters.forEach(letter => (letter.style.opacity = this.reduced ? 1 : 0));
	}

	_animateLetters() {
		if (this.reduced) return;
		const options = { ...elementOptions, duration: 1200 };
		this.letters.forEach((letter, index) => {
			setTimeout(() => {
				letter.style.opacity = 1;
				letter.animate(pageFrames, options);
			}, 100 + index * 70);
		});
	}

	// Play the entrance only once the card is actually on screen (nav clicks call onEnter at click time).
	_whenVisible(token, cb, tries = 0) {
		if (token !== this._enterToken) return;
		const top = this.element.getBoundingClientRect().top;
		if (top < window.innerHeight * 0.6 || tries > 300) {
			cb();
			return;
		}
		requestAnimationFrame(() => this._whenVisible(token, cb, tries + 1));
	}

	onEnter() {
		this._setInitialState();
		const token = ++this._enterToken;
		this._whenVisible(token, () => {
			this._animateLetters();
			this._startPen();
		});
		this.dirty = true;
		this._wake();
	}

	_startPen() {
		if (this.reduced) return;
		this.pen.running = true;
		this.pen.t0 = performance.now() + 120;
		this._wake();
	}

	/* ------------------------------------------------------------------ */
	/* Ledger                                                              */
	/* ------------------------------------------------------------------ */

	_initLedger() {
		this.ledger = document.getElementById('work-ledger');
		this.rowsEl = this.ledger.querySelector('.work-rows');
		this.bar = this.ledger.querySelector('.work-bar');
		this.rowData = Array.from(this.ledger.querySelectorAll('.work-row')).map((row, i) =>
			this._initRow(row, i)
		);
		this._initReveal();
	}

	_initRow(row, i) {
		const head = row.querySelector('.work-head');
		const panel = row.querySelector('.work-panel');
		const d = {
			row,
			head,
			panel,
			i,
			wash: row.querySelector('.work-wash'),
			cell: row.querySelector('.work-cell'),
			toggle: row.querySelector('.work-toggle'),
			stage: row.querySelector('.work-stage'),
			fig: row.querySelector('.work-fig'),
			figSize: '',
			tilt: { x: 0, y: 0, tx: 0, ty: 0 },
			stageStr: '',
			hover: false,
			focus: false,
			washOn: false,
			cursorTimer: 0,
			flat: 0,
			last: '',
			m: { top: 0, h: 0 },
		};

		panel.inert = true;

		this._splitTitle(row.querySelector('.work-title'));
		this._buildOdometer(row.querySelector('.work-idx'));
		let offset = 0;
		row.querySelectorAll('.work-teaser, .work-text').forEach(p => {
			offset += this._splitWords(p, offset);
		});
		row.querySelectorAll('.work-facts div').forEach((div, k) => div.style.setProperty('--f', k));

		head.addEventListener('click', () => this._toggle(d));
		head.addEventListener('pointerdown', () => row.classList.add('is-press'));
		['pointerup', 'pointercancel', 'pointerleave'].forEach(type =>
			head.addEventListener(type, () => row.classList.remove('is-press'))
		);
		head.addEventListener('pointerenter', e => this._hoverIn(d, e));
		head.addEventListener('pointerleave', e => this._hoverOut(d, e));
		head.addEventListener('focus', () => {
			if (!head.matches(':focus-visible')) return;
			d.focus = true;
			this._syncWash(d, 'l');
		});
		head.addEventListener('blur', () => {
			d.focus = false;
			this._syncWash(d, 'l');
		});

		if (d.cell) {
			d.cell.addEventListener('pointermove', e => this._tiltMove(d, e));
			d.cell.addEventListener('pointerleave', () => {
				d.tilt.tx = 0;
				d.tilt.ty = 0;
			});
		}

		return d;
	}

	_splitTitle(el) {
		if (!el) return;
		const text = el.textContent.trim();
		el.textContent = '';
		const vis = make('span', 'work-vis');
		vis.setAttribute('aria-hidden', 'true');
		let c = 0;
		text.split(/\s+/).forEach((word, wi, words) => {
			const w = make('span', 'work-word');
			[...word].forEach(ch => {
				const char = make('span', 'work-char');
				char.style.setProperty('--c', c++);
				const inner = make('span', 'work-in');
				const roll = make('span', 'work-roll');
				roll.append(make('i', '', ch), make('i', '', ch));
				inner.append(roll);
				char.append(inner);
				w.append(char);
			});
			vis.append(w);
			if (wi < words.length - 1) vis.append(' ');
		});
		el.append(make('span', 'work-sr', text), vis);
	}

	// (001) -> three digit reels that spin to rest, parentheses static.
	_buildOdometer(el) {
		if (!el) return;
		const text = el.textContent.trim();
		el.textContent = '';
		const odo = make('span', 'work-odo');
		odo.setAttribute('aria-hidden', 'true');
		let p = 0;
		[...text].forEach(ch => {
			if (!/\d/.test(ch)) {
				odo.append(ch);
				return;
			}
			const dig = make('span', 'work-dig');
			const reel = make('span', 'work-reel');
			reel.style.setProperty('--n', 10 + Number(ch));
			reel.style.setProperty('--p', p++);
			for (let k = 0; k < 20; k++) reel.append(make('b', '', String(k % 10)));
			dig.append(reel);
			odo.append(dig);
		});
		el.append(make('span', 'work-sr', text), odo);
	}

	_splitWords(p, offset = 0) {
		const words = p.textContent.trim().split(/\s+/).filter(Boolean);
		p.textContent = '';
		words.forEach((word, i) => {
			const mask = make('span', 'ww');
			const inner = make('span', 'wi', word);
			inner.style.setProperty('--w', Math.min(offset + i, 18));
			mask.append(inner);
			p.append(mask);
			if (i < words.length - 1) p.append(' ');
		});
		return words.length;
	}

	_initReveal() {
		const rows = this.rowData.map(d => d.row);

		if (this.reduced) {
			rows.forEach(row => row.classList.add('is-revealed', 'is-live'));
			this.ledger.classList.add('is-live');
			return;
		}

		// one-shot reveal, staggered when several rows arrive in the same observation
		this.revealIO = new IntersectionObserver(
			entries => {
				entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => rows.indexOf(a.target) - rows.indexOf(b.target))
					.forEach((entry, n) => {
						entry.target.style.setProperty('--d', `${n * 140}ms`);
						entry.target.classList.add('is-revealed');
						this.revealIO.unobserve(entry.target);
					});
			},
			{ threshold: 0.18 }
		);
		rows.forEach(row => this.revealIO.observe(row));

		// line-art only moves while its row is near the viewport
		this.liveIO = new IntersectionObserver(
			entries => entries.forEach(entry => entry.target.classList.toggle('is-live', entry.isIntersecting)),
			{ rootMargin: '25% 0px' }
		);
		rows.forEach(row => this.liveIO.observe(row));

		this.barIO = new IntersectionObserver(
			entries => entries.forEach(entry => this.ledger.classList.toggle('is-live', entry.isIntersecting || entry.boundingClientRect.top < 0)),
			{ threshold: 0 }
		);
		this.barIO.observe(this.ledger);
	}

	/* ---------- accordion ---------- */

	_toggle(d) {
		const willOpen = !d.row.classList.contains('is-open');
		this.rowData.forEach(o => this._setOpen(o, false));
		if (willOpen) {
			this._setOpen(d, true);
			this._bringIntoView(d);
			this._burst(d);
		}
		this.dirty = true;
		this._wake();
	}

	_setOpen(d, open) {
		if (d.row.classList.contains('is-open') === open) return;
		d.row.classList.toggle('is-open', open);
		d.head.setAttribute('aria-expanded', String(open));
		d.panel.inert = !open;
		this._syncWash(d, 'l');
	}

	// After opening, make sure the head clears the sticky bar and as much of the panel as fits is on screen.
	_bringIntoView(d) {
		if (!this.scroll || typeof this.scroll.scrollTo !== 'function') return;
		this._measure();
		const heads = this.rowData.map(o => o.head.offsetHeight);
		const before = heads.slice(0, d.i).reduce((sum, h) => sum + h, 0);
		const rowsDocTop = this.rowsEl.getBoundingClientRect().top + window.scrollY;
		const top = rowsDocTop + before;
		const bottom = top + heads[d.i] + d.panel.querySelector('.work-panel-inner').scrollHeight;
		const y = window.scrollY;
		const hi = top - (this.navH + this.barH + 2);
		const lo = bottom - (this.vh - 24);
		const target = Math.min(Math.max(y, lo), hi);
		if (Math.abs(target - y) < 4) return;
		this.scroll.scrollTo(target, { duration: 1.2 });
	}

	// A short fan of orange stars thrown from the toggle (the Awards smiley burst, in this site's own glyph).
	_burst(d) {
		if (this.reduced || !d.toggle) return;
		const n = this.compactMq.matches ? 5 : 9;
		let alive = n;
		d.row.classList.add('is-bursting');
		for (let i = 0; i < n; i++) {
			const bit = make('i', 'work-bit');
			const size = 9 + Math.random() * 11;
			bit.style.width = bit.style.height = `${size.toFixed(1)}px`;
			d.toggle.append(bit);

			const angle = -Math.PI * (0.42 + Math.random() * 0.56);
			const speed = 110 + Math.random() * 190;
			const vx = Math.cos(angle) * speed;
			const vy = Math.sin(angle) * speed;
			const dur = 1100 + Math.random() * 700;
			const spin = (Math.random() * 2 - 1) * 420;
			const frames = [];
			for (let k = 0; k <= 12; k++) {
				const u = k / 12;
				const t = u * (dur / 1000);
				const x = vx * t;
				const y = vy * t + 0.5 * 560 * t * t;
				frames.push({
					transform: `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(spin * u).toFixed(0)}deg) scale(${(1 - u * 0.55).toFixed(2)})`,
					opacity: u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35,
					offset: u,
				});
			}
			const anim = bit.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });
			anim.onfinish = () => {
				bit.remove();
				if (--alive === 0) d.row.classList.remove('is-bursting');
			};
		}
	}

	/* ---------- hover wash (directional) + cursor ---------- */

	_side(d, e) {
		const r = d.head.getBoundingClientRect();
		const dist = {
			l: e.clientX - r.left,
			r: r.right - e.clientX,
			t: e.clientY - r.top,
			b: r.bottom - e.clientY,
		};
		return Object.keys(dist).reduce((best, k) => (dist[k] < dist[best] ? k : best), 'l');
	}

	_hoverIn(d, e) {
		if (e.pointerType !== 'mouse') return;
		d.hover = true;
		this._syncWash(d, this._side(d, e));
		this._cursor(d, true);
	}

	_hoverOut(d, e) {
		if (e.pointerType !== 'mouse') return;
		d.hover = false;
		this._syncWash(d, this._side(d, e));
		this._cursor(d, false);
	}

	_syncWash(d, side) {
		const want = d.hover || d.focus || d.row.classList.contains('is-open');
		if (want === d.washOn) return;
		d.washOn = want;
		const wash = d.wash;
		if (!wash) return;
		const running = wash.getAnimations();
		const from = running.length ? getComputedStyle(wash).clipPath : want ? SIDE[side] : FULL;
		running.forEach(a => a.cancel());
		wash.animate([{ clipPath: from }, { clipPath: want ? FULL : SIDE[side] }], {
			duration: this.reduced ? 0 : want ? 640 : 500,
			easing: power3out,
			fill: 'forwards',
		});
	}

	// Same device as Contact.js (the dot changes colour over the field), but over ink it inverts
	// instead of going white, so it stays visible over both the paper cell and the black wash.
	_cursor(d, on) {
		const dot = this.app.mouse && this.app.mouse.mouse;
		if (!dot) return;
		clearTimeout(d.cursorTimer);
		if (on) {
			dot.style.background = 'var(--white)';
			d.cursorTimer = setTimeout(() => (dot.style.mixBlendMode = 'difference'), 320);
		} else {
			dot.style.mixBlendMode = '';
			dot.style.background = 'var(--orange)';
		}
	}

	/* ---------- cell tilt ---------- */

	_tiltMove(d, e) {
		if (e.pointerType !== 'mouse' || this.reduced || this.compactMq.matches) return;
		const r = d.cell.getBoundingClientRect();
		const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
		const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
		d.tilt.tx = -ny * 13;
		d.tilt.ty = nx * 13;
	}

	/* ------------------------------------------------------------------ */
	/* Loop                                                                */
	/* ------------------------------------------------------------------ */

	_initLoop() {
		const io = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						this.live.add(entry.target);
					} else {
						this.live.delete(entry.target);
						if (entry.target === this.rowsEl) this._resetRows();
					}
				});
				this._wake();
			},
			{ rootMargin: '8% 0px' }
		);
		io.observe(this.element);
		io.observe(this.rowsEl);

		const dirty = () => {
			this.dirty = true;
			this._wake();
		};
		window.addEventListener('resize', dirty, { passive: true });
		window.addEventListener('scroll', () => this._wake(), { passive: true });

		if (typeof ResizeObserver !== 'undefined') {
			const ro = new ResizeObserver(dirty);
			ro.observe(this.element);
			this.rowData.forEach(d => ro.observe(d.row));
		}

		if (!this.reduced) {
			window.addEventListener(
				'pointermove',
				e => {
					if (e.pointerType !== 'mouse') return;
					this.mouseAt.x = e.clientX;
					this.mouseAt.y = e.clientY;
					this._wake();
				},
				{ passive: true }
			);
		}
	}

	// Off screen the drum rests flat, so reveal observers and layout reads never see a stale 3D pose.
	_resetRows() {
		this.lastOrigin = null;
		this.rowData.forEach(d => {
			d.row.style.transform = '';
			d.last = '';
		});
	}

	_wake() {
		if (this._raf || !this.live.size) return;
		this._raf = requestAnimationFrame(now => this._frame(now));
	}

	_frame(now) {
		this._raf = null;
		if (!this.live.size) return;
		this._tick(now);
		if (!this.reduced || this.dirty) this._wake();
	}

	_measure() {
		this.dirty = false;
		this.vw = window.innerWidth;
		this.vh = window.innerHeight;
		const root = getComputedStyle(document.documentElement);
		this.navH = parseFloat(root.getPropertyValue('--nav-h')) || 58;
		this.barH = this.bar ? this.bar.offsetHeight : 26;
		this.axis = (this.navH + this.vh) / 2;

		// title card
		this.cw = this.element.clientWidth;
		this.ch = this.element.clientHeight;
		if (this.cw && this.ch) {
			this.floor.resize(this.cw, this.ch);
			const prev = this.large.style.transform;
			this.large.style.transform = 'none';
			const card = this.element.getBoundingClientRect();
			const box = this.flex.getBoundingClientRect();
			this.large.style.transform = prev;
			const fs = parseFloat(getComputedStyle(this.large).fontSize) || 200;
			this.baseline = box.bottom - (card.top + 1) + fs * 0.005;
			this.flexW = box.width || 1;
			this.flexCx = box.left + box.width / 2;
			this.letterX = this.letters.map(l => (l.offsetLeft + l.offsetWidth / 2) / (this.flex.offsetWidth || 1) - 0.5);
		}

		// ledger rows + hairline art sized to their plates
		this.rowData.forEach(d => {
			d.m.top = d.row.offsetTop;
			d.m.h = d.row.offsetHeight;
			if (d.fig && d.fig.parentElement) {
				const plate = d.fig.parentElement;
				const w = plate.clientWidth;
				const h = plate.clientHeight;
				const key = `${w}x${h}`;
				if (w && h && key !== d.figSize) {
					d.figSize = key;
					d.fig.setAttribute('viewBox', `0 0 ${w} ${h}`);
					d.fig.innerHTML = figureMarkup(d.i % FIGURE_COUNT, w, h);
				}
			}
		});
	}

	_tick(now) {
		if (this.dirty) this._measure();
		if (!this.vh) return;

		const y = window.scrollY;
		if (this.reduced) {
			this.sy = y;
		} else {
			this.sy += (y - this.sy) * 0.14;
			if (Math.abs(y - this.sy) < 0.1) this.sy = y;
		}

		// pointer, smoothed
		const fine = this.fineMq.matches && !this.compactMq.matches && !this.reduced;
		const want = fine && this.mouseAt.inside;
		const tx = want ? (this.mouseAt.x / this.vw) * 2 - 1 : 0;
		const ty = want ? (this.mouseAt.y / this.vh) * 2 - 1 : 0;
		this.look.x += (tx - this.look.x) * 0.07;
		this.look.y += (ty - this.look.y) * 0.07;
		this.look.amt += ((want ? 1 : 0) - this.look.amt) * 0.08;

		// stars turn with the page
		const spin = `${(y * 0.12) % 360}deg`;
		this.stars.forEach(star => (star.style.rotate = spin));

		if (this.live.has(this.element)) this._tickCard(now, y);
		if (this.live.has(this.rowsEl)) this._tickRows(y);
	}

	_tickCard(now, y) {
		const { vh } = this;
		if (!this.cw || !this.ch) return;

		const card = this.element.getBoundingClientRect();
		const cardTop = card.top;
		this.mouseAt.inside = this.mouseAt.y > card.top && this.mouseAt.y < card.bottom;
		const ledgerTop = this.ledger.getBoundingClientRect().top;
		const enterP = this.reduced ? 1 : clamp(1 - cardTop / vh);
		const exitP = this.reduced ? 0 : clamp(1 - ledgerTop / vh);

		// floor: horizon climbs as the sheet arrives, rules flow toward the viewer as you scroll
		const horizon = lerp(this.ch * 1.06, this.baseline, BEZ(enterP));
		const phase = (((y * 0.0021 + (this.reduced ? 0 : now * 0.00004)) % 1) + 1) % 1;
		this.floor.draw({
			horizon,
			vp: this.cw / 2 + this.look.x * this.cw * 0.07,
			bottom: this.look.x * this.cw * 0.035,
			phase,
			columns: this.compactMq.matches ? 4 : 6,
			rules: this.compactMq.matches ? 8 : 12,
		});

		// the star pen draws the horizon once, left to right
		if (this.pen.running) {
			const t = clamp((now - this.pen.t0) / 1700);
			const e = BEZ(t);
			const x = e * (this.cw + 60) - 30;
			this.penEl.style.opacity = t > 0 && t < 1 ? 1 : 0;
			this.penEl.style.transform = `translate3d(${x.toFixed(1)}px, ${horizon.toFixed(1)}px, 0) rotate(${(e * 540).toFixed(1)}deg)`;
			this.floor.svg.style.clipPath = `inset(0 ${((1 - clamp((x + 4) / this.cw)) * 100).toFixed(2)}% 0 0)`;
			if (t >= 1) {
				this.pen.running = false;
				this.penEl.style.opacity = 0;
				this.floor.svg.style.clipPath = 'inset(0 0% 0 0)';
			}
		}

		// letters: the ones nearest the pointer step forward and turn toward it
		const px = (this.mouseAt.x - this.flexCx) / this.flexW;
		const amt = this.look.amt;
		this.letters.forEach((letter, i) => {
			const dx = this.letterX[i] - px;
			const g = Math.exp(-(dx * dx) / (2 * 0.12 * 0.12));
			const tr = `0 0 ${(g * 90 * amt).toFixed(1)}px`;
			const ro = `0 1 0 ${(clamp(-dx * 22, -12, 12) * amt).toFixed(2)}deg`;
			const prev = this.letterStr[i];
			if (prev[0] !== tr) letter.style.translate = prev[0] = tr;
			if (prev[1] !== ro) letter.style.rotate = prev[1] = ro;
		});

		// the whole word recedes into the ledger as it covers the card
		const rx = -this.look.y * 5 + exitP * 16;
		const ry = this.look.x * 8;
		const large = `translate3d(0, ${(-exitP * 40).toFixed(1)}px, ${(-exitP * 520).toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
		if (large !== this.lastLarge) {
			this.large.style.transform = large;
			this.lastLarge = large;
		}
	}

	_tickRows(y) {
		const rt = this.rowsEl.getBoundingClientRect().top;
		const lag = y - this.sy;
		const origin = this.axis - rt;
		if (this.lastOrigin === null || Math.abs(origin - this.lastOrigin) > 0.5) {
			this.rowsEl.style.perspectiveOrigin = `50% ${origin.toFixed(1)}px`;
			this.lastOrigin = origin;
		}

		const compact = this.compactMq.matches;
		const maxA = this.reduced ? 0 : compact ? 10 : 27;
		const zDepth = this.reduced ? 0 : compact ? 40 : 250;
		const dead = 0.26;

		this.rowData.forEach(d => {
			const open = d.row.classList.contains('is-open') ? 1 : 0;
			d.flat += (open - d.flat) * 0.1;

			const cy = rt + d.m.top + d.m.h / 2 + lag;
			const n = (cy - this.axis) / (this.vh * 0.5);
			const an = Math.abs(n);
			// the drum only curves inside the viewport; far off-screen rows rest flat so perspective never pulls them in
			const edge = 1 - smooth(1, 1.5, an);
			let k = clamp((an - dead) / (1 - dead), 0, 1);
			k = Math.pow(k, 1.5) * (1 - d.flat * 0.85) * edge;

			const rx = -Math.sign(n) * k * maxA;
			const z = -Math.pow(k, 1.7) * zDepth;
			const tf =
				Math.abs(rx) < 0.02 && Math.abs(z) < 0.1
					? 'none'
					: `translate3d(0, 0, ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg)`;
			if (tf !== d.last) {
				d.row.style.transform = tf;
				d.last = tf;
			}

			// image cell: pointer tilt
			const t = d.tilt;
			t.x += (t.tx - t.x) * 0.14;
			t.y += (t.ty - t.y) * 0.14;
			const s =
				Math.abs(t.x) < 0.02 && Math.abs(t.y) < 0.02
					? 'none'
					: `rotateX(${t.x.toFixed(2)}deg) rotateY(${t.y.toFixed(2)}deg)`;
			if (d.stage && s !== d.stageStr) {
				d.stage.style.transform = s;
				d.stageStr = s;
			}
		});
	}
}
