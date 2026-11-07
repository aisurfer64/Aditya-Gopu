import '../css/scattered.css';
import Section from '../components/Section';

export default class Scattered extends Section {
	constructor(element) {
		super(element);

		this._initElements();

		this._setupOptions();

		this._bindMouseEvents();

		this._initVideoPlayback();
	}

	_initElements() {
		this.images = this.element.querySelectorAll('.scattered-images img');
		this.media = this.element.querySelectorAll('.scattered-media');
		this.videos = Array.from(this.element.querySelectorAll('.scattered-images video'));
		this.worksWrapper =
			typeof document !== 'undefined' && typeof document.querySelector === 'function'
				? document.querySelector('.works-wrapper')
				: null;
	}

	_setupOptions() {
		this.tiltOptions = { duration: 300, fill: 'forwards', easing: 'ease-out' };
		this.resetOptions = { duration: 500, fill: 'forwards', easing: 'ease-out' };
		this.resetFrames = { transform: 'none' };
	}

	_cleanupAnimation(anim, target, clearTransform = false) {
		if (!anim || ! anim.finished || typeof anim.finished.then !== 'function') return;
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

	_bindMouseEvents() {
		const tiltTargets = this.media.length > 0 ? this.media : this.images;

		tiltTargets.forEach(target => {
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

		const perspective = 1000;
		const maxTilt = 12;
		const tiltX = -(normY * maxTilt);
		const tiltY = normX * maxTilt;

		const keyframes = {
			transform: `
				perspective(${perspective}px)
				rotateX(${tiltX}deg)
				rotateY(${tiltY}deg)
			`,
		};

		const anim = target.animate(keyframes, this.tiltOptions);
		this._cleanupAnimation(anim, target, false);
	}

	_handleReset(target) {
		const anim = target.animate(this.resetFrames, this.resetOptions);
		this._cleanupAnimation(anim, target, true);
	}

	_bindVideoFallbacks() {
		this.videos.forEach(video => {
			const fallbackSrc = video.dataset ? video.dataset.fallbackSrc : null;
			if (!fallbackSrc) return;

			let swapped = false;
			const swapToFallbackImage = () => {
				if (swapped) return;
				swapped = true;

				if (this.videoObserver && typeof this.videoObserver.unobserve === 'function') {
					this.videoObserver.unobserve(video);
				}
				if (this.intersectingVideos) {
					this.intersectingVideos.delete(video);
				}
				this.videos = this.videos.filter(v => v !== video);

				if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
					const img = document.createElement('img');
					img.src = fallbackSrc;
					img.alt = (video.dataset && video.dataset.fallbackAlt) || '';
					img.decoding = 'async';
					if (video.parentNode) {
						video.parentNode.replaceChild(img, video);
					}
				}
			};

			if (typeof video.addEventListener === 'function') {
				video.addEventListener('error', swapToFallbackImage);
			}
			if (typeof video.querySelectorAll === 'function') {
				const sources = video.querySelectorAll('source');
				if (sources.length > 0) {
					const lastSource = sources[sources.length - 1];
					if (typeof lastSource.addEventListener === 'function') {
						lastSource.addEventListener('error', swapToFallbackImage);
					}
				}
			}
		});
	}

	_isVideoVisible(video) {
		if (typeof document !== 'undefined' && document.hidden) return false;

		if (typeof video.getBoundingClientRect !== 'function') {
			return this.intersectingVideos ? this.intersectingVideos.has(video) : true;
		}

		const rect = video.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return false;

		const vh = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 0;
		const vw = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 0;

		if (vh > 0 && vw > 0) {
			const inViewport =
				rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0;
			if (!inViewport) return false;
		}

		if (this.worksWrapper && typeof this.worksWrapper.getBoundingClientRect === 'function') {
			const worksRect = this.worksWrapper.getBoundingClientRect();
			if (worksRect.height > 0 && rect.top >= worksRect.top) {
				return false;
			}
		}

		return this.intersectingVideos ? this.intersectingVideos.has(video) : true;
	}

	_playVideoSafely(video) {
		video.muted = true;
		if (typeof video.play === 'function') {
			const playPromise = video.play();
			if (playPromise !== undefined && typeof playPromise.catch === 'function') {
				playPromise.catch(() => {});
			}
		}
	}

	_pauseVideoSafely(video) {
		if (typeof video.pause === 'function') {
			video.pause();
		}
	}

	_syncVideoPlayback() {
		this.videos.forEach(video => {
			if (this._isVideoVisible(video)) {
				if (video.paused !== false) {
					this._playVideoSafely(video);
				}
			} else {
				this._pauseVideoSafely(video);
			}
		});
	}

	_initVideoPlayback() {
		this.intersectingVideos = new Set();

		this.videos.forEach(video => {
			video.muted = true;
			video.loop = true;
			video.playsInline = true;
			video.controls = false;
			if (typeof video.removeAttribute === 'function') {
				video.removeAttribute('controls');
			}
		});

		this._bindVideoFallbacks();

		if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
			document.addEventListener('visibilitychange', () => {
				if (document.hidden) {
					this.videos.forEach(video => this._pauseVideoSafely(video));
				} else {
					this._syncVideoPlayback();
				}
			});
		}

		if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
			let rafPending = false;
			const scheduleSync = () => {
				if (rafPending) return;
				rafPending = true;
				const run = () => {
					rafPending = false;
					this._syncVideoPlayback();
				};
				if (typeof requestAnimationFrame === 'function') {
					requestAnimationFrame(run);
				} else {
					run();
				}
			};
			window.addEventListener('scroll', scheduleSync, { passive: true });
			window.addEventListener('resize', scheduleSync, { passive: true });
		}

		if (typeof IntersectionObserver === 'undefined') {
			this.intersectingVideos = null;
			this.videos.forEach(video => this._playVideoSafely(video));
			return;
		}

		this.videoObserver = new IntersectionObserver(
			entries => this._handleVideoIntersect(entries),
			{
				threshold: 0,
			}
		);

		this.videos.forEach(video => {
			this.videoObserver.observe(video);
		});
	}

	_handleVideoIntersect(entries) {
		entries.forEach(entry => {
			const video = entry.target;
			if (entry.isIntersecting) {
				this.intersectingVideos.add(video);
				if (this._isVideoVisible(video)) {
					this._playVideoSafely(video);
				} else {
					this._pauseVideoSafely(video);
				}
			} else {
				this.intersectingVideos.delete(video);
				this._pauseVideoSafely(video);
			}
		});
	}
}
