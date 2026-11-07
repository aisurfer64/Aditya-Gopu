import Section from '../components/Section';

class Smiley {
	constructor(ctx, image, x, y) {
		this.ctx = ctx;
		this.image = image;
		this.width = 48;
		this.height = 48;
		this.x = x;
		this.y = y;
		this.r = 0;
		this.a = 0.25 + Math.random() * 0.75;
		this.vx = (Math.random() * 2 - 1) * 5;
		this.vy = Math.random() * -10 - 5;
		this.vr = (Math.random() * 2 - 1) * 10;
		this.va = Math.random() * 0.01;
	}

	move() {
		this.vy += 0.45;
		this.x += this.vx;
		this.y += this.vy;
		this.r += this.vr;
		this.a += this.va;
	}

	draw() {
		const { ctx, image } = this;
		if (!ctx || !image || !image.complete) return;

		ctx.save();
		ctx.translate(
			this.x + this.width * 0.5 * this.a,
			this.y + this.height * 0.5 * this.a
		);
		ctx.rotate((this.r * Math.PI) / 180);
		ctx.translate(
			-this.x - this.width * 0.5 * this.a,
			-this.y - this.height * 0.5 * this.a
		);
		ctx.drawImage(image, this.x, this.y, this.width * this.a, this.height * this.a);
		ctx.restore();
	}
}

export default class Awards extends Section {
	constructor(element) {
		super(element);
		if (!this.element) return;

		this.el = this.element;
		this.inner = this.el.querySelector('.js-inner');
		this.svg = this.el.querySelector('.js-grid');
		this.path = this.el.querySelector('.js-path');
		this.canvas = this.el.querySelector('.js-canvas');
		this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
		this.awards = this.el.querySelectorAll('.js-award');

		this.lines = [];
		this.smileys = [];
		this.isPaused = true;
		this.isForced = true;

		this._init();
	}

	_init() {
		this.createSmiley();
		this.setSize();
		this.setScroll();
		this.setLines();
		this.bindEvents();
	}

