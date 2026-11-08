import '../css/about.css';
import Section from '../components/Section';
import { desktop, pageFrames, elementOptions, bezier } from '../utils/constants';

export default class About extends Section {
	constructor(element) {
		super(element, { rootMargin: '0px', threshold: 0.5 });

		this._initElements();
	}

	_initElements() {
		this.sequences = this.element.querySelectorAll('.sequence');
		this.sequenceImages = this.element.querySelectorAll('.sequence-images');
		this.textSm = this.element.querySelectorAll('.text-sm');
		this.single = this.element.querySelector('.single');
		this.aboutMobile = this.element.querySelector('.about-mobile');
		this.singleHeader = this.element.querySelector('.header-text__single');
		this.tiltTargets = this.element.querySelectorAll('.interactive-tilt');

		this.tiltOptions = { duration: 300, fill: 'forwards', easing: 'ease-out' };
		this.resetOptions = { duration: 500, fill: 'forwards', easing: 'ease-out' };
		this.resetFrames = { transform: 'none' };

		this._bindTiltEvents();
	}

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

	_bindTiltEvents() {
		this.tiltTargets.forEach(target => {
			let resetTimeout = null;
			const handleMove = e => this._handleTilt(e);
			const handleLeave = () => {
				target.removeEventListener('mousemove', handleMove);
				resetTimeout = setTimeout(() => this._handleReset(target), 200);
			};

			target.addEventListener('mouseenter', () => {
				if (resetTimeout !== null) {
					clearTimeout(resetTimeout);
					resetTimeout = null;
				}
				target.addEventListener('mousemove', handleMove);
			});

			target.addEventListener('mouseleave', handleLeave);
		});
	}

	_handleTilt(e) {
		const target = e.currentTarget;
		const rect = target.getBoundingClientRect();
		const halfWidth = rect.width / 2 || 1;
		const halfHeight = rect.height / 2 || 1;
		const offsetX = e.clientX - rect.left - rect.width / 2;
		const offsetY = e.clientY - rect.top - rect.height / 2;

		const normX = Math.max(-1, Math.min(1, offsetX / halfWidth));
		const normY = Math.max(-1, Math.min(1, offsetY / halfHeight));

		const perspective = 600;
		const maxTilt = 12;
		const tiltX = -(normY * maxTilt);
		const tiltY = normX * maxTilt;

		const keyframes = {
			transform: `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`,
		};

		const anim = target.animate(keyframes, this.tiltOptions);
		this._cleanupAnimation(anim, target, false);
	}

	_handleReset(target) {
		const anim = target.animate(this.resetFrames, this.resetOptions);
		this._cleanupAnimation(anim, target, true);
	}

	_setInitialState() {
		this.sequences.forEach(sequence => (sequence.style.opacity = 0));
		this.sequenceImages.forEach(image => (image.style.opacity = 0));
		this.single.style.opacity = 0;

		if (desktop) {
			this.textSm.forEach(text => text.animate({ opacity: 0 }, { duration: 0, fill: 'forwards' }));
		} else {
			this.aboutMobile.style.opacity = 0;
			this.singleHeader.style.opacity = 0;
		}
	}

	_animateEnter() {
		setTimeout(() => {
			this.single.style.opacity = 1;
			this.single.animate(pageFrames, elementOptions);
		}, 100);

		if (desktop) {
			this.sequences.forEach((seq, i) => {
				setTimeout(() => {
					seq.style.opacity = 1;
					seq.animate(pageFrames, elementOptions);
				}, i * 100);
			});
		} else {
			const seqs = Array.from(this.sequences).slice(0, 3);
			const last = this.sequences[this.sequences.length - 1];

			const lastFrames = [
				{ clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)', transform: 'translateY(0)' },
				{ clipPath: 'polygon(0 125%, 100% 125%, 100% -10%, 0 -10%)', transform: 'translateY(0)' },
			];

			seqs.forEach((seq, i) => {
				setTimeout(() => {
					seq.style.opacity = 1;
					seq.animate(pageFrames, elementOptions);
				}, i * 100);
			});

			const delay = seqs.length * 100 + 100;
			last.style.opacity = 1;
			last.animate(lastFrames, { ...elementOptions, fill: 'backwards', delay });
		}
	}

	_animateExit() {
		const frames = [
			{ transform: 'translateY(100%)' },
			{ transform: 'translateY(0) scale(1.3)' },
			{ transform: 'translateY(0) scale(1)' },
		];

		const options = {
			duration: 1000,
			easing: 'ease-out',
			fill: 'forwards',
		};

		this.sequenceImages.forEach((image, i) => {
			setTimeout(() => {
				image.style.opacity = 1;
				image.animate(frames, options);
			}, i * 50);
		});

		if (desktop) {
			this.textSm.forEach(text => text.animate({ opacity: 1 }, options));
		} else {
			this.aboutMobile.style.opacity = 1;
		}
	}

	onEnter() {
		this._setInitialState();
		setTimeout(() => this._animateEnter(), 50);
		setTimeout(() => this._animateExit(), 600);
	}
}
