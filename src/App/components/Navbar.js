import '../css/header.css';
import App from '../App';
import { desktop } from '../utils/constants';

export default class Navbar {
	constructor() {
		this._initElements();

		this._setupApp();
		this._hideCloseButton();
		this._bindEvents();
		this._bindNavLinks();

		this.scroll.on('scroll', lenis => this._handleScroll(lenis));
		this._handleScroll(this.scroll);
	}

	_initElements() {
		this.navbar = document.querySelector('.nav');
		this.burger = this.navbar.querySelector('.burger');
		this.openButton = this.navbar.querySelector('.open');
		this.closeButton = this.navbar.querySelector('.close');
		this.navList = this.navbar.querySelector('.nav .ul');
		this.navLinks = this.navbar.querySelectorAll('span a');
	}

	_setupApp() {
		this.app = new App();
		this.about = this.app.about;
		this.works = this.app.works;
		this.awards = this.app.awards;
		this.contact = this.app.contact;
		this.scroll = this.app.scroll;
	}

	_hideCloseButton() {
		this.closeButton.style.display = 'none';
	}

	_bindEvents() {
		this.burger.addEventListener('click', () => {
			const isActive = this.navList.classList.toggle('active');
			this._setActiveState(isActive);
		});
	}

	_bindNavLinks() {
		this.navLinks.forEach(link => {
			link.addEventListener('click', e => {
				e.preventDefault();
				const id = link.getAttribute('href');
				const target = document.querySelector(id);
				if (!target) return;

				this.navList.classList.remove('active');
				this._setActiveState(false);

				this._scrollToSection(target);

				if (target.classList.contains('about')) this.about?.onEnter?.();
				if (target.classList.contains('works')) this.works?.onEnter?.();
				if (target.id === 'awards' || target.classList.contains('s-awards')) {
					this.awards?.onEnter?.();
				}
				if (target.classList.contains('contact')) this.contact?.onEnter?.();
			});
		});
	}

	// Sticky sections report a wrong rect.top once they are stuck, so measure the
	// position they would have in normal flow.
	_naturalTop(el) {
		const prev = el.style.position;
		el.style.position = 'relative';
		const top = el.getBoundingClientRect().top + window.scrollY;
		el.style.position = prev;
		return top;
	}

	_scrollToSection(target) {
		const done = () => {
			this.app.isNavigating = false;
		};
		// While travelling, intermediate sections must not lock the scroll back to themselves.
		this.app.isNavigating = true;
		this.scroll.scrollTo(this._naturalTop(target), {
			lock: true,
			force: true,
			onComplete: done,
		});
		setTimeout(done, 3000);
	}

	_setActiveState(isActive) {
		this.navbar.classList.toggle('active', isActive);
		this.openButton.style.display = isActive ? 'none' : 'block';
		this.closeButton.style.display = isActive ? 'block' : 'none';
	}

	// The header stays visible on every section. Past the first few pixels it gains a
	// paper-coloured bar with a 1px hairline (see header.css) so it stays legible over
	// the white, purple, black and orange sections.
	_handleScroll(lenis) {
		this.navbar.classList.toggle('scrolled', lenis.scroll > 8);
	}
}
