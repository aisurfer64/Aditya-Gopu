/**
 * Animated hairline stand-ins for the Projects media (live site / poster / code).
 * One small runner per `.pm-art`; ProjectFx calls `update(now)` from its shared rAF loop, only for
 * panels that are on screen, uncovered and not yet replaced by real media (`.frame.is-live`).
 * Runners move things with transform / clip only and read layout via offset* (immune to the 3D tilt).
 */

const clamp01 = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
// easeInOutQuart: the shared cubic-bezier(0.76, 0, 0.24, 1) in closed form
const inOut = t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

// Box of `el` inside `root`, from layout offsets only.
function boxIn(el, root) {
	let x = 0;
	let y = 0;
	let n = el;
	while (n && n !== root) {
		x += n.offsetLeft;
		y += n.offsetTop;
		n = n.offsetParent;
	}
	return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

class Art {
	constructor(frame, art) {
		this.frame = frame;
		this.art = art;
		this.t0 = null;
		this.started = false;
	}

	get live() {
		return this.frame.classList.contains('is-live');
	}

	// Called once the panel has been revealed; the loop begins a beat after the draw-in.
	begin(now) {
		this.t0 = now + 1900;
		this.started = true;
	}

	measure() {}
	update() {}
	// Reduced motion: settle on a complete, still composition.
	settle() {}
}

/* ---------- Live site: scrolling page + wandering, clicking cursor ---------- */
class SiteArt extends Art {
	constructor(frame, art) {
		super(frame, art);
		this.page = art.querySelector('.pa-page');
		this.cursor = art.querySelector('.pa-cursor');
		this.thumb = art.querySelector('.pa-rail b');
		this.link = art.querySelectorAll('.pa-link')[1];
		this.cta = art.querySelector('.pa-cta');
		this.btn = art.querySelector('.pa-hero .pa-btn');
		this.card = art.querySelectorAll('.pa-card')[1];
		this.band = art.querySelector('.pa-band .pa-btn');
		this.hit = null;
		this.press = false;
		this.measure();
	}

	measure() {
		const W = this.art.clientWidth;
		const H = this.art.clientHeight;
		if (!W || !H) return;
		this.W = W;
		this.H = H;
		this.max = Math.max(0, this.page.offsetHeight - H);

		const pt = (el, fy = 0.5) => {
			const b = boxIn(el, this.page);
			return { el, x: b.x + b.w * 0.5, y: b.y + b.h * fy };
		};
		const link = pt(this.link);
		const btn = pt(this.btn);
		const card = pt(this.card, 0.3);
		const band = pt(this.band);
		const cta = pt(this.cta);

		const s1 = Math.min(this.max, Math.max(0, card.y - H * 0.42));
		const s2 = Math.min(this.max, Math.max(0, band.y - H * 0.7));
		const idle = { x: W * 0.8, y: H * 0.78 };
		const vp = (p, s) => ({ x: p.x, y: p.y - s });

		// Each step eases the cursor (viewport coords) and the page scroll together.
		const steps = [
			{ to: vp(link, 0), scroll: 0, dur: 1400 },
			{ click: link.el, dur: 900 },
			{ to: vp(btn, 0), scroll: 0, dur: 1200 },
			{ click: btn.el, dur: 900 },
			{ to: vp(card, s1), scroll: s1, dur: 1900 },
			{ click: card.el, dur: 1000 },
			{ to: vp(band, s2), scroll: s2, dur: 1500 },
			{ click: band.el, dur: 900 },
			{ to: vp(cta, 0), scroll: 0, dur: 2000 },
			{ click: cta.el, dur: 900 },
			{ to: idle, scroll: 0, dur: 1500 },
			{ wait: true, dur: 900 },
		];

		let t = 0;
		let pos = idle;
		let scroll = 0;
		this.steps = steps.map(s => {
			const step = { ...s, start: t, from: pos, fromScroll: scroll };
			if (s.to) {
				pos = s.to;
				scroll = s.scroll;
			}
			step.end = t + s.dur;
			step.at = pos;
			step.atScroll = scroll;
			t += s.dur;
			return step;
		});
		this.total = t;
		this.idle = idle;
		this._paint(idle.x, idle.y, 0);
	}

	_paint(x, y, scroll) {
		this.page.style.transform = `translate3d(0, ${-scroll}px, 0)`;
		this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		if (this.max > 0) this.thumb.style.transform = `translateY(${(scroll / this.max) * 233.3}%)`;
	}

	_setHit(el) {
		if (this.hit === el) return;
		if (this.hit) this.hit.classList.remove('is-hit');
		this.hit = el;
		if (el) el.classList.add('is-hit');
	}

	_setPress(on) {
		if (this.press === on) return;
		this.press = on;
		this.cursor.classList.toggle('is-press', on);
	}

	settle() {
		if (this.idle) this._paint(this.idle.x, this.idle.y, 0);
	}

	update(now) {
		if (!this.started || !this.steps || this.live) return;
		if (now < this.t0) return;
		const t = (now - this.t0) % this.total;

		let i = 0;
		while (i < this.steps.length - 1 && t >= this.steps[i].end) i++;
		const s = this.steps[i];
		const u = clamp01((t - s.start) / s.dur);

		let x;
		let y;
		let scroll;
		if (s.to) {
			const k = inOut(u);
			x = lerp(s.from.x, s.at.x, k);
			y = lerp(s.from.y, s.at.y, k);
			scroll = lerp(s.fromScroll, s.atScroll, k);
		} else {
			x = s.at.x;
			y = s.at.y;
			scroll = s.atScroll;
		}
		this._paint(x, y, scroll);

		// click: press for the first 220ms, ink wash on the target until shortly after the next move starts
		if (s.click) {
			const local = t - s.start;
			this._setPress(local < 220);
			this._setHit(local > 120 ? s.click : null);
		} else {
			this._setPress(false);
			const prev = this.steps[i - 1];
			if (!(prev && prev.click && t - s.start < 420)) this._setHit(null);
		}
	}
}

/* ---------- Poster: a reader's focus box that travels the board and re-draws the figures ---------- */
class PosterArt extends Art {
	constructor(frame, art) {
		super(frame, art);
		this.focus = art.querySelector('.pp-focus');
		const cols = art.querySelectorAll('.pp-col');
		const figs = art.querySelectorAll('.pp-fig');
		this.plot = art.querySelector('.pp-plot');
		this.bars = art.querySelectorAll('.pp-bars rect');
		this.targets = [
			{ el: figs[0], act: () => this._redrawPlot() },
			{ el: cols[0] },
			{ el: figs[1], act: () => this._regrowBars() },
			{ el: cols[2] },
			{ el: art.querySelector('.pp-head') },
		];
		this.fired = -1;
		this.measure();
	}

	measure() {
		if (!this.art.clientWidth) return;
		this.boxes = this.targets.map(t => {
			const b = boxIn(t.el, this.art);
			const o = 4;
			return { x: b.x - o, y: b.y - o, w: b.w + o * 2, h: b.h + o * 2 };
		});
		this.hold = 1500;
		this.travel = 1100;
		this.cycle = this.boxes.length * (this.hold + this.travel);
		this._paint(this.boxes[0]);
	}

	_paint(b) {
		const f = this.focus.style;
		f.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
		f.width = `${b.w}px`;
		f.height = `${b.h}px`;
	}

	_redrawPlot() {
		const p = this.plot;
		p.style.transition = 'none';
		p.style.strokeDashoffset = '1';
		void p.getBoundingClientRect();
		p.style.transition = 'stroke-dashoffset 1500ms cubic-bezier(0.76, 0, 0.24, 1)';
		p.style.strokeDashoffset = '0';
	}

	_regrowBars() {
		this.bars.forEach(r => {
			r.style.transition = 'none';
			r.style.scale = '1 0';
		});
		void this.art.getBoundingClientRect();
		this.bars.forEach((r, i) => {
			r.style.transition = `scale 1000ms cubic-bezier(0.76, 0, 0.24, 1) ${i * 80}ms`;
			r.style.scale = '1 1';
		});
	}

	settle() {
		if (this.boxes) this._paint(this.boxes[1]);
	}

	update(now) {
		if (!this.started || !this.boxes || this.live) return;
		if (now < this.t0) return;
		const per = this.hold + this.travel;
		const t = (now - this.t0) % this.cycle;
		const i = Math.floor(t / per);
		const local = t - i * per;
		const a = this.boxes[i];
		const b = this.boxes[(i + 1) % this.boxes.length];

		if (local < this.hold) {
			this._paint(a);
			if (this.fired !== i) {
				this.fired = i;
				if (this.targets[i].act) this.targets[i].act();
			}
		} else {
			const k = inOut((local - this.hold) / this.travel);
			this._paint({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });
		}
	}
}

/* ---------- Code: typed first line + skeleton lines + a signal passing through a small network ---------- */
const LAYERS = [3, 5, 4, 2];
const NS = 'http://www.w3.org/2000/svg';

class CodeArt extends Art {
	constructor(frame, art) {
		super(frame, art);
		this.pre = art.querySelector('.pc-typed');
		this.full = this.pre.textContent;
		this.rows = [...art.querySelectorAll('.pc-l')];
		this.svg = art.querySelector('.pc-svg');
		this.cap = art.querySelector('.pc-cap');
		this.rows.forEach(r => r.classList.add('is-off'));
		this._buildNet();
		this.typed = -1;
		this.shown = 0;
		this.phaseKey = '';
		this.path = [0, 0, 0, 0];
		this.measure();
	}

	_buildNet() {
		const X = [20, 86, 154, 220];
		const y = (n, j) => 140 + (j - (n - 1) / 2) * 52;
		const mk = (tag, attrs) => {
			const el = document.createElementNS(NS, tag);
			Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
			return el;
		};

		this.pos = LAYERS.map((n, l) => Array.from({ length: n }, (_, j) => ({ x: X[l], y: y(n, j) })));
		this.edges = [];
		this.nodes = [];

		for (let l = 0; l < LAYERS.length - 1; l++) {
			this.edges[l] = [];
			for (let a = 0; a < LAYERS[l]; a++) {
				this.edges[l][a] = [];
				for (let b = 0; b < LAYERS[l + 1]; b++) {
					const A = this.pos[l][a];
					const B = this.pos[l + 1][b];
					const line = mk('line', { class: 'e', x1: A.x, y1: A.y, x2: B.x, y2: B.y });
					this.svg.appendChild(line);
					this.edges[l][a][b] = line;
				}
			}
		}
		LAYERS.forEach((n, l) => {
			this.nodes[l] = [];
			for (let j = 0; j < n; j++) {
				const P = this.pos[l][j];
				const r = mk('rect', { class: 'n', x: P.x - 4.5, y: P.y - 4.5, width: 9, height: 9 });
				this.svg.appendChild(r);
				this.nodes[l][j] = r;
			}
		});
		this.pulse = mk('rect', { class: 'pulse', width: 5, height: 5, x: 0, y: 0 });
		this.pulse.style.visibility = 'hidden';
		this.svg.appendChild(this.pulse);
	}

	measure() {
		const chars = Math.max(8, this.full.trim().length);
		this.tType = Math.min(2400, chars * 70);
		this.tLines = this.rows.length * 150;
		this.tHold = 3000;
		this.tGap = 700;
		this.edCycle = this.tType + this.tLines + this.tHold + this.tGap;
		this.netCycle = 7000; // 0-3500 forward, 3500-7000 back
	}

	settle() {
		this.pre.textContent = this.full;
		this.rows.forEach(r => r.classList.replace('is-off', 'is-on'));
	}

	_pickPath() {
		this.path = LAYERS.map(n => Math.floor(Math.random() * n));
	}

	_clearNet() {
		this.svg.querySelectorAll('.on').forEach(el => el.classList.remove('on'));
	}

	_editor(t) {
		let n;
		let rows = 0;
		if (t < this.tType) {
			n = Math.floor((t / this.tType) * this.full.length);
		} else {
			n = this.full.length;
			if (t < this.tType + this.tLines + this.tHold) {
				rows = Math.min(this.rows.length, Math.floor((t - this.tType) / 150));
			} else if (t < this.tType + this.tLines + this.tHold + this.tGap) {
				rows = -1; // erase
				n = 0;
			}
		}
		if (n !== this.typed) {
			this.typed = n;
			this.pre.textContent = this.full.slice(0, n);
		}
		if (rows === -1) rows = 0;
		if (rows !== this.shown) {
			const from = Math.min(rows, this.shown);
			const to = Math.max(rows, this.shown);
			for (let i = from; i < to; i++) {
				this.rows[i].classList.toggle('is-on', rows > this.shown);
				this.rows[i].classList.toggle('is-off', rows < this.shown);
			}
			this.shown = rows;
		}
	}

	_net(t) {
		const half = this.netCycle / 2;
		const back = t >= half;
		const p = clamp01((back ? t - half : t) / half);
		const key = back ? 'b' : 'f';

		if (key !== this.phaseKey) {
			if (!back) this._pickPath();
			this._clearNet();
			this.phaseKey = key;
			this.cap.textContent = back ? '(Backprop)' : '(Forward pass)';
		}

		// the signal rides node -> node along `path`, ending 8% early to rest on the last layer
		const f = back ? 1 - p : p; // position along the path 0..1
		const seg = Math.min(LAYERS.length - 2, Math.floor(f * (LAYERS.length - 1)));
		const u = inOut(f * (LAYERS.length - 1) - seg);
		const A = this.pos[seg][this.path[seg]];
		const B = this.pos[seg + 1][this.path[seg + 1]];
		const x = lerp(A.x, B.x, u);
		const y = lerp(A.y, B.y, u);
		this.pulse.style.visibility = 'visible';
		this.pulse.setAttribute('x', (x - 2.5).toFixed(1));
		this.pulse.setAttribute('y', (y - 2.5).toFixed(1));

		// light the nodes / edges the signal has reached
		const reached = f * (LAYERS.length - 1);
		for (let l = 0; l < LAYERS.length; l++) {
			const on = back ? l >= reached - 0.02 : l <= reached + 0.02;
			this.nodes[l][this.path[l]].classList.toggle('on', on);
			if (l < LAYERS.length - 1) {
				const eon = back ? l + 1 >= reached : l <= reached;
				this.edges[l][this.path[l]][this.path[l + 1]].classList.toggle('on', eon);
			}
		}
	}

	update(now) {
		if (!this.started || this.live) return;
		if (now < this.t0) return;
		const t = now - this.t0;
		this._editor(t % this.edCycle);
		this._net(t % this.netCycle);
	}
}

export function createArt(frame) {
	const art = frame.querySelector('.pm-art');
	if (!art) return null;
	if (art.classList.contains('pm-art--site')) return new SiteArt(frame, art);
	if (art.classList.contains('pm-art--poster')) return new PosterArt(frame, art);
	if (art.classList.contains('pm-art--code')) return new CodeArt(frame, art);
	return null;
}
