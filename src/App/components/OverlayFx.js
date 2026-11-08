/**
 * Motion toolkit for the project overlay. No framework: a cubic-bezier solver, an rAF tween,
 * letter / line splitters, the ink-band wipe (Awards' black mask + orange star, generalised to
 * any rectangle), a rolling counter, the Awards-style perspective grid, a smoothed wheel
 * scroller and a magnetic pull. Everything here is cleaned up by whoever created it.
 */

/* ---------- easing ---------- */

export const cubicBezier = (x1, y1, x2, y2) => {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const sx = t => ((ax * t + bx) * t + cx) * t;
	const sy = t => ((ay * t + by) * t + cy) * t;
	const dx = t => (3 * ax * t + 2 * bx) * t + cx;

	return x => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < 8; i++) {
			const e = sx(t) - x;
			if (Math.abs(e) < 1e-5) return sy(t);
			const d = dx(t);
			if (Math.abs(d) < 1e-6) break;
			t -= e / d;
		}
		let lo = 0;
		let hi = 1;
		t = x;
		while (lo < hi) {
			const e = sx(t);
			if (Math.abs(e - x) < 1e-5) break;
			if (x > e) lo = t;
			else hi = t;
			t = (hi - lo) / 2 + lo;
			if (hi - lo < 1e-6) break;
		}
		return sy(t);
	};
};

// Same curves as utils/constants.js, as functions for the rAF-driven pieces.
export const inOut = cubicBezier(0.76, 0, 0.24, 1);
export const out4 = cubicBezier(0.165, 0.84, 0.44, 1);
export const out3 = cubicBezier(0.215, 0.61, 0.355, 1);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- tween ---------- */

const live = new Set();

export function tween({ duration = 800, delay = 0, ease = inOut, onUpdate, onDone }) {
	let raf = 0;
	let timer = 0;
	let start = 0;
	let ended = false;
	let resolve;
	const finished = new Promise(r => (resolve = r));

	const end = complete => {
		if (ended) return;
		ended = true;
		cancelAnimationFrame(raf);
		clearTimeout(timer);
		live.delete(handle);
		if (complete) {
			onUpdate(1);
			if (onDone) onDone();
		}
		resolve(complete);
	};
	const step = now => {
		if (!start) start = now;
		const k = clamp((now - start) / duration, 0, 1);
		onUpdate(ease(k));
		if (k < 1) raf = requestAnimationFrame(step);
		else end(true);
	};
	const handle = { finished, cancel: () => end(false), finish: () => end(true) };

	onUpdate(0);
	live.add(handle);
	timer = setTimeout(() => (raf = requestAnimationFrame(step)), delay);
	return handle;
}

export const cancelTweens = () => [...live].forEach(h => h.cancel());

/* ---------- text splitting ---------- */

const mk = (tag, cls, text) => {
	const el = document.createElement(tag);
	if (cls) el.className = cls;
	if (text != null) el.textContent = text;
	return el;
};

// Display type: every word becomes a nowrap box of letter boxes. Returns the letter boxes.
export function splitLetters(el) {
	const text = el.dataset.ovText || el.textContent;
	el.dataset.ovText = text;
	el.setAttribute('aria-label', text);
	el.textContent = '';

	const inner = mk('span', 'ov-sp');
	inner.setAttribute('aria-hidden', 'true');
	const letters = [];
	text.split(/(\s+)/).forEach(part => {
		if (!part) return;
		if (/^\s+$/.test(part)) {
			inner.appendChild(document.createTextNode(' '));
			return;
		}
		const word = mk('span', 'ov-w');
		[...part].forEach(ch => {
			const c = mk('span', 'ov-ch', ch);
			word.appendChild(c);
			letters.push(c);
		});
		inner.appendChild(word);
	});
	el.appendChild(inner);
	return letters;
}

// Serif copy: measure where the browser wraps, then rebuild every line as its own mask.
// Returns the inner boxes (the things that slide). Needs the element laid out and visible.
export function splitLines(el) {
	const text = el.dataset.ovText || el.textContent.replace(/\s+/g, ' ').trim();
	el.dataset.ovText = text;
	el.textContent = '';

	const words = text.split(' ').filter(Boolean);
	const probes = words.map(w => {
		const s = mk('span', null, w);
		el.appendChild(s);
		el.appendChild(document.createTextNode(' '));
		return s;
	});

	const lines = [];
	let top = null;
	probes.forEach((s, i) => {
		const t = s.getBoundingClientRect().top;
		if (top === null || Math.abs(t - top) > 3) {
			lines.push([]);
			top = t;
		}
		lines[lines.length - 1].push(words[i]);
	});

	el.textContent = '';
	return lines.map((ws, i) => {
		const line = mk('span', 'ov-ln');
		const inner = mk('span', 'ov-ln-in', ws.join(' '));
		line.appendChild(inner);
		el.appendChild(line);
		if (i < lines.length - 1) el.appendChild(document.createTextNode(' '));
		return inner;
	});
}