	bindEvents() {
		window.addEventListener(
			'resize',
			() => {
				this.setSize();
				this.setScroll();
				this.isForced = true;
				this.setLines();
			},
			{ passive: true }
		);

		window.addEventListener(
			'scroll',
			() => {
				this.onScroll(window.scrollY);
			},
			{ passive: true }
		);

		const revealObserver = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-revealed');
						revealObserver.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.2 }
		);

		this.awards.forEach(award => {
			revealObserver.observe(award);
			const awardInteraction = () => this.onAwardInteraction(award);
			award.addEventListener('mouseenter', awardInteraction, { passive: true });
			award.addEventListener('touchstart', awardInteraction, { passive: true });
		});

		const sectionObserver = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					this.isPaused = !entry.isIntersecting;
					if (!this.isPaused) {
						this.el.classList.remove('is-out-of-view');
						this.setSize();
						this.setScroll();
						this.isForced = true;
						this._startTick();
					} else {
						this.el.classList.add('is-out-of-view');
					}
				});
			},
			{ threshold: 0 }
		);

		sectionObserver.observe(this.el);
	}

	_startTick() {
		if (this._rafId) return;
		const loop = () => {
			if (this.isPaused) {
				this._rafId = null;
				return;
			}
			this.tick();
			this._rafId = requestAnimationFrame(loop);
		};
		this._rafId = requestAnimationFrame(loop);
	}

	onEnter() {
		this.awards.forEach(award => award.classList.add('is-revealed'));
		this.setSize();
		this.setScroll();
		this.isForced = true;
		this.setLines();
	}

	onScroll(scrollY) {
		if (!this.scroll) return;
		const safeHeight = window.innerHeight || 800;
		const trigger = scrollY + safeHeight;

		if (trigger < this.scroll.start) {
			this.scroll.p = 0;
		} else if (trigger > this.scroll.end) {
			this.scroll.p = 1;
		} else {
			this.scroll.p = (trigger - this.scroll.start) / (this.scroll.end - this.scroll.start);
		}
	}

	onAwardInteraction(award) {
		award.classList.add('is-active');
		this.throwSmileys(award);
		setTimeout(() => {
			award.classList.remove('is-active');
		}, 100);
	}

	createSmiley() {
		const mainImg = new Image(100, 100);
		mainImg.src = 'images/asset-smiley--main.svg';

		const contrastedImg = new Image(100, 100);
		contrastedImg.src = 'images/asset-smiley--contrasted.svg';

		this.smileyImages = {
			main: mainImg,
			contrasted: contrastedImg,
		};
	}

	setSize() {
		if (!this.el || !this.inner) return;
		const bounding = this.el.getBoundingClientRect();

		this.bounding = {
			left: bounding.left,
			top: bounding.top,
			width: this.el.clientWidth,
			height: this.el.clientHeight,
			innerWidth: this.inner.clientWidth,
			innerHeight: this.inner.clientHeight,
			offsetY: this.bounding ? this.bounding.offsetY : 0,
		};

		if (this.svg) {
			this.svg.style.width = `${this.bounding.width}px`;
			this.svg.style.height = `${this.bounding.height}px`;
		}

		if (this.canvas) {
			this.canvas.width = this.bounding.width;
			this.canvas.height = this.bounding.height;
		}
	}

	setScroll() {
		if (!this.bounding) return;
		const safeHeight = window.innerHeight || 800;
		const topDoc = this.el.getBoundingClientRect().top + window.scrollY;

		this.scroll = {
			start: topDoc,
			end: topDoc + this.bounding.height + safeHeight,
			p: 0,
			sp: this.scroll ? this.scroll.sp : 0,
		};

		this.onScroll(window.scrollY);
		this.scroll.sp = this.scroll.p;
	}

	setLines() {
		if (!this.bounding || !this.path) return;
		const { bounding } = this;
		this.lines = [];

		const innerX = (bounding.width - bounding.innerWidth) / 2;
		const innerY = (bounding.height - bounding.innerHeight) / 2 + bounding.offsetY;

		const vLines = (window.innerWidth || 1024) > 767 ? 12 : 8;
		const hLines = 4;

		const outerGapX = bounding.width / vLines;
		const outerGapY = bounding.height / vLines;
		const innerGapX = bounding.innerWidth / vLines;
		const innerGapY = bounding.innerHeight / vLines;
		const hGap = 1 / hLines;

		const outer = {
			x1: 0,
			x2: bounding.width,
			y1: 0,
			y2: bounding.height,
		};
		const inner = {
			x1: innerX,
			x2: innerX + bounding.innerWidth,
			y1: innerY,
			y2: innerY + bounding.innerHeight,
		};

		const corners = [
			[
				{ x: outer.x1, y: outer.y1 },
				{ x: inner.x1, y: inner.y1 },
			],
			[
				{ x: outer.x2, y: outer.y1 },
				{ x: inner.x2, y: inner.y1 },
			],
			[
				{ x: outer.x2, y: outer.y2 },
				{ x: inner.x2, y: inner.y2 },
			],
			[
				{ x: outer.x1, y: outer.y2 },
				{ x: inner.x1, y: inner.y2 },
			],
		];

		for (let i = 1; i < vLines; i++) {
			this.lines.push([
				{ x: outerGapX * i, y: outer.y1 },
				{ x: innerX + innerGapX * i, y: inner.y1 },
			]);
			this.lines.push([
				{ x: outerGapX * i, y: outer.y2 },
				{ x: innerX + innerGapX * i, y: inner.y2 },
			]);
		}

		for (let i = 1; i < hLines; i++) {
			const index = 1 - Math.pow(1 - hGap * i, 2);
			const l1 = corners[0];
			const l2 = corners[1];
			this.lines.push([
				{
					x: l1[0].x + (l1[1].x - l1[0].x) * index,
					y: l1[0].y + (l1[1].y - l1[0].y) * index,
				},
				{
					x: l2[0].x + (l2[1].x - l2[0].x) * index,
					y: l2[0].y + (l2[1].y - l2[0].y) * index,
				},
			]);
		}

		for (let i = 1; i < hLines; i++) {
			const index = 1 - Math.pow(1 - hGap * i, 2);
			const l1 = corners[3];
			const l2 = corners[2];
			this.lines.push([
				{
					x: l1[0].x + (l1[1].x - l1[0].x) * index,
					y: l1[0].y + (l1[1].y - l1[0].y) * index,
				},
				{
					x: l2[0].x + (l2[1].x - l2[0].x) * index,
					y: l2[0].y + (l2[1].y - l2[0].y) * index,
				},
			]);
		}

		for (let i = 0; i <= vLines; i++) {
			this.lines.push([
				{ x: outer.x1, y: outerGapY * i },
				{ x: inner.x1, y: innerY + innerGapY * i },
			]);
			this.lines.push([
				{ x: outer.x2, y: outerGapY * i },
				{ x: inner.x2, y: innerY + innerGapY * i },
			]);
		}

		for (let i = 1; i < hLines; i++) {
			const index = 1 - Math.pow(1 - hGap * i, 2);
			const l1 = corners[1];
			const l2 = corners[2];
			this.lines.push([
				{
					x: l1[0].x + (l1[1].x - l1[0].x) * index,
					y: l1[0].y + (l1[1].y - l1[0].y) * index,
				},
				{
					x: l2[0].x + (l2[1].x - l2[0].x) * index,
					y: l2[0].y + (l2[1].y - l2[0].y) * index,
				},
			]);
		}

		for (let i = 1; i < hLines; i++) {
			const index = 1 - Math.pow(1 - hGap * i, 2);
			const l1 = corners[0];
			const l2 = corners[3];
			this.lines.push([
				{
					x: l1[0].x + (l1[1].x - l1[0].x) * index,
					y: l1[0].y + (l1[1].y - l1[0].y) * index,
				},
				{
					x: l2[0].x + (l2[1].x - l2[0].x) * index,
					y: l2[0].y + (l2[1].y - l2[0].y) * index,
				},
			]);
		}

		this.drawLines();
	}

	drawLines() {
		if (!this.path) return;
		let d = '';
		this.lines.forEach(points => {
			const p1 = points[0];
			const p2 = points[1];
			d += `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} `;
		});
		this.path.setAttribute('d', d);
	}

	throwSmileys(award) {
		if (!this.ctx || !this.smileyImages) return;
		const image = this.smileyImages.contrasted;
		const elBounding = this.el.getBoundingClientRect();
		const awardBounding = award.getBoundingClientRect();

		const x = awardBounding.left + awardBounding.width * 0.5 - elBounding.left;
		const y = awardBounding.top + awardBounding.height * 0.5 - elBounding.top;

		const maxSmileys = (window.innerWidth || 1024) > 767 ? 10 : 5;
		for (let i = 0; i < maxSmileys; i++) {
			this.smileys.push(new Smiley(this.ctx, image, x, y));
		}
	}

	moveSmileys() {
		const { bounding, smileys } = this;
		for (let i = smileys.length - 1; i >= 0; i--) {
			smileys[i].move();
			if (smileys[i].y > bounding.height) {
				smileys.splice(i, 1);
			}
		}
	}

	drawCanvas() {
		if (!this.ctx || !this.bounding) return;
		this.ctx.clearRect(0, 0, this.bounding.width, this.bounding.height);
		this.smileys.forEach(smiley => smiley.draw());
	}

	tick() {
		if (!this.bounding || !this.scroll) return;
		const { bounding, el, scroll } = this;

		scroll.sp += (scroll.p - scroll.sp) * 0.2;
		const sd = Math.round((scroll.p - scroll.sp) * 1000) / 1000;

		bounding.offsetY =
			((window.innerWidth || 1024) > 767 ? 400 : 200) * (this.scroll.sp * 2 - 1);

		el.style.setProperty('--offset-y', `${this.bounding.offsetY}px`);

		if (sd !== 0 || this.isForced) {
			this.setLines();
		}

		if (this.smileys.length) {
			this.moveSmileys();
			this.drawCanvas();
		} else if (this._hadSmileys) {
			this.drawCanvas();
			this._hadSmileys = false;
		}
		if (this.smileys.length > 0) {
			this._hadSmileys = true;
		}

		this.isForced = false;
	}
}

