/**
 * Per-panel media interaction for the Projects stack.
 *  - Pointer tilt on `.pm-tilt`: the About / Scattered pattern (perspective 1000px, +-12deg, 300ms in /
 *    500ms reset, finished animations committed and cancelled so they never pile up).
 *  - A one-point-perspective "tunnel" of hairlines (the Awards grid in miniature) redrawn each frame from the
 *    field edge to the floating window, with a lerped vanishing offset that follows the pointer and scroll.
 *  - The cursor dot turns into an ink disc with an "Open" label over the frame (Contact.js pattern, through
 *    app.mouse.mouse), and presses in on mousedown.
 */

const Z_WINDOW = 36; // keep in sync with .pm-window translateZ
const Z_FRONT = 64; // marks + readout (the star floats at 72)
const Z_STAR = 72;
const MAX_TILT = 12;

export default class ProjectMedia {
	constructor(panel, app, { tilt }) {
		this.panel = panel;
		this.app = app;
		this.media = panel.querySelector('.project-media');
		this.tiltEl = panel.querySelector('.pm-tilt');
		this.win = panel.querySelector('.pm-window');
		this.svg = panel.querySelector('.pm-tunnel');
		this.path = panel.querySelector('.pm-tunnel-path');
		this.readout = panel.querySelector('.pm-readout');
		this.marks = [...panel.querySelectorAll('.pm-mark, .pm-readout')];
		this.star = panel.querySelector('.pm-star');
		this.dot = app.mouse && app.mouse.mouse;

		// current / target vanishing offset (px) and scroll parallax (px)
		this.vx = 0;
		this.vy = 0;
		this.tx = 0;
		this.ty = 0;
		this.oy = 0;
		this.toy = 0;
		this.drawn = '';

		this.tiltOptions = { duration: 300, fill: 'forwards', easing: 'ease-out' };
		this.resetOptions = { duration: 500, fill: 'forwards', easing: 'ease-out' };
		this.resetFrames = { transform: 'none' };

		this.measure();
		this.ro = new ResizeObserver(() => {
			this.measure();
			this.draw(true);
		});
		this.ro.observe(this.media);

		if (this.dot) this._bindDot();
		if (tilt) this._bindTilt();
	}

	// ---- geometry --------------------------------------------------------

	measure() {
		this.W = this.tiltEl.clientWidth;
		this.H = this.tiltEl.clientHeight;
		this.compact = window.innerWidth <= 750;
	}

	// Lerp toward the targets and redraw only when something actually moved.
	tick(q = 0.5, motion = true) {
		this.toy = motion ? 16 * (q * 2 - 1) : 0;
		this.vx += (this.tx - this.vx) * 0.14;
		this.vy += (this.ty - this.vy) * 0.14;
		this.oy += (this.toy - this.oy) * 0.2;

		if (Math.abs(this.tx - this.vx) < 0.01) this.vx = this.tx;
		if (Math.abs(this.ty - this.vy) < 0.01) this.vy = this.ty;
		if (Math.abs(this.toy - this.oy) < 0.01) this.oy = this.toy;

		const key = `${this.vx.toFixed(2)}|${this.vy.toFixed(2)}|${this.oy.toFixed(2)}`;
		if (key === this.drawn) return;
		this.drawn = key;
		this.draw();

		// the window and the tunnel's far end ride together; the front layers counter-move for depth
		const off = (-this.oy * 0.7).toFixed(2);
		this.win.style.translate = `0 ${this.oy.toFixed(2)}px ${Z_WINDOW}px`;
		this.marks.forEach(el => (el.style.translate = `0 ${off}px ${Z_FRONT}px`));
		if (this.star) this.star.style.translate = `0 ${off}px ${Z_STAR}px`;
	}

