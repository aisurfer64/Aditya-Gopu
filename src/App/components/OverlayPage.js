import Embed from './Embed';
import { projects } from '../utils/content';
import { prefersReducedMotion, bezier, pageFrames, power4out } from '../utils/constants';
import { splitLetters, splitLines, gridPath, band, tween, PaneScroll, Magnet, clamp, inOut } from './OverlayFx';
import { renderArt, isPlaceholderSnippet } from './OverlayArt';

let uid = 0;

const esc = s =>
	String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// One line of text inside its own mask (the slide-up reveal needs the wrapper).
const ln = html => `<span class="ov-ln"><span class="ov-ln-in">${html}</span></span>`;

const lineUp = [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }];
const lineOut = [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }];
const letterOut = [
	{ clipPath: 'polygon(0 -10%, 100% -10%, 100% 125%, 0 125%)', transform: 'translateY(0)' },
	{ clipPath: 'polygon(0 125%, 100% 125%, 100% 125%, 0 125%)', transform: 'translateY(-100%)' },
];
const ruleIn = [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }];

/**
 * One project's page: text pane (display title, serif copy, facts, index, next chapter) and
 * media pane (perspective grid + tilting frame). Owns its own splits, scroll coupling, tilt,
 * grid and Embed, and cleans all of it up in destroy(). The Overlay shell drives the choreography.
 */
export default class OverlayPage {
	constructor(index, { mobile = false } = {}) {
		this.i = index;
		this.p = projects[index];
		this.mobile = mobile;
		this.titleId = `ov-title-${++uid}`;
		this.dead = false;
		this.introDone = false;
		this.timers = new Set();
		this.magnets = [];

		this.sy = 0;
		this.px = 0;
		this.py = 0;
		this.grow = 0;
		this._gridKey = '';
		this._tiltKey = '';
		this.progress = 0;

		this.el = document.createElement('div');
		this.el.className = 'ov-page is-pre';
		this.el.innerHTML = this._html();
	}

	/* ---------- markup ---------- */

	_media() {
		const p = this.p;
		const m = p.media || {};
		let label = '';
		let right = '';
		let real = '';
		let live = false;

		if (m.type === 'embed') {
			label = m.url ? `Live · ${esc(m.url)}` : 'Site link pending';
			if (m.url) right = `<a class="ov-u" href="${esc(m.url)}" target="_blank" rel="noopener"><span>Open in new tab ↗</span></a>`;
		} else if (m.type === 'image') {
			label = m.src ? 'Poster' : 'Image pending';
			if (m.src) real = `<img class="ov-img" src="${esc(m.src)}" alt="${esc(m.alt)}" decoding="async" />`;
		} else {
			label = 'Code';
			if (!isPlaceholderSnippet(m.snippet)) {
				real = `<pre class="ov-code" data-lenis-prevent tabindex="0">${String(m.snippet).split('\n').map(l => `<span class="ov-cl">${esc(l) || ' '}</span>`).join('')}</pre>`;
				live = true;
			}
		}

		return `
			<div class="ov-fbar"><div class="ov-fbar-in"><span class="ov-fbar-l">Fig. ${esc(p.n.slice(0, 2))}</span><span class="ov-fbar-t">${label}</span><span class="ov-fbar-r">${right}</span></div></div>
			<div class="ov-stage"><div class="ov-stage-in${live ? ' is-live' : ''}" data-kind="${esc(m.type)}">${renderArt(p)}${real}</div></div>`;
	}

