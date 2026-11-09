import '../css/overlay-poster.css';
import { clamp } from './OverlayFx';
import { prefersReducedMotion } from '../utils/constants';

/**
 * Poster viewer for an image-type project: the image fits the frame (contain); a click, the wheel, a trackpad or touch
 * pinch, or the +/- keys zoom toward the pointer, a drag pans, and the full-resolution render loads on the first zoom.
 * Motion is lerped toward a target (snapped under reduced motion). Cleans up everything it adds in destroy().
 */

export const posterHTML = (imgHTML, label) => `
	<div class="ov-poster">
		<div class="ov-poster-view" tabindex="0" role="group" aria-label="${label}: poster viewer. Plus and minus zoom, arrow keys pan, 0 resets.">${imgHTML}</div>
		<div class="ov-poster-ctl">
			<span class="ov-pc-l">Zoom</span>
			<button type="button" class="ov-pc-b" data-pz="out" aria-label="Zoom out">−</button>
			<button type="button" class="ov-pc-b" data-pz="in" aria-label="Zoom in">+</button>
			<button type="button" class="ov-pc-b ov-pc-reset" data-pz="reset">Reset</button>
			<span class="ov-pc-st" aria-live="polite"></span>
		</div>
	</div>`;

const CLICK_ZOOM = 3; // x the fitted size
const STEP = 1.6; // per +/- press or button
const EASE = 0.2;

export default class OverlayPoster {
	constructor(root, { full = '', w = 3402, h = 3888, touch = false } = {}) {
		this.root = root;
		this.view = root.querySelector('.ov-poster-view');
		this.img = root.querySelector('.ov-poster-img');
		this.st = root.querySelector('.ov-pc-st');
		this.full = full;
		this.nw = w;
		this.nh = h;
		this.touch = touch;

		this.s = this.ts = 1;
		this.x = this.tx = 0;
		this.y = this.ty = 0;
		this.vw = this.vh = this.fw = this.fh = 0;
		this.maxS = 6;
		this.raf = 0;
		this.pointers = new Map();
		this.drag = null;
		this.pinch = null;
		this.fullState = ''; // '' | 'loading' | 'ready' | 'failed'
		this.dead = false;

		this._hint();
		this._bind();
		this.ro = new ResizeObserver(() => this.layout());
		this.ro.observe(this.view);
		this.layout();
	}

	/* ---------- layout ---------- */

	layout() {
		if (this.dead) return;
		const vw = this.view.clientWidth;
		const vh = this.view.clientHeight;
		if (!vw || !vh) return;
		// the aspect of the declared full size, so swapping in the full render never shifts the layout
		const ar = this.nw / this.nh;
		this.pad = Math.round(Math.min(vw, vh) * 0.03);
		const fit = Math.min((vw - this.pad * 2) / ar, vh - this.pad * 2);
		this.fh = fit;
		this.fw = fit * ar;
		this.vw = vw;
		this.vh = vh;
		// enough zoom to see the full render at about its own pixels
		this.maxS = Math.max(3, (this.nw / this.fw) * 1.25);
		this.ls = 0; // forces _paint to re-size the image
		this._clamp();
		this.s = this.ts;
		this.x = this.tx;
		this.y = this.ty;
		this._paint();
	}

	_clamp() {
		this.ts = clamp(this.ts, 1, this.maxS);
		const mx = Math.max(0, (this.fw * this.ts - this.vw) / 2 + this.pad);
		const my = Math.max(0, (this.fh * this.ts - this.vh) / 2 + this.pad);
		this.tx = clamp(this.tx, -mx, mx);
		this.ty = clamp(this.ty, -my, my);
	}

	_paint() {
		// The image is laid out at a power-of-two multiple of its fitted size and only the remainder (0.7x to 1.4x) is
		// a CSS scale: the compositor caps a layer's raster scale at 5x, so scaling the small element alone turns to mush.
		const ls = 2 ** Math.round(Math.log2(Math.max(1, this.s)));
		if (ls !== this.ls) {
			this.ls = ls;
			const st = this.img.style;
			const w = this.fw * ls;
			const h = this.fh * ls;
			st.width = `${w}px`;
			st.height = `${h}px`;
			st.left = `${(this.vw - w) / 2}px`;
			st.top = `${(this.vh - h) / 2}px`;
		}
		this.img.style.transform = `translate3d(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px, 0) scale(${(this.s / ls).toFixed(4)})`;
		this.root.classList.toggle('is-zoomed', this.ts > 1.02);
		// at fit a one-finger drag scrolls the page (phones); zoomed, the poster owns the gesture
		this.view.style.touchAction = this.ts > 1.02 ? 'none' : 'pan-y';
	}

