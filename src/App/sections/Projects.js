import '../css/projects.css';
import '../css/projects-fx.css';
import App from '../App';
import Embed from '../components/Embed';
import ProjectFx from '../components/ProjectFx';

// Mounts are staggered, and the next site waits (at most BUSY_CAP) for the previous one's `load`, so two heavy
// 3D pages never fight for the same bandwidth: the one the visitor is looking at finishes first.
const STAGGER = 1200;
const BUSY_CAP = 8000;

export default class Projects {
	constructor(element) {
		this.element = element;
		this.app = new App();

		this.panels = Array.from(this.element.querySelectorAll('.project-panel'));
		this.embeds = [];
		this.ready = false;
		this.overlayOpen = false;
		this._lastMount = -Infinity;

		this._setNavHeight();
		window.addEventListener('resize', () => this._setNavHeight());

		this._initEmbeds();
		this._bindOpen();
		this._bindOverlay();

		// reveals, 3D depth between the stacked panels, media tilt and the placeholder art
		this.fx = new ProjectFx(this);
	}

	_setNavHeight() {
		const nav = document.querySelector('.nav');
		if (nav) document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
	}

	// Live thumbnails: desktop, fine pointer, no data-saver only; mounted one at a time near the viewport.
	// Evaluated at every mount (not once), so a window dragged narrow stops them and widened lets them in.
	_canEmbed() {
		const saveData = navigator.connection && navigator.connection.saveData;
		return window.innerWidth > 750 && window.matchMedia('(pointer: fine)').matches && !saveData;
	}

	_initEmbeds() {
		this.panels.forEach(panel => {
			const frame = panel.querySelector('.frame[data-embed]');
			if (!frame || !frame.dataset.url) return;
			const embed = new Embed(frame, {
				url: frame.dataset.url,
				handshake: frame.dataset.handshake === 'true',
				w: Number(frame.dataset.w) || 1440,
				h: Number(frame.dataset.h) || 900,
			});
			this.embeds.push({ panel, embed, near: false, covered: false, mounted: false, at: 0 });
		});

		if (!this.embeds.length) return;

		// `near` = within a viewport of the screen. Mounting waits for it; a mounted site that wanders off is paused
		// (browsers throttle far-off cross-origin frames themselves, this makes it the same everywhere).
		this.embedObserver = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					const item = this.embeds.find(e => e.panel === entry.target);
					if (!item) return;
					item.near = entry.isIntersecting;
					if (item.mounted) item.embed[item.near ? 'resume' : 'pause']('far');
				});
				this._pump();
			},
			{ rootMargin: '100% 0px' }
		);
		this.embeds.forEach(item => this.embedObserver.observe(item.panel));

		this.compactMq = window.matchMedia('(width <= 750px)');
		this.compactMq.addEventListener('change', () => this._syncCompact());
	}

	// Called by Loading once the page is ready; also safe to call repeatedly.
	mountPending() {
		this.ready = true;
		this._pump();
	}

	// Mount the next waiting thumbnail, if now is a good moment. Event driven (observer, overlay close, resize,
	// a panel being uncovered): the only timers are the short wait for the previous site to settle and, rarely,
	// a re-check while the only candidate is buried.
	_pump() {
		clearTimeout(this._pumpTimer);
		if (!this.ready || this.overlayOpen || !this.embedObserver || !this._canEmbed()) return;
		const waiting = this.embeds.filter(e => e.near && !e.mounted);
		const next = waiting.find(e => !this._buried(e));
		if (!next) {
			// everything near is buried under the next panel (nobody is looking at it): look again shortly
			if (waiting.length) this._pumpTimer = setTimeout(() => this._pump(), 1500);
			return;
		}

		const now = performance.now();
		const busy = this.embeds.some(e => e.mounted && !e.embed.loaded && e.embed.iframe && now - e.at < BUSY_CAP);
		const wait = busy ? 400 : this._lastMount + STAGGER - now;
		if (wait > 0) {
			this._pumpTimer = setTimeout(() => this._pump(), wait);
			return;
		}

		next.mounted = true;
		next.at = this._lastMount = now;
		next.embed.mount();
		this._pump();
	}

	// True once the next panel has slid all the way over this one (it sticks at its own `top`). Read from layout, so
	// it is right on the very first observer callback, before ProjectFx has run a frame.
	_buried(item) {
		const next = this.panels[this.panels.indexOf(item.panel) + 1];
		if (!next || window.innerWidth <= 750) return false;
		const stuck = parseFloat(getComputedStyle(next).top) || 0;
		return next.getBoundingClientRect().top <= stuck + 2;
	}

	// A covered panel (another slid over it) is paused by ProjectFx; see ProjectFx._tick.
	setCovered(panel, covered) {
		const item = this.embeds.find(e => e.panel === panel);
		if (!item) return;
		item.covered = covered;
		if (item.mounted) item.embed[covered ? 'pause' : 'resume']('covered');
		else if (!covered) this._pump();
	}

	_syncCompact() {
		if (this._canEmbed()) {
			this._pump();
			return;
		}
		this.embeds.forEach(item => {
			if (!item.mounted) return;
			item.embed.release();
			item.mounted = false;
		});
	}

	// ---- detail overlay ---------------------------------------------------
	// While the detail page is open the same site runs a second time (the overlay's interactive iframe) and the
	// other panels' sites keep running behind it. Pause every thumbnail for the whole time, whichever project is
	// shown (prev / next inside the overlay changes the slug, not this). Pausing keeps the documents alive, so
	// nothing reloads on the way back. Thumbnails are woken as soon as the overlay *starts* closing: it keeps
	// covering them for another second, which is more than enough for the first frame to be drawn, so the close
	// ends on a live, running thumbnail instead of a blank one.

	_bindOverlay() {
		document.addEventListener('overlay:open', () => this._setOverlay(true));
		document.addEventListener('overlay:close', () => this._setOverlay(false));
		if (this.app.isOverlayOpen) this._setOverlay(true);
	}

	_setOverlay(open) {
		if (open === this.overlayOpen) return;
		this.overlayOpen = open;
		clearInterval(this._closing);
		this.embeds.forEach(item => item.embed[open ? 'pause' : 'resume']('overlay'));
		if (open) {
			this._closing = setInterval(() => {
				if (this.app.overlay && this.app.overlay.closing) this._setOverlay(false);
			}, 60);
		} else {
			this._pump();
		}
	}

	_bindOpen() {
		this.panels.forEach(panel => {
			const slug = panel.dataset.slug;
			const media = panel.querySelector('.project-media');
			const open = panel.querySelector('.project-open');

			media.addEventListener('click', e => {
				e.preventDefault();
				this.app.overlay.open(slug, media);
			});
			open.addEventListener('click', e => {
				e.preventDefault();
				this.app.overlay.open(slug, media, open);
			});
		});
	}
}