	draw(force = false) {
		if (!this.path || !this.W) return;
		const { W, H } = this;
		const w = this.win.offsetWidth;
		const h = this.win.offsetHeight;
		if (!w || !h) return;

		// far end sits a little inside the window so a small offset never exposes a gap
		const inset = 10;
		const ix = this.win.offsetLeft + inset + this.vx;
		const iy = this.win.offsetTop + inset + this.oy + this.vy;
		const iw = w - inset * 2;
		const ih = h - inset * 2;

		const nx = this.compact ? 6 : 10;
		const ny = this.compact ? 4 : 7;
		let d = '';

		for (let i = 0; i <= nx; i++) {
			const u = i / nx;
			d += `M${(W * u).toFixed(1)} 0L${(ix + iw * u).toFixed(1)} ${iy.toFixed(1)}`;
			d += `M${(W * u).toFixed(1)} ${H}L${(ix + iw * u).toFixed(1)} ${(iy + ih).toFixed(1)}`;
		}
		for (let j = 1; j < ny; j++) {
			const u = j / ny;
			d += `M0 ${(H * u).toFixed(1)}L${ix.toFixed(1)} ${(iy + ih * u).toFixed(1)}`;
			d += `M${W} ${(H * u).toFixed(1)}L${(ix + iw).toFixed(1)} ${(iy + ih * u).toFixed(1)}`;
		}
		// rings, spaced like the Awards grid (dense toward the far end)
		for (let k = 1; k < 4; k++) {
			const t = 1 - Math.pow(1 - k / 4, 2);
			const x1 = Math.round(ix * t) + 0.5;
			const y1 = Math.round(iy * t) + 0.5;
			const x2 = Math.round(W + (ix + iw - W) * t) + 0.5;
			const y2 = Math.round(H + (iy + ih - H) * t) + 0.5;
			d += `M${x1} ${y1}H${x2}V${y2}H${x1}Z`;
		}
		this.path.setAttribute('d', d);
		if (force) this.drawn = '';
	}

	// ---- cursor dot ------------------------------------------------------

	// The dot's own transform is driven by Mouse.js, so the ink disc and its label live in ::before / ::after
	// (see projects-fx.css) and are toggled by class: turn ink over the frame, press in on mousedown.
	_bindDot() {
		const dot = this.dot;
		this.media.addEventListener('mouseenter', () => dot.classList.add('is-view'));
		this.media.addEventListener('mouseleave', () => dot.classList.remove('is-view', 'is-press'));
		this.media.addEventListener('mousedown', () => dot.classList.add('is-press'));
		this.media.addEventListener('mouseup', () => dot.classList.remove('is-press'));
	}

	// ---- tilt (About / Scattered pattern) --------------------------------

	_cleanupAnimation(anim, target, clearTransform = false) {
		if (!anim || !anim.finished || typeof anim.finished.then !== 'function') return;
		anim.finished
			.then(() => {
				if (target && target.isConnected !== false) {
					if (typeof anim.commitStyles === 'function') {
						try {
							anim.commitStyles();
						} catch {}
					}
					if (clearTransform && target.style) {
						target.style.transform = '';
					}
				}
				if (typeof anim.cancel === 'function') {
					anim.cancel();
				}
			})
			.catch(() => {});
	}

	_bindTilt() {
		const media = this.media;
		let resetTimeout = null;
		const handleMove = e => this._handleTilt(e);

		media.addEventListener('mouseenter', () => {
			if (resetTimeout !== null) {
				clearTimeout(resetTimeout);
				resetTimeout = null;
			}
			this.tiltEl.classList.add('is-hover');
			media.addEventListener('mousemove', handleMove);
		});

		media.addEventListener('mouseleave', () => {
			media.removeEventListener('mousemove', handleMove);
			this.tx = 0;
			this.ty = 0;
			resetTimeout = setTimeout(() => {
				this._handleReset();
				this.tiltEl.classList.remove('is-hover');
				if (this.readout) this.readout.textContent = ''; // hidden again at rest (:empty)
			}, 200);
		});
	}

	_handleTilt(e) {
		const rect = this.media.getBoundingClientRect();
		const halfWidth = rect.width / 2 || 1;
		const halfHeight = rect.height / 2 || 1;
		const offsetX = e.clientX - rect.left - rect.width / 2;
		const offsetY = e.clientY - rect.top - rect.height / 2;

		const normX = Math.max(-1, Math.min(1, offsetX / halfWidth));
		const normY = Math.max(-1, Math.min(1, offsetY / halfHeight));

		const tiltX = -(normY * MAX_TILT);
		const tiltY = normX * MAX_TILT;

		const keyframes = {
			transform: `
				perspective(1000px)
				rotateX(${tiltX}deg)
				rotateY(${tiltY}deg)
			`,
		};

		const anim = this.tiltEl.animate(keyframes, this.tiltOptions);
		this._cleanupAnimation(anim, this.tiltEl, false);

		// keep the tunnel's far end attached to the window as the window shifts with the tilt
		const rad = Math.PI / 180;
		this.tx = Z_WINDOW * Math.sin(tiltY * rad);
		this.ty = -Z_WINDOW * Math.sin(tiltX * rad);
		this._readout(tiltX, tiltY);
	}

	_handleReset() {
		const anim = this.tiltEl.animate(this.resetFrames, this.resetOptions);
		this._cleanupAnimation(anim, this.tiltEl, true);
	}

	_readout(rx, ry) {
		if (!this.readout) return;
		const f = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).padStart(4, '0');
		this.readout.textContent = `(RX ${f(rx)}° RY ${f(ry)}°)`;
	}

	destroy() {
		if (this.ro) this.ro.disconnect();
	}
}