	_html() {
		const p = this.p;
		const n = projects.length;
		const nextI = (this.i + 1) % n;
		const next = projects[nextI];

		const link =
			p.link && p.link.label
				? p.link.href
					? `<a class="ov-link ov-u" href="${esc(p.link.href)}" target="_blank" rel="noopener" data-magnet>${ln(`${esc(p.link.label)} ↗`)}</a>`
					: `<p class="ov-link ov-link--pending">${ln(`${esc(p.link.label)} · link pending`)}</p>`
				: '';

		const facts = p.facts.map(f => `<div class="ov-fact"><dt>${ln(esc(f.k))}</dt><dd>${ln(esc(f.v))}</dd></div>`).join('');

		const rows = projects
			.map(
				(q, k) => `
				<li style="--k:${k}"><a class="ov-row${k === this.i ? ' is-current' : ''}" href="#projects/${esc(q.slug)}" data-ov-go="${k}" data-cursor="paper"${k === this.i ? ' aria-current="true"' : ''}>
					<i class="ov-star ov-row-star"></i>
					<span class="ov-row-id">${ln(`(${esc(q.id)})`)}</span>
					<span class="ov-row-t">${ln(esc(q.title))}</span>
					<span class="ov-row-n">${ln(esc(q.n))}</span>
				</a></li>`
			)
			.join('');

		return `
		<div class="ov-page-in">
			<section class="ov-text" data-lenis-prevent tabindex="0" aria-label="${esc(p.title)}: details">
				<div class="ov-text-in">
					<div class="ov-head">
						<div class="ov-kicker"><span class="ov-k">(${esc(p.id)})</span><span class="ov-k">${esc(p.tag)}</span></div>
						<h2 class="ov-title" id="${this.titleId}">${esc(p.title)}</h2>
					</div>
					<p class="ov-summary">${esc(p.summary)}</p>
					<div class="ov-body">${p.body.map(t => `<p>${esc(t)}</p>`).join('')}</div>
					<dl class="ov-facts">${facts}</dl>
					<div class="ov-links">${link}</div>
					<nav class="ov-index" aria-label="All projects">
						<p class="ov-label">${ln('(Index)')}</p>
						<ul>${rows}</ul>
					</nav>
					<a class="ov-next" href="#projects/${esc(next.slug)}" data-ov-go="${nextI}" data-cursor="paper">
						<span class="ov-next-wash"></span>
						<span class="ov-next-k"><span>Next chapter</span><span>(${esc(next.id)})</span></span>
						<span class="ov-next-t">${esc(next.title)}</span>
						<span class="ov-next-n"><span>${esc(next.n)}</span><span>${esc(next.tag)}</span></span>
						<i class="ov-star ov-next-star"></i>
					</a>
				</div>
			</section>
			<i class="ov-vr"></i>
			<section class="ov-media" aria-label="${esc(p.title)}: media">
				<svg class="ov-grid" aria-hidden="true"><path d=""/></svg>
				<div class="ov-tilt">
					<div class="ov-frame ov-hatch">${this._media()}</div>
				</div>
			</section>
		</div>`;
	}

	/* ---------- lifecycle ---------- */

	mount(host, { ghosted = false } = {}) {
		host.appendChild(this.el);
		const q = s => this.el.querySelector(s);
		this.inner = q('.ov-page-in');
		this.text = q('.ov-text');
		this.head = q('.ov-head');
		this.titleEl = q('.ov-title');
		this.vr = q('.ov-vr');
		this.media = q('.ov-media');
		this.grid = q('.ov-grid');
		this.gridPathEl = q('.ov-grid path');
		this.tiltEl = q('.ov-tilt');
		this.frame = q('.ov-frame');
		this.fbar = q('.ov-fbar');
		this.fbarIn = q('.ov-fbar-in');
		this.stage = q('.ov-stage');
		this.stageIn = q('.ov-stage-in');
		this.el.classList.toggle('is-ghosted', ghosted);

		this.letters = splitLetters(this.titleEl);
		this._split();
		this._measure();

		this.magnets = [...this.el.querySelectorAll('[data-magnet]')].map(el => new Magnet(el));

		this._bindImg();
		this._bindScroll();
		this._bindIO();

		this.ro = new ResizeObserver(() => this._onResize());
		this.ro.observe(this.el);
	}

	_later(fn, ms) {
		const t = setTimeout(() => {
			this.timers.delete(t);
			if (!this.dead) fn();
		}, ms);
		this.timers.add(t);
		return t;
	}

	scroller() {
		return this.mobile ? this.el : this.text;
	}

	setMobile(mobile) {
		if (mobile === this.mobile) return;
		this.mobile = mobile;
		this.tiltEl.style.transform = '';
		this.head.style.transform = '';
		this._tiltKey = '';
		this._gridKey = '';
		this._bindScroll();
		this._bindIO();
		this._onResize();
	}

	_bindScroll() {
		if (this.pane) this.pane.destroy();
		this.pane = null;
		if (!this.mobile && !prefersReducedMotion()) this.pane = new PaneScroll(this.text);
	}