/* ---------- ink band: the Awards mask + star, as a wipe between two layers ---------- */

/**
 * A black band with an orange star rides across `host`. Behind it the `next` layer is revealed
 * (clip-path), ahead of it the `old` layer is eaten. Either layer may be null: with no `old`
 * the band reveals `next` over whatever is behind the host; with no `next` it removes `old`.
 * dir 'ltr' travels left to right, 'rtl' the other way. width is a fraction of the host.
 */
export function band(host, { old = null, next = null, dir = 'ltr', width = 0.2, size = 40, duration = 1000, delay = 0, ease = inOut, spin = 360, keep = false, onProgress }) {
	const el = mk('div', 'ov-band');
	const star = mk('i', 'ov-star ov-band-star');
	star.style.width = star.style.height = `${size}px`;
	el.appendChild(star);
	host.appendChild(el);

	const rtl = dir === 'rtl';
	const pc = v => `${(v * 100).toFixed(3)}%`;

	const apply = p => {
		const k = p * (1 + width);
		const b = Math.min(1, k);
		const a = Math.max(0, k - width);
		if (!rtl) {
			if (old) old.style.clipPath = `inset(0 0 0 ${pc(b)})`;
			if (next) next.style.clipPath = `inset(0 ${pc(1 - a)} 0 0)`;
			el.style.clipPath = `inset(0 ${pc(1 - b)} 0 ${pc(a)})`;
			star.style.left = pc((a + b) / 2);
		} else {
			if (old) old.style.clipPath = `inset(0 ${pc(b)} 0 0)`;
			if (next) next.style.clipPath = `inset(0 0 0 ${pc(1 - a)})`;
			el.style.clipPath = `inset(0 ${pc(a)} 0 ${pc(1 - b)})`;
			star.style.left = pc(1 - (a + b) / 2);
		}
		star.style.transform = `translate(-50%, -50%) rotate(${(p * spin).toFixed(2)}deg)`;
		if (onProgress) onProgress(p);
	};

	// keep: leave `old` clipped away (and `next` untouched) so a layer that is about to be removed cannot flash back
	const clear = () => {
		el.remove();
		if (!keep) {
			if (old) old.style.clipPath = '';
			if (next) next.style.clipPath = '';
		}
	};

	const t = tween({ duration, delay, ease, onUpdate: apply, onDone: clear });
	t.finished.then(done => {
		if (!done) {
			el.remove();
			if (old) old.style.clipPath = '';
			if (next) next.style.clipPath = '';
		}
	});
	return t;
}

/* ---------- rolling counter ---------- */

export class Roll {
	constructor(el) {
		this.el = el;
		this.text = '';
		this.cells = [];
	}

	_cell(ch) {
		const cell = mk('span', 'ov-rc');
		const stack = mk('span', 'ov-rc-s');
		stack.appendChild(mk('span', null, ch === ' ' ? ' ' : ch));
		cell.appendChild(stack);
		return cell;
	}

