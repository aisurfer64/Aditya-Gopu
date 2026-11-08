import App from '../App';

/**
 * A live-site preview inside a `.frame` element. The frame keeps its placeholder art underneath;
 * the iframe is revealed (a clip wipe in the Projects panels, a fade in the detail overlay, both driven by
 * the `.is-live` class) only once it has proven it can render (postMessage handshake, or `load`
 * when the embedded site can't send one) and is removed if it never does.
 * Non-interactive thumbnails are a scaled, pointer-transparent window: the cursor dot stays visible and a
 * click falls through to the panel. Interactive embeds (the overlay) take over the pointer, so the dot hides.
 */
export default class Embed {
	constructor(frame, { url, handshake = false, w = 1440, h = 900, interactive = false, timeout = 4000 }) {
		this.frame = frame;
		this.url = url;
		this.handshake = handshake;
		this.w = w;
		this.h = h;
		this.interactive = interactive;
		this.timeout = timeout;
		this.iframe = null;
		this.app = new App();

		this._onMessage = e => {
			if (this.iframe && e.source === this.iframe.contentWindow && e.data && e.data.morena === 'ready') {
				this._live();
			}
		};
		this._enter = () => (this.app.mouse.mouse.style.opacity = '0');
		this._leave = () => (this.app.mouse.mouse.style.opacity = '');
	}

	mount() {
		if (!this.url || this.iframe) return;

		const iframe = document.createElement('iframe');
		iframe.src = this.url;
		iframe.title = 'Live preview';
		iframe.referrerPolicy = 'no-referrer-when-downgrade';
		iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');

		if (!this.interactive) {
			iframe.tabIndex = -1;
			iframe.setAttribute('aria-hidden', 'true');
			iframe.width = this.w;
			iframe.height = this.h;
			this._ro = new ResizeObserver(() => this._scale());
			this._ro.observe(this.frame);
		}

		window.addEventListener('message', this._onMessage);
		if (!this.handshake) iframe.addEventListener('load', () => setTimeout(() => this._live(), 1200));

		if (this.interactive) {
			this.frame.addEventListener('mouseenter', this._enter);
			this.frame.addEventListener('mouseleave', this._leave);
		}

		this.frame.appendChild(iframe);
		this.iframe = iframe;
		this._scale();

		this._timer = setTimeout(() => {
			if (!this.frame.classList.contains('is-live')) this._blocked();
		}, this.timeout + (this.handshake ? 0 : 1200));
	}

	// Render the site at its design width, scaled to the frame's width, and let its viewport be as tall as the
	// frame needs so the thumbnail is always filled (no blank strip under a short page).
	_scale() {
		if (!this.iframe || this.interactive) return;
		const fw = this.frame.clientWidth;
		const fh = this.frame.clientHeight;
		if (!fw) return;
		const k = fw / this.w;
		this.iframe.width = this.w;
		this.iframe.height = fh ? Math.max(this.h, Math.round(fh / k)) : this.h;
		this.iframe.style.transform = `scale(${k})`;
	}

	_live() {
		this.frame.classList.add('is-live');
	}

	_blocked() {
		this.frame.classList.add('is-blocked');
		this.destroy();
	}

	destroy() {
		clearTimeout(this._timer);
		window.removeEventListener('message', this._onMessage);
		if (this.interactive) {
			this.frame.removeEventListener('mouseenter', this._enter);
			this.frame.removeEventListener('mouseleave', this._leave);
			this._leave();
		}
		if (this._ro) this._ro.disconnect();
		if (this.iframe) this.iframe.remove();
		this.iframe = null;
	}
}