	/* ---------- motion ---------- */

	_go() {
		this._clamp();
		if (prefersReducedMotion()) {
			this.s = this.ts;
			this.x = this.tx;
			this.y = this.ty;
			this._paint();
			this._status();
			return;
		}
		if (!this.raf) this.raf = requestAnimationFrame(() => this._step());
		this._status();
	}

	_step() {
		this.raf = 0;
		if (this.dead) return;
		this.s += (this.ts - this.s) * EASE;
		this.x += (this.tx - this.x) * EASE;
		this.y += (this.ty - this.y) * EASE;
		const done = Math.abs(this.ts - this.s) < 0.002 && Math.abs(this.tx - this.x) < 0.2 && Math.abs(this.ty - this.y) < 0.2;
		if (done) {
			this.s = this.ts;
			this.x = this.tx;
			this.y = this.ty;
		}
		this._paint();
		if (!done) this.raf = requestAnimationFrame(() => this._step());
	}

	// Zoom to scale `ns` keeping the image point under (cx, cy) (view-centre coordinates) fixed.
	zoomTo(ns, cx = 0, cy = 0, snap = false) {
		ns = clamp(ns, 1, this.maxS);
		const k = ns / this.ts;
		this.tx = cx - (cx - this.tx) * k;
		this.ty = cy - (cy - this.ty) * k;
		this.ts = ns;
		if (ns > 1.05) this._ensureFull();
		if (ns <= 1.001) this.tx = this.ty = 0;
		this._go();
		if (snap) {
			this.s = this.ts;
			this.x = this.tx;
			this.y = this.ty;
			this._paint();
		}
	}

	zoomBy(f, cx = 0, cy = 0) {
		this.zoomTo(this.ts * f, cx, cy);
	}

	reset() {
		this.ts = 1;
		this.tx = this.ty = 0;
		this._go();
	}

	panBy(dx, dy) {
		this.tx += dx;
		this.ty += dy;
		this._go();
	}

	/* ---------- full-resolution render ---------- */

	_ensureFull() {
		if (!this.full || this.fullState) return;
		this.fullState = 'loading';
		this._status();
		const im = new Image();
		im.decoding = 'async';
		im.src = this.full;
		const ok = () => {
			if (this.dead) return;
			this.fullState = 'ready';
			this.img.src = this.full;
			this._status();
		};
		const fail = () => {
			if (this.dead) return;
			this.fullState = 'failed';
			this._status();
		};
		if (im.decode) im.decode().then(ok, fail);
		else {
			im.onload = ok;
			im.onerror = fail;
		}
	}

	/* ---------- status line ---------- */

	_hint() {
		this.st.textContent = this.touch ? 'Pinch to zoom' : 'Click or scroll to zoom · drag to pan';
	}

	_status() {
		if (this.fullState === 'loading' && this.ts > 1.05) this.st.textContent = 'Loading full resolution…';
		else if (this.ts > 1.02) this.st.textContent = `${this.ts.toFixed(1)}×`;
		else this._hint();
	}

	/* ---------- input ---------- */

	_rel(e) {
		const r = this.view.getBoundingClientRect();
		// the frame can be tilted a hair: measure from the layout box, which is what the pointer maths needs
		return { x: e.clientX - r.left - this.vw / 2, y: e.clientY - r.top - this.vh / 2 };
	}

