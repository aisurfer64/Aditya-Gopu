import '../css/projects.css';
import App from '../App';
import Embed from '../components/Embed';

export default class Projects {
	constructor(element) {
		this.element = element;
		this.app = new App();

		this.panels = Array.from(this.element.querySelectorAll('.project-panel'));
		this.embeds = [];
		this.queue = [];

		this._setNavHeight();
		window.addEventListener('resize', () => this._setNavHeight());

		this._initReveal();
		this._initEmbeds();
		this._bindOpen();
	}

	_setNavHeight() {
		const nav = document.querySelector('.nav');
		if (nav) document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
	}

	_initReveal() {
		this.revealObserver = new IntersectionObserver(
			entries =>
				entries.forEach(entry => {
					if (!entry.isIntersecting) return;
					entry.target.classList.add('is-revealed');
					this.revealObserver.unobserve(entry.target);
				}),
			{ threshold: 0.25 }
		);
		this.panels.forEach(panel => this.revealObserver.observe(panel));
	}

	// Live thumbnails: desktop, fine pointer, no data-saver only; mounted one at a time near the viewport.
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
			this.embeds.push({ panel, embed, near: false, mounted: false });
		});

		if (!this.embeds.length || !this._canEmbed()) return;

		this.embedObserver = new IntersectionObserver(
			entries =>
				entries.forEach(entry => {
					const item = this.embeds.find(e => e.panel === entry.target);
					if (item) item.near = entry.isIntersecting;
				}),
			{ rootMargin: '100% 0px' }
		);
		this.embeds.forEach(item => this.embedObserver.observe(item.panel));
	}

	// Called by Loading once the page is ready; also safe to call repeatedly.
	mountPending() {
		if (!this.embedObserver) return;
		const next = this.embeds.find(e => e.near && !e.mounted);
		if (next) {
			next.mounted = true;
			next.embed.mount();
		}
		if (this.embeds.some(e => !e.mounted)) setTimeout(() => this.mountPending(), 1200);
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
