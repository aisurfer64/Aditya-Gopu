import '../css/projects.css';
import Section from '../components/Section';
import { bezier, desktop, pageFrames } from '../utils/constants';
import { appState } from '../utils/state';
import { data } from '../utils/data';

export default class Projects extends Section {
	constructor(element) {
		super(element);

		this._generateHTML();
		this._initElements();

		this._setupOptions();

		this.animationFinished = false;
		this._bindMouseEvents();
	}

	_generateHTML() {
		const sectionMap = {
			'projects-top': this.app.dom.projectsTop,
			'projects-middle': this.app.dom.projectsMiddle,
			'projects-bottom': this.app.dom.projectsBottom,
		};

		data.forEach(sectionData => {
			const sectionDiv = sectionMap[sectionData.class];
			const isTopSection = sectionData.class === 'projects-top';

			sectionData.projects.forEach(project => {
				const imageStack = this._createImageStack(project, isTopSection);
				const contentDiv = this._createContent(project);

				const projectDiv = document.createElement('div');
				projectDiv.appendChild(imageStack);
				projectDiv.appendChild(contentDiv);

				sectionDiv.appendChild(projectDiv);
			});
		});
	}

	_createImageStack(project, isTopSection) {
		const imageStack = document.createElement('div');
		imageStack.classList.add('image-stack', `image-stack__${project.type}`);

		if (isTopSection) {
			imageStack.classList.add('image-animate');
		}

		const size = desktop ? 'large' : 'small';

		for (let i = 0; i < project.count; i++) {
			const img = new Image();
			img.classList.add(project.type, 'images');
			img.src = `images/works/${project.id}/${size}/${i + 1}.avif`;
			img.alt = project.alt;
			img.loading = 'lazy';

			if (i === 0 && !isTopSection) {
				img.classList.add('active');
			}

			imageStack.appendChild(img);
		}

		return imageStack;
	}

	_createContent(project) {
		const contentDiv = document.createElement('div');
		contentDiv.classList.add('projects-content', 'projects-text');

		const contentSpan1 = document.createElement('span');
		const contentSpan2 = document.createElement('span');
		contentSpan1.textContent = `(${project.id})`;
		contentSpan2.textContent = project.title;

		contentDiv.appendChild(contentSpan1);
		contentDiv.appendChild(contentSpan2);

		return contentDiv;
	}

	_initElements() {
		this.projectsDiv = document.querySelectorAll('.image-animate');
		this.imageStack = document.querySelectorAll('.image-stack');
		this.projectsText = document.querySelectorAll('.projects-text');
	}

	_setupOptions() {
		this.projectsOptions = { duration: 650, fill: 'forwards', easing: bezier };
	}

	_animateDivs() {
		this.projectsDiv.forEach((div, i) => {
			setTimeout(() => {
				div.style.opacity = 1;
				div.animate(pageFrames, this.projectsOptions);
			}, i * 150);
		});
	}

	async _animateImages() {
		const keyframes = [
			{ transform: 'translateY(100%) scale(1.3)' },
			{ transform: 'translateY(30%) scale(1.2)' },
			{ transform: 'translateY(10%) scale(1.1)' },
			{ transform: 'translateY(0) scale(1)' },
		];

		const allAnimations = [];

		this.projectsText.forEach(text => {
			text.style.opacity = 1;
			text.style.transition = 'opacity 600ms 400ms';
		});

		this.projectsDiv.forEach((stack, i) => {
			const imgs = stack.querySelector('.images');

			setTimeout(() => {
				imgs.style.opacity = 1;
				const animation = imgs.animate(keyframes, this.projectsOptions);
				allAnimations.push(animation.finished);
			}, i * 150);
		});

		await Promise.all(allAnimations);
		this.animationFinished = true;
	}

	_bindMouseEvents() {
		this.imageStack.forEach(stack => {
			const imgs = stack.querySelectorAll('.images');

			let index = 0;
			let rafId = null;
			let lastTime = 0;

			const delay = 200;

			const animate = time => {
				if (!lastTime) lastTime = time;
				const delta = time - lastTime;

				if (delta >= delay) {
					imgs[index].classList.remove('active');
					index = (index + 1) % imgs.length;
					imgs[index].classList.add('active');
					lastTime = time;
				}

				rafId = requestAnimationFrame(animate);
			};

			const handleNextImage = () => {
				if (!this.animationFinished && !appState.contactAnimated) return;
				if (rafId) return;
				lastTime = 0;
				rafId = requestAnimationFrame(animate);
			};

			const stopNextImage = () => {
				if (rafId) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
			};

			if (desktop) {
				stack.addEventListener('mouseenter', handleNextImage);
				stack.addEventListener('mouseleave', stopNextImage);
			} else {
				stack.addEventListener('contextmenu', e => e.preventDefault());
				stack.addEventListener('touchstart', handleNextImage);
				stack.addEventListener('touchend', stopNextImage);
			}
		});
	}

	onEnter() {
		this._animateDivs();
		setTimeout(() => this._animateImages(), 600);
	}
}
