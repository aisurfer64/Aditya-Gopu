import '../css/work.css';
import Section from '../components/Section';
import { elementOptions, pageFrames } from '../utils/constants';
import App from '../App';

export default class Work extends Section {
	constructor(element) {
		super(element);

		this._initElements();
		this._initLedger();
	}

	_initElements() {
		this.letters = this.element.querySelectorAll('.work-letters');
	}

	_setInitialState() {
		this.letters.forEach(letter => (letter.style.opacity = 0));
	}

	_animateLetters() {
		this.letters.forEach((letter, index) => {
			setTimeout(() => {
				letter.style.opacity = 1;
				letter.animate(pageFrames, elementOptions);
			}, index * 20);
		});
	}

	// Hairline ledger: reveal rows on enter, one-at-a-time accordion.
	_initLedger() {
		this.ledger = document.getElementById('work-ledger');
		this.rows = Array.from(this.ledger.querySelectorAll('.work-row'));

		this.rows.forEach(row => {
			const head = row.querySelector('.work-head');
			const panel = row.querySelector('.work-panel');
			panel.inert = true;
			head.addEventListener('click', () => this._toggle(row));
		});

		this.rowObserver = new IntersectionObserver(
			entries =>
				entries.forEach(entry => {
					if (!entry.isIntersecting) return;
					entry.target.classList.add('is-revealed');
					this.rowObserver.unobserve(entry.target);
				}),
			{ threshold: 0.2 }
		);
		this.rows.forEach(row => this.rowObserver.observe(row));
	}

	_toggle(row) {
		const willOpen = !row.classList.contains('is-open');
		this.rows.forEach(r => this._setOpen(r, false));
		if (willOpen) this._setOpen(row, true);
	}

	_setOpen(row, open) {
		row.classList.toggle('is-open', open);
		row.querySelector('.work-head').setAttribute('aria-expanded', String(open));
		row.querySelector('.work-toggle').textContent = open ? '−' : '+';
		row.querySelector('.work-panel').inert = !open;
	}

	onEnter() {
		this._setInitialState();
		this._animateLetters();
	}
}