	_bind() {
		const v = this.view;

		this._wheel = e => {
			e.preventDefault();
			const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
			const d = -e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0018);
			const p = this._rel(e);
			this.zoomTo(this.ts * Math.exp(d), p.x, p.y);
		};
		this._down = e => {
			if (e.pointerType === 'mouse' && e.button !== 0) return;
			this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
			try {
				v.setPointerCapture(e.pointerId);
			} catch {}
			if (this.pointers.size === 1) {
				this.drag = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty, t: performance.now(), moved: false };
			} else if (this.pointers.size === 2) {
				const [a, b] = [...this.pointers.values()];
				this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, ts: this.ts, tx: this.tx, ty: this.ty, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
				if (this.drag) this.drag.moved = true;
			}
		};
		this._move = e => {
			const p = this.pointers.get(e.pointerId);
			if (!p) return;
			p.x = e.clientX;
			p.y = e.clientY;
			if (this.pointers.size >= 2 && this.pinch) {
				const [a, b] = [...this.pointers.values()];
				const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
				const cx = (a.x + b.x) / 2;
				const cy = (a.y + b.y) / 2;
				const r = this.view.getBoundingClientRect();
				const ns = clamp(this.pinch.ts * (d / this.pinch.d), 1, this.maxS);
				const k = ns / this.pinch.ts;
				const ox = this.pinch.cx - r.left - this.vw / 2;
				const oy = this.pinch.cy - r.top - this.vh / 2;
				// zoom about where the fingers started, then follow their midpoint
				this.ts = ns;
				this.tx = ox - (ox - this.pinch.tx) * k + (cx - this.pinch.cx);
				this.ty = oy - (oy - this.pinch.ty) * k + (cy - this.pinch.cy);
				if (ns > 1.05) this._ensureFull();
				this._go();
				return;
			}
			if (!this.drag) return;
			const dx = e.clientX - this.drag.x;
			const dy = e.clientY - this.drag.y;
			if (!this.drag.moved && Math.hypot(dx, dy) < 5) return;
			this.drag.moved = true;
			if (this.ts <= 1.02) return; // nothing to pan at fit
			this.root.classList.add('is-drag');
			this.tx = this.drag.tx + dx;
			this.ty = this.drag.ty + dy;
			this._go();
			// dragging follows the hand: no easing lag
			this.x = this.tx;
			this.y = this.ty;
			this._paint();
		};
		this._up = e => {
			if (!this.pointers.has(e.pointerId)) return;
			const wasDrag = this.drag;
			this.pointers.delete(e.pointerId);
			try {
				v.releasePointerCapture(e.pointerId);
			} catch {}
			if (this.pointers.size < 2) this.pinch = null;
			if (this.pointers.size === 0) {
				this.root.classList.remove('is-drag');
				this.drag = null;
				// a click (or tap) that did not travel toggles the zoom
				if (e.type === 'pointerup' && wasDrag && !wasDrag.moved && performance.now() - wasDrag.t < 450) {
					if (this.ts > 1.02) this.reset();
					else {
						const p = this._rel(e);
						this.zoomTo(CLICK_ZOOM, p.x, p.y);
					}
				}
			}
		};
		this._key = e => {
			if (this.handleKey(e)) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		this._ctl = e => {
			const b = e.target.closest('[data-pz]');
			if (!b) return;
			if (b.dataset.pz === 'in') this.zoomBy(STEP);
			else if (b.dataset.pz === 'out') this.zoomBy(1 / STEP);
			else this.reset();
		};

		v.addEventListener('wheel', this._wheel, { passive: false });
		v.addEventListener('pointerdown', this._down);
		v.addEventListener('pointermove', this._move);
		v.addEventListener('pointerup', this._up);
		v.addEventListener('pointercancel', this._up);
		v.addEventListener('keydown', this._key);
		this.root.querySelector('.ov-poster-ctl').addEventListener('click', this._ctl);
	}

	// +, -, 0 always; the arrows pan only while zoomed (at fit they belong to the page turn). True when consumed.
	handleKey(e) {
		if (e.altKey || e.ctrlKey || e.metaKey) return false;
		if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return false;
		const k = e.key;
		if (k === '+' || k === '=') this.zoomBy(STEP);
		else if (k === '-' || k === '_') this.zoomBy(1 / STEP);
		else if (k === '0') this.reset();
		else if (this.ts > 1.02 && k.startsWith('Arrow')) {
			const d = e.shiftKey ? 320 : 100;
			this.panBy(k === 'ArrowLeft' ? d : k === 'ArrowRight' ? -d : 0, k === 'ArrowUp' ? d : k === 'ArrowDown' ? -d : 0);
		} else return false;
		return true;
	}

	destroy() {
		if (this.dead) return;
		this.dead = true;
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		const v = this.view;
		v.removeEventListener('wheel', this._wheel);
		v.removeEventListener('pointerdown', this._down);
		v.removeEventListener('pointermove', this._move);
		v.removeEventListener('pointerup', this._up);
		v.removeEventListener('pointercancel', this._up);
		v.removeEventListener('keydown', this._key);
		this.root.querySelector('.ov-poster-ctl').removeEventListener('click', this._ctl);
		this.pointers.clear();
	}
}
