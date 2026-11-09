import App from '../App';

/**
 * Embed hardening, from measurement (see the report in the commit message):
 *  - sandbox: both sites only need scripts + their own origin. Popups are allowed (with escape, so the
 *    destination opens as a normal page) only for the interactive embed, because the nested Sketchfab viewer
 *    carries target=_blank credit links. Thumbnails are pointer-less previews and get neither.
 *  - allow: permissions are delegated only down the chain the embedded page itself declares
 *    (`autoplay; fullscreen; xr-spatial-tracking` on its Sketchfab iframe). Without it Chrome logs
 *    "Permissions policy violation: xr-spatial-tracking" in the nested frame and fullscreen/autoplay are off.
 *    accelerometer/gyroscope are deliberately NOT delegated: the page does not forward them to Sketchfab, so
 *    that residual warning exists identically when the site is opened on its own and cannot be fixed from here.
 *    Thumbnails never get autoplay (a muted preview must not be able to make sound) or fullscreen.
 */
const SANDBOX_LIVE = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
const SANDBOX_THUMB = 'allow-scripts allow-same-origin';
const ALLOW_LIVE = 'autoplay; fullscreen; xr-spatial-tracking';
const ALLOW_THUMB = 'xr-spatial-tracking';

// `load` is the only signal a cross-origin page gives, and it also fires for a refused (X-Frame-Options / CSP) or
// unreachable frame, so a missing `load` is the one failure we can see. (Checked against google.com, github.com, a
// dead host and a closed port: `load`, contentDocument, location errors, Resource Timing entries and window props
// are identical to a working site, so a refused frame cannot be told apart from the embedder. A site that must fall
// back to the art when it is not embeddable has to use `handshake`.) A slow site must never be mistaken for it:
// 3D pages on a slow link legitimately take tens of seconds, so the cut-off is generous and only frees a hung frame.
const HANG_MIN = 40000;
// After `load` the page still has to boot (WebGL scene, nested viewer). Thumbnails wait longer, in proportion to how
// slow the page was to load, so the wipe reveals a drawn scene instead of an empty canvas.
const SETTLE_MIN = 1200;
const SETTLE_MAX = 4500;

let seq = 0;

/**
 * A live-site preview inside a `.frame` element. The frame keeps its placeholder art underneath;
 * the iframe is revealed (a clip wipe in the Projects panels, a fade in the detail overlay, both driven by
 * the `.is-live` class) only once it has proven it can render (postMessage handshake, or `load`
 * when the embedded site can't send one) and is removed if it never does.
 * Non-interactive thumbnails are a scaled, pointer-transparent window: the cursor dot stays visible and a
 * click falls through to the panel. Interactive embeds (the overlay) take over the pointer, so the dot hides.
 *
 * pause(reason) / resume(reason): while any reason is held the iframe is `display: none`. That stops its rAF
 * (60 -> 0 fps) and the GPU work behind it, while the document stays alive (no reload, no `load` re-fire, same JS
 * state, same inner size: no resize storm on the way back). `visibility: hidden` was measured and rejected: it only
 * works while the frame is alone in its renderer process; as soon as a second frame of the same site is on screen
 * (the overlay's interactive iframe next to the thumbnail, the very case this exists for) Blink keeps ticking the
 * hidden one. A reveal that completes while paused is held back and plays on resume, so it is seen.
 */
export default class Embed {
	constructor(frame, { url, handshake = false, w = 1440, h = 900, interactive = false, timeout = 4000, hang = HANG_MIN }) {
		this.frame = frame;
		this.url = url;
		this.handshake = handshake;
		this.w = w;
		this.h = h;
		this.interactive = interactive;
		this.timeout = timeout;
		this.hang = hang;
		this.iframe = null;
		this.loaded = false;
		this.id = `${++seq}`;
		this.app = new App();

		this._holds = new Set();
		this._pendingLive = false;

		this._onMessage = e => {
			if (this.iframe && e.source === this.iframe.contentWindow && e.data && e.data.morena === 'ready') {
				this._live();
			}
		};
		this._enter = () => (this.app.mouse.mouse.style.opacity = '0');
		this._leave = () => (this.app.mouse.mouse.style.opacity = '');
	}

	get paused() {
		return this._holds.size > 0;
	}