	// dir 1: new glyph arrives from below; -1: from above.
	set(text, dir = 1, animate = true) {
		if (text === this.text) return;
		const chars = [...text];
		if (chars.length !== this.cells.length) {
			this.el.textContent = '';
			this.cells = chars.map(ch => this._cell(ch));
			this.cells.forEach(c => this.el.appendChild(c));
			this.text = text;
			return;
		}
		const prev = [...this.text];
		chars.forEach((ch, i) => {
			if (ch === prev[i]) return;
			const stack = this.cells[i].firstChild;
			if (!animate) {
				stack.textContent = '';
				stack.appendChild(mk('span', null, ch === ' ' ? ' ' : ch));
				return;
			}
			stack.getAnimations().forEach(a => a.finish());
			const incoming = mk('span', null, ch === ' ' ? ' ' : ch);
			const outgoing = stack.firstChild;
			if (dir >= 0) stack.appendChild(incoming);
			else stack.insertBefore(incoming, outgoing);
			const frames = dir >= 0 ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-1em)' }] : [{ transform: 'translateY(-1em)' }, { transform: 'translateY(0)' }];
			const anim = stack.animate(frames, { duration: 700, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', delay: i * 45, fill: 'backwards' });
			const settle = () => {
				if (outgoing.parentNode === stack) outgoing.remove();
			};
			anim.finished.then(settle, settle);
		});
		this.text = text;
	}
}

/* ---------- perspective grid (the Awards vanishing-point lines) ---------- */

export function gridPath(o, i, vLines = 8, hLines = 4) {
	const r = v => Math.round(v * 10) / 10;
	const ogx = (o.x2 - o.x1) / vLines;
	const ogy = (o.y2 - o.y1) / vLines;
	const igx = (i.x2 - i.x1) / vLines;
	const igy = (i.y2 - i.y1) / vLines;
	let d = '';
	const L = (x1, y1, x2, y2) => (d += `M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}`);

	for (let n = 1; n < vLines; n++) {
		L(o.x1 + ogx * n, o.y1, i.x1 + igx * n, i.y1);
		L(o.x1 + ogx * n, o.y2, i.x1 + igx * n, i.y2);
	}
	for (let n = 0; n <= vLines; n++) {
		L(o.x1, o.y1 + ogy * n, i.x1, i.y1 + igy * n);
		L(o.x2, o.y1 + ogy * n, i.x2, i.y1 + igy * n);
	}
	const c = [
		[o.x1, o.y1, i.x1, i.y1],
		[o.x2, o.y1, i.x2, i.y1],
		[o.x2, o.y2, i.x2, i.y2],
		[o.x1, o.y2, i.x1, i.y2],
	];
	const at = (k, t) => [c[k][0] + (c[k][2] - c[k][0]) * t, c[k][1] + (c[k][3] - c[k][1]) * t];
	for (let n = 1; n < hLines; n++) {
		const t = 1 - Math.pow(1 - n / hLines, 2);
		for (let k = 0; k < 4; k++) {
			const a = at(k, t);
			const b = at((k + 1) % 4, t);
			L(a[0], a[1], b[0], b[1]);
		}
	}
	return d;
}

/* ---------- smoothed wheel scrolling for a native scroller (Lenis feel, no second Lenis) ---------- */

export class PaneScroll {
	constructor(el, { lerp = 0.12 } = {}) {
		this.el = el;
		this.lerp = lerp;
		this.cur = el.scrollTop;
		this.target = el.scrollTop;
		this.active = false;

		this._wheel = e => {
			if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
			const max = el.scrollHeight - el.clientHeight;
			if (max <= 0) return;
			const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? el.clientHeight : 1;
			if (!this.active) this.cur = this.target = el.scrollTop;
			e.preventDefault();
			this.target = clamp(this.target + e.deltaY * unit, 0, max);
			this.active = true;
		};
		this._scroll = () => {
			if (!this.active) this.cur = this.target = el.scrollTop;
		};
		el.addEventListener('wheel', this._wheel, { passive: false });
		el.addEventListener('scroll', this._scroll, { passive: true });
	}

	step() {
		if (!this.active) return;
		const d = this.target - this.cur;
		if (Math.abs(d) < 0.4) {
			this.cur = this.target;
			this.active = false;
		} else {
			this.cur += d * this.lerp;
		}
		this.el.scrollTop = this.cur;
	}

	destroy() {
		this.el.removeEventListener('wheel', this._wheel);
		this.el.removeEventListener('scroll', this._scroll);
	}
}

/* ---------- magnetic pull ---------- */

export class Magnet {
	constructor(el, { radius = 64, pull = 0.3 } = {}) {
		this.el = el;
		this.radius = radius;
		this.pull = pull;
		this.x = 0;
		this.y = 0;
	}

	step(ptr) {
		let tx = 0;
		let ty = 0;
		if (ptr) {
			const r = this.el.getBoundingClientRect();
			// the rect includes our own translate, so remove it to get the resting centre
			const cx = r.left + r.width / 2 - this.x;
			const cy = r.top + r.height / 2 - this.y;
			const dx = ptr.x - cx;
			const dy = ptr.y - cy;
			const reach = Math.max(r.width, r.height) / 2 + this.radius;
			if (Math.hypot(dx, dy) < reach) {
				tx = dx * this.pull;
				ty = dy * this.pull;
			}
		}
		this.x += (tx - this.x) * 0.18;
		this.y += (ty - this.y) * 0.18;
		if (Math.abs(this.x) < 0.05 && Math.abs(this.y) < 0.05 && !tx && !ty) {
			this.x = this.y = 0;
			if (this.el.style.translate) this.el.style.translate = '';
			return;
		}
		this.el.style.translate = `${this.x.toFixed(2)}px ${this.y.toFixed(2)}px`;
	}

	reset() {
		this.el.style.translate = '';
	}
}
