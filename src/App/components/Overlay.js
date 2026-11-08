import '../css/overlay.css';
import App from '../App';
import Embed from './Embed';
import { projects } from '../utils/content';
import { pageFrames, power3out, power4out, prefersReducedMotion } from '../utils/constants';

const esc = s =>
	String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Full-screen project detail page. Mounted on <body> at z-index 500 (nav 99, cursor 999).
 * Pauses Lenis, flags `app.isOverlayOpen` so Section scroll-locks stay quiet, makes the rest
 * of the page inert, and owns history (#projects/<slug>) so Back and Escape both close it.
 */
export default class Overlay {
	constructor() {
		this.app = new App();
		this.root = null;
		this.index = -1;
		this.busy = false;
		this.pushed = false;
		this.embed = null;

		window.addEventListener('popstate', e => this._onPop(e));
		document.addEventListener('keydown', e => this._onKey(e));
	}

	// ---- public ----------------------------------------------------------

	open(slug, originEl, trigger = null, { fromHistory = false } = {}) {
		const i = projects.findIndex(p => p.slug === slug);
		if (i < 0 || this.root || this.busy) return;

		this.busy = true;
		this.index = i;
		this.trigger = trigger || originEl || null;

		this.root = document.createElement('div');
		this.root.className = 'overlay';
		this.root.setAttribute('role', 'dialog');
		this.root.setAttribute('aria-modal', 'true');
		this.root.setAttribute('aria-labelledby', 'ov-title');
		this.root.innerHTML = `
			<div class="ov-bar">
				<span><span class="ov-idx"></span> <span class="ov-count"></span></span>
				<span class="ov-nav">
					<button type="button" data-ov="prev">‹ Prev</button>
					<button type="button" data-ov="next">Next ›</button>
				</span>
				<button type="button" class="ov-close" data-ov="close">Close ✕</button>
			</div>
			<div class="ov-main"></div>`;
		document.body.appendChild(this.root);
		this.root.addEventListener('click', e => {
			const b = e.target.closest('[data-ov]');
			if (!b) return;
			if (b.dataset.ov === 'close') this._requestClose();
			else this._swap(b.dataset.ov === 'next' ? 1 : -1);
		});

		this.savedY = window.scrollY;
		this.app.isOverlayOpen = true;
		this.app.scroll.stop();
		[...document.body.children].forEach(el => {
			if (el !== this.root && !el.classList.contains('mouse')) el.inert = true;
		});

		this._fill(projects[i]);

		const slugHash = `#projects/${slug}`;
		if (!fromHistory) {
			history.pushState({ project: slug }, '', slugHash);
			this.pushed = true;
		} else {
			this.pushed = false;
		}

		this.root.querySelector('.ov-close').focus({ preventScroll: true });

		const rect = originEl ? originEl.getBoundingClientRect() : null;
		this._animateOpen(rect).then(() => {
			this.busy = false;
		});
	}

	// Deep link support: App captures the hash before resetToTop strips it.
	openFromHash() {
		const m = (this.app.initialHash || '').match(/^#projects\/([\w-]+)$/);
		if (!m) return;
		history.replaceState({ project: m[1] }, '', this.app.initialHash);
		this.open(m[1], null, null, { fromHistory: true });
	}

	// ---- content ---------------------------------------------------------

	_fill(p) {
		this.root.querySelector('.ov-idx').textContent = `(${p.id})`;
		this.root.querySelector('.ov-count').textContent = p.n;

		const link = p.link && p.link.label
			? p.link.href
				? `<span class="hover"><a href="${esc(p.link.href)}" target="_blank" rel="noopener">${esc(p.link.label)} ↗</a></span>`
				: `<span>${esc(p.link.label)} · link pending</span>`
			: '';

		let stage = '';
		let bar = '';
		if (p.media.type === 'embed') {
			bar = `<span>${p.media.url ? `Live · ${esc(p.media.url)}` : 'Site link pending'}</span>${
				p.media.url ? `<span class="hover"><a href="${esc(p.media.url)}" target="_blank" rel="noopener">Open in new tab ↗</a></span>` : ''
			}`;
			stage = `<div class="frame hatch" data-embed></div>`;
		} else if (p.media.type === 'image') {
			bar = `<span>${p.media.src ? 'Poster' : 'Image pending'}</span>`;
			stage = `<div class="frame hatch">${p.media.src ? `<img src="${esc(p.media.src)}" alt="${esc(p.media.alt)}" />` : ''}</div>`;
		} else {
			bar = `<span>Code</span>`;
			stage = `<div class="frame hatch"><pre class="code">${esc(p.media.snippet)}</pre></div>`;
		}

		const main = this.root.querySelector('.ov-main');
		main.innerHTML = `
			<div class="ov-text" data-lenis-prevent>
				<h2 class="ov-title ov-title-anim" id="ov-title">${esc(p.title)}</h2>
				<p class="ov-summary ov-reveal">${esc(p.summary)}</p>
				<div class="ov-body ov-reveal">${p.body.map(t => `<p>${esc(t)}</p>`).join('')}</div>
				<dl class="ov-facts ov-reveal">${p.facts.map(f => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>
				<div class="ov-links ov-reveal">
					${link}
					<span class="hover"><a href="#" data-ov="next">Next: ${esc(projects[(this.index + 1) % projects.length].title)} →</a></span>
				</div>
			</div>
			<div class="ov-media" data-lenis-prevent>
				<div class="ov-mediabar">${bar}</div>
				<div class="ov-stage">${stage}</div>
			</div>`;

		main.querySelectorAll('a[data-ov]').forEach(a =>
			a.addEventListener('click', e => {
				e.preventDefault();
				this._swap(1);
			})
		);

		if (this.embed) this.embed.destroy();
		this.embed = null;
		const frame = main.querySelector('.frame[data-embed]');
		if (frame && p.media.url) {
			this.embed = new Embed(frame, {
				url: p.media.url,
				handshake: !!p.media.handshake,
				interactive: true,
				timeout: 6000,
			});
			this.embed.mount();
			setTimeout(() => {
				if (frame.classList.contains('is-blocked')) {
					const note = document.createElement('p');
					note.className = 'ov-fallback';
					note.textContent = 'This site can’t be embedded here. Open it in a new tab ↗';
					frame.parentElement.appendChild(note);
				}
			}, 6500 + (p.media.handshake ? 0 : 1200));
		}
	}

	// ---- animation -------------------------------------------------------

	_staggerIn() {
		if (prefersReducedMotion()) return;
		const title = this.root.querySelector('.ov-title-anim');
		if (title) title.animate(pageFrames, { duration: 800, easing: power4out, fill: 'backwards', delay: 350 });
		this.root.querySelectorAll('.ov-reveal').forEach((el, i) =>
			el.animate(
				[
					{ opacity: 0, transform: 'translateY(24px)' },
					{ opacity: 1, transform: 'none' },
				],
				{ duration: 700, easing: power3out, fill: 'backwards', delay: 450 + i * 60 }
			)
		);
	}

	async _animateOpen(rect) {
		this._staggerIn();
		if (prefersReducedMotion() || !rect) {
			const a = this.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: power3out });
			await a.finished;
			return;
		}
		const from = `inset(${rect.top}px ${innerWidth - rect.right}px ${innerHeight - rect.bottom}px ${rect.left}px)`;
		const a = this.root.animate([{ clipPath: from }, { clipPath: 'inset(0px)' }], {
			duration: 900,
			easing: power4out,
		});
		await a.finished;
	}

	_swap(dir) {
		if (!this.root || this.busy) return;
		this.index = (this.index + dir + projects.length) % projects.length;
		const p = projects[this.index];
		history.replaceState({ project: p.slug }, '', `#projects/${p.slug}`);
		this._fill(p);
		this._staggerIn();
		this.root.querySelector('.ov-text').scrollTop = 0;
	}

	// ---- closing ---------------------------------------------------------

	_requestClose() {
		if (!this.root || this.busy) return;
		if (this.pushed && history.state && history.state.project) history.back();
		else this._close();
	}

	async _close() {
		if (!this.root || this.busy) return;
		this.busy = true;
		const slug = projects[this.index].slug;
		const target = document.querySelector(`.project-panel[data-slug="${slug}"] .project-media`);
		const rect = target ? target.getBoundingClientRect() : null;
		const visible = rect && rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;

		if (prefersReducedMotion() || !visible) {
			await this.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: power3out, fill: 'forwards' }).finished;
		} else {
			const to = `inset(${rect.top}px ${innerWidth - rect.right}px ${innerHeight - rect.bottom}px ${rect.left}px)`;
			await this.root.animate([{ clipPath: 'inset(0px)' }, { clipPath: to }], {
				duration: 700,
				easing: power4out,
				fill: 'forwards',
			}).finished;
		}

		if (this.embed) this.embed.destroy();
		this.embed = null;
		this.root.remove();
		this.root = null;
		[...document.body.children].forEach(el => (el.inert = false));

		this.app.scroll.start();
		if (Math.abs(window.scrollY - this.savedY) > 1) {
			this.app.scroll.scrollTo(this.savedY, { immediate: true, force: true });
		}
		setTimeout(() => (this.app.isOverlayOpen = false), 200);
		if (this.trigger && this.trigger.focus) this.trigger.focus({ preventScroll: true });
		this.busy = false;
	}

	_onPop(e) {
		const slug = e.state && e.state.project;
		if (slug) {
			if (!this.root) this.open(slug, null, null, { fromHistory: true });
			else {
				const i = projects.findIndex(p => p.slug === slug);
				if (i >= 0 && i !== this.index) {
					this.index = i;
					this._fill(projects[i]);
					this._staggerIn();
				}
			}
		} else if (this.root) {
			this._close();
		}
	}

	_onKey(e) {
		if (!this.root) return;
		if (e.key === 'Escape') this._requestClose();
		else if (e.key === 'ArrowRight') this._swap(1);
		else if (e.key === 'ArrowLeft') this._swap(-1);
	}
}