	mount() {
		if (!this.url || this.iframe) return;

		const iframe = document.createElement('iframe');
		// attributes before `src`, and `src` before insertion: the frame never exists as a same-origin about:blank
		iframe.title = 'Live preview';
		iframe.referrerPolicy = 'no-referrer-when-downgrade';
		iframe.setAttribute('sandbox', this.interactive ? SANDBOX_LIVE : SANDBOX_THUMB);
		iframe.setAttribute('allow', this.interactive ? ALLOW_LIVE : ALLOW_THUMB);

		if (!this.interactive) {
			iframe.tabIndex = -1;
			iframe.inert = true;
			iframe.setAttribute('aria-hidden', 'true');
			iframe.width = this.w;
			iframe.height = this.h;
			this._ro = new ResizeObserver(() => this._scale());
			this._ro.observe(this.frame);
		}

		this._t0 = performance.now();
		this.loaded = false;
		window.addEventListener('message', this._onMessage);
		iframe.addEventListener('load', () => this._onLoad());

		if (this.interactive) {
			this.frame.addEventListener('mouseenter', this._enter);
			this.frame.addEventListener('mouseleave', this._leave);
		}

		iframe.src = this.url;
		if (this.paused) iframe.style.display = 'none';
		this.frame.appendChild(iframe);
		this.iframe = iframe;
		this._scale();
		this._mark('mount');

		// only a frame that never loads is given up on, and only after a long time
		this._timer = setTimeout(() => {
			if (!this.loaded && !this.frame.classList.contains('is-live')) this._blocked();
		}, Math.max(this.timeout, this.hang));
	}

	pause(reason = 'pause') {
		if (this._holds.has(reason)) return;
		this._holds.add(reason);
		this._apply();
	}

	resume(reason = 'pause') {
		if (!this._holds.delete(reason)) return;
		this._apply();
	}

	_apply() {
		const paused = this.paused;
		if (this.iframe) this.iframe.style.display = paused ? 'none' : '';
		this.frame.classList.toggle('is-paused', paused);
		if (!paused && this._pendingLive) {
			this._pendingLive = false;
			this._live();
		}
	}

	_onLoad() {
		if (!this.iframe) return;
		this.loaded = true;
		const took = performance.now() - this._t0;
		this._mark('load');
		clearTimeout(this._timer);
		if (this.handshake) {
			// the page is loaded: now it only has to say it is ready
			this._timer = setTimeout(() => {
				if (!this.frame.classList.contains('is-live') && !this._pendingLive) this._blocked();
			}, this.timeout);
			return;
		}
		// interactive: the overlay already hides the iframe behind its own art, a fixed beat is enough
		const settle = this.interactive ? SETTLE_MIN : Math.min(SETTLE_MAX, Math.max(SETTLE_MIN, took));
		this._settleTimer = setTimeout(() => this._live(), settle);
	}

	// Render the site at its design width, scaled to the frame's width, and let its viewport be as tall as the
	// frame needs so the thumbnail is always filled (no blank strip under a short page, nothing cropped).
	_scale() {
		if (!this.iframe || this.interactive) return;
		const fw = this.frame.clientWidth;
		const fh = this.frame.clientHeight;
		if (!fw) return;
		const k = fw / this.w;
		this.iframe.width = this.w;
		this.iframe.height = fh ? Math.round(fh / k) : this.h;
		this.iframe.style.transform = `scale(${k})`;
	}

	_live() {
		if (!this.iframe || this.frame.classList.contains('is-live')) return;
		if (this.paused) {
			this._pendingLive = true;
			return;
		}
		this.frame.classList.add('is-live');
		this._mark('live');
	}

	_blocked() {
		this.frame.classList.add('is-blocked');
		this.destroy();
	}

	_mark(name) {
		try {
			performance.mark(`embed:${this.id}:${name}`, { detail: { url: this.url } });
		} catch {}
	}

	// Back to the placeholder art, ready to mount again.
	release() {
		this.destroy();
		this.frame.classList.remove('is-live', 'is-blocked', 'is-paused');
		this._pendingLive = false;
	}

	destroy() {
		clearTimeout(this._timer);
		clearTimeout(this._settleTimer);
		window.removeEventListener('message', this._onMessage);
		if (this.interactive) {
			this.frame.removeEventListener('mouseenter', this._enter);
			this.frame.removeEventListener('mouseleave', this._leave);
			this._leave();
		}
		if (this._ro) this._ro.disconnect();
		this._ro = null;
		if (this.iframe) this.iframe.remove();
		this.iframe = null;
		this.loaded = false;
	}
}
