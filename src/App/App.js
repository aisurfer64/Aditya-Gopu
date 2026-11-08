import Lenis from 'lenis';
import { selectors } from './utils/selectors';
import Mouse from './components/Mouse';
import Dates from './components/Dates';
import About from './sections/About';
import Scattered from './sections/Scattered';
import Works from './sections/Works';
import Projects from './sections/Projects';
import Awards from './sections/Awards';
import Contact from './sections/Contact';
import Navbar from './components/Navbar';
import Loading from './components/Loading';
import Mail from './components/Mail';

let instance = null;

export default class App {
	constructor() {
		if (instance) return instance;
		instance = this;

		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}
		this.isReady = false;

		this.scroll = new Lenis();
		requestAnimationFrame(time => this._handleScroll(time));

		this.dom = selectors;
		this.mouse = new Mouse();
		this.dates = new Dates();
		this.about = new About(this.dom.about);
		this.scattered = new Scattered(this.dom.scattered);
		this.works = new Works(this.dom.works);
		this.projects = new Projects(this.dom.projectsTop);
		this.awards = new Awards(this.dom.awards);
		this.contact = new Contact(this.dom.contact);
		this.navbar = new Navbar();
		this.loading = new Loading();
		this.mail = new Mail();

		this._handleRefresh();

		window.addEventListener('pageshow', event => {
			if (event.persisted) this.resetToTop();
		});
	}

	_handleScroll(time) {
		this.scroll.raf(time);
		requestAnimationFrame(time => this._handleScroll(time));
	}

	resetToTop() {
		if (window.location.hash !== '') {
			history.replaceState(null, '', window.location.pathname + window.location.search);
		}
		window.scrollTo(0, 0);
		this.scroll.scrollTo(0, { immediate: true, force: true });
	}

	_handleRefresh() {
		this.resetToTop();
	}
}