	_bindIO() {
		if (this.io) this.io.disconnect();
		const targets = [...this.el.querySelectorAll('.ov-index, .ov-next')];
		if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
			targets.forEach(t => t.classList.add('is-in'));
			return;
		}
		// Reveals wait until the staged intro has reached them; after that they fire as they scroll in.
		this.ioPending = new Set();
		this.io = new IntersectionObserver(
			entries =>
				entries.forEach(e => {
					if (!e.isIntersecting) return;
					this.io.unobserve(e.target);
					if (this.ioOpen) e.target.classList.add('is-in');
					else this.ioPending.add(e.target);
				}),
			{ root: this.scroller(), threshold: 0.15 }
		);
		targets.filter(t => !t.classList.contains('is-in')).forEach(t => this.io.observe(t));
	}

	_openIO() {
		this.ioOpen = true;
		if (this.ioPending) this.ioPending.forEach(t => t.classList.add('is-in'));
		if (this.ioPending) this.ioPending.clear();
	}

	// Real <img>: art steps aside once it has loaded; a broken one is dropped.
	_bindImg() {
		const img = this.stageIn.querySelector('.ov-img');
		if (!img) return;
		img.addEventListener('load', () => this.stageIn.classList.add('is-live'));
		img.addEventListener('error', () => img.remove());
		if (img.complete && img.naturalWidth) this.stageIn.classList.add('is-live');
	}

	mountEmbed() {
		const m = this.p.media || {};
		if (this.embed || this.dead || m.type !== 'embed' || !m.url) return;
		this.embed = new Embed(this.stageIn, { url: m.url, handshake: !!m.handshake, interactive: true, timeout: 6000 });
		this.embed.mount();
		this.mo = new MutationObserver(() => {
			if (this.stageIn.classList.contains('is-blocked') && !this.note) {
				this.note = document.createElement('a');
				this.note.className = 'ov-fallback';
				this.note.href = m.url;
				this.note.target = '_blank';
				this.note.rel = 'noopener';
				this.note.textContent = 'This site can’t be embedded here. Open it in a new tab ↗';
				this.stageIn.appendChild(this.note);
			}
		});
		this.mo.observe(this.stageIn, { attributes: true, attributeFilter: ['class'] });
	}

	/* ---------- layout ---------- */

	_split() {
		this.sets = [];
		const summary = this.el.querySelector('.ov-summary');
		const bodies = [...this.el.querySelectorAll('.ov-body p')];
		this.sets.push(splitLines(summary));
		bodies.forEach(b => this.sets.push(splitLines(b)));
		this._splitW = this.text.clientWidth;
	}

	_measure() {
		const m = this.media;
		this.mw = m.clientWidth;
		this.mh = m.clientHeight;
		this.grid.setAttribute('viewBox', `0 0 ${this.mw} ${this.mh}`);
		this.mr = m.getBoundingClientRect();
		this._gridKey = '';
	}

	_onResize() {
		if (this.dead) return;
		this._measure();
		if (this.introDone && this.text.clientWidth !== this._splitW) this._split();
		this._tiltKey = '';
	}

	// Frame rectangle in viewport coordinates, ignoring pointer tilt (layout box only).
	frameRect() {
		const mr = this.media.getBoundingClientRect();
		const t = this.tiltEl;
		return { left: mr.left + t.offsetLeft, top: mr.top + t.offsetTop, width: t.offsetWidth, height: t.offsetHeight };
	}

	/* ---------- choreography ---------- */

	_a(el, frames, opts) {
		if (!el || this.dead) return null;
		return el.animate(frames, { fill: 'backwards', ...opts });
	}

	// Staged text intro. Returns when the last piece settles (ms after `delay`).
	introText(delay = 0) {
		const reduced = prefersReducedMotion();
		if (reduced) {
			this.introDone = true;
			this._openIO();
			return 0;
		}
		let end = 0;
		const A = (el, frames, o) => {
			this._a(el, frames, o);
			end = Math.max(end, (o.delay || 0) + o.duration);
		};
		const d0 = delay;

		A(this.vr, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { delay: d0, duration: 1200, easing: bezier });

		this.el.querySelectorAll('.ov-k').forEach((k, i) => A(k, pageFrames, { delay: d0 + i * 70, duration: 800, easing: bezier }));
		A(this.el.querySelector('.ov-kicker'), ruleIn, { delay: d0 + 120, duration: 1100, easing: bezier, pseudoElement: '::after' });

		this.letters.forEach((c, i) => A(c, pageFrames, { delay: d0 + 160 + i * 30, duration: 900, easing: bezier }));

		let k = 0;
		const t1 = d0 + 160 + Math.min(this.letters.length, 14) * 30 + 120;
		this.sets.forEach(set => set.forEach(l => A(l, lineUp, { delay: t1 + k++ * 65, duration: 1000, easing: power4out })));

		const t2 = t1 + k * 65 + 80;
		this.el.querySelectorAll('.ov-fact').forEach((f, i) => {
			A(f, ruleIn, { delay: t2 + i * 90, duration: 1000, easing: bezier, pseudoElement: '::before' });
			f.querySelectorAll('.ov-ln-in').forEach((l, j) => A(l, lineUp, { delay: t2 + 140 + i * 90 + j * 50, duration: 900, easing: power4out }));
		});
		const facts = this.el.querySelectorAll('.ov-fact').length;
		this.el.querySelectorAll('.ov-links .ov-ln-in').forEach(l => A(l, lineUp, { delay: t2 + 260 + facts * 90, duration: 900, easing: power4out }));

		this._later(() => this._openIO(), t2 + 520);
		this._later(() => {
			this.introDone = true;
			this._onResize();
		}, end + 60);
		return end;
	}

	// The frame arrives: ink band wipes the ink bar and the stage in, tunnel lines grow out of it.
	introFrame(delay = 0) {
		this.el.classList.remove('is-ghosted');
		const reduced = prefersReducedMotion();
		if (reduced) {
			this.el.classList.remove('is-pre');
			this.grow = 1;
			this._later(() => this.mountEmbed(), 250);
			return;
		}
		// the band sets the hidden state itself on its first frame; drop the CSS stand-in with it
		const run = (host, next, o) => band(host, { next, ...o });
		const t1 = run(this.fbar, this.fbarIn, { delay, duration: 800, size: 14, width: 0.35, spin: 180 });
		const t2 = run(this.stage, this.stageIn, { delay: delay + 140, duration: 1100, size: Math.round(clamp(this.mw * 0.07, 28, 56)), width: 0.28 });
		this.tweens = [t1, t2];
		this.el.classList.remove('is-pre');
		this._tweenGrow(1, 1100, delay + 200);
		this._later(() => this.mountEmbed(), delay + 700);
	}

	_tweenGrow(to, duration, delay = 0) {
		if (this.growT) this.growT.cancel();
		const from = this.grow;
		this.growT = tween({ duration, delay, ease: inOut, onUpdate: v => (this.grow = from + (to - from) * v) });
	}

	// Close: type and copy slide away, frame contents wipe off, the tunnel pulls back in.
	outro() {
		this.el.getAnimations({ subtree: true }).forEach(a => a.cancel());
		(this.tweens || []).forEach(t => t.cancel());
		this.stage.style.clipPath = '';
		this.fbar.style.clipPath = '';
		this.el.classList.remove('is-pre');
		if (prefersReducedMotion()) return 0;

		const o = (el, frames, delay, duration, easing = bezier, extra = {}) => el && el.animate(frames, { fill: 'forwards', delay, duration, easing, ...extra });
		this.letters.forEach((c, i) => o(c, letterOut, i * 14, 650));
		let k = 0;
		this.sets.forEach(set => set.forEach(l => o(l, lineOut, 60 + k++ * 40, 700, power4out)));
		this.el.querySelectorAll('.ov-fact .ov-ln-in, .ov-links .ov-ln-in').forEach((l, i) => o(l, lineOut, 120 + i * 40, 600, power4out));
		this.el.querySelectorAll('.ov-k').forEach((c, i) => o(c, letterOut, i * 40, 600));
		o(this.vr, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], 0, 900);

		// hairlines retract to the right; the index rows slide back down
		const retract = [
			{ transformOrigin: 'right center', transform: 'scaleX(1)' },
			{ transformOrigin: 'right center', transform: 'scaleX(0)' },
		];
		o(this.el.querySelector('.ov-kicker'), retract, 0, 700, bezier, { pseudoElement: '::after' });
		this.el.querySelectorAll('.ov-fact').forEach((f, i) => o(f, retract, i * 60, 700, bezier, { pseudoElement: '::before' }));
		const idx = this.el.querySelector('.ov-index');
		if (idx) idx.classList.remove('is-in');

		const t1 = band(this.fbar, { old: this.fbarIn, delay: 0, duration: 650, size: 14, width: 0.35, spin: 180, keep: true });
		const t2 = band(this.stage, { old: this.stageIn, delay: 60, duration: 800, size: Math.round(clamp(this.mw * 0.07, 28, 56)), width: 0.28, keep: true });
		this.tweens = [t1, t2];
		this._tweenGrow(0, 800, 0);
		return 860;
	}

	setGhosted(v) {
		this.el.classList.toggle('is-ghosted', v);
	}

	/* ---------- per-frame coupling ---------- */

	// ctx: { ptr, fine, reduced, lockTilt }. Returns the reading progress (0..1).
	tick(ctx) {
		if (this.dead) return 0;
		const reduced = ctx.reduced;
		const sc = this.scroller();
		const st = sc.scrollTop;

		if (this.pane) this.pane.step();

		if (reduced) this.sy = st;
		else {
			this.sy += (st - this.sy) * 0.14;
			if (Math.abs(st - this.sy) < 0.05) this.sy = st;
		}
		const max = Math.max(1, sc.scrollHeight - sc.clientHeight);
		this.progress = clamp(this.sy / max, 0, 1);

		// display title lifts off a little faster than the copy under it
		if (!this.mobile && !reduced) {
			const y = (-this.sy * 0.22).toFixed(2);
			if (this._headY !== y) {
				this._headY = y;
				this.head.style.transform = `translate3d(0, ${y}px, 0)`;
			}
		}

		// pointer tilt + vanishing-point drift
		let nx = 0;
		let ny = 0;
		if (ctx.fine && !this.mobile && !reduced && ctx.ptr && !ctx.lockTilt) {
			const r = this.mr;
			nx = clamp((ctx.ptr.x - (r.left + r.width / 2)) / (r.width * 0.8), -1, 1);
			ny = clamp((ctx.ptr.y - (r.top + r.height / 2)) / (r.height * 0.8), -1, 1);
		}
		if (this.stageIn.classList.contains('is-live')) {
			const k = this.frame.matches(':hover') ? 0 : 0.35;
			nx *= k;
			ny *= k;
		}
		this.px += (nx - this.px) * 0.08;
		this.py += (ny - this.py) * 0.08;
		if (Math.abs(this.px) < 0.0005) this.px = 0;
		if (Math.abs(this.py) < 0.0005) this.py = 0;

		if (!this.mobile && !reduced) {
			const dx = this.px * 14;
			const dy = this.py * 10 + (0.5 - this.progress) * 22;
			const key = `${dx.toFixed(2)}|${dy.toFixed(2)}|${this.px.toFixed(3)}|${this.py.toFixed(3)}`;
			if (key !== this._tiltKey) {
				this._tiltKey = key;
				this.dx = dx;
				this.dy = dy;
				this.tiltEl.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) perspective(1100px) rotateX(${(-this.py * 4).toFixed(3)}deg) rotateY(${(this.px * 5.5).toFixed(3)}deg)`;
			}
		} else {
			this.dx = this.dy = 0;
		}
		this._drawGrid();
		return this.progress;
	}

	_drawGrid() {
		if (this.mobile || !this.mw) {
			return;
		}
		const g = this.grow;
		const key = `${g.toFixed(3)}|${(this.dx || 0).toFixed(2)}|${(this.dy || 0).toFixed(2)}|${this.mw}|${this.mh}`;
		if (key === this._gridKey) return;
		this._gridKey = key;
		const t = this.tiltEl;
		const inner = {
			x1: t.offsetLeft + (this.dx || 0),
			y1: t.offsetTop + (this.dy || 0),
			x2: t.offsetLeft + t.offsetWidth + (this.dx || 0),
			y2: t.offsetTop + t.offsetHeight + (this.dy || 0),
		};
		if (g <= 0.001) {
			this.gridPathEl.setAttribute('d', '');
			return;
		}
		const o = {
			x1: inner.x1 * (1 - g),
			y1: inner.y1 * (1 - g),
			x2: inner.x2 + (this.mw - inner.x2) * g,
			y2: inner.y2 + (this.mh - inner.y2) * g,
		};
		this.gridPathEl.setAttribute('d', gridPath(o, inner, 8, 4));
	}

	/* ---------- teardown ---------- */

	destroy() {
		if (this.dead) return;
		this.dead = true;
		this.timers.forEach(clearTimeout);
		this.timers.clear();
		(this.tweens || []).forEach(t => t.cancel());
		if (this.growT) this.growT.cancel();
		this.el.getAnimations({ subtree: true }).forEach(a => a.cancel());
		if (this.io) this.io.disconnect();
		if (this.ro) this.ro.disconnect();
		if (this.mo) this.mo.disconnect();
		if (this.pane) this.pane.destroy();
		this.magnets.forEach(m => m.reset());
		this.magnets = [];
		if (this.embed) this.embed.destroy();
		this.embed = null;
		this.el.remove();
	}
}
