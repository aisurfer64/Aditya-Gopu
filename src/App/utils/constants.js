export const desktop = window.innerWidth >= 650;
export const bezier = 'cubic-bezier(0.76, 0.0, 0.24, 1.0)';
export const pageFrames = [
	{ clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', transform: 'translateY(100%)' },
	{ clipPath: 'polygon(0 -10%, 100% -10%, 100% 125%, 0 125%)', transform: 'translateY(0)' },
];
export const pageOptions = { duration: 1500, fill: 'forwards', easing: bezier };
export const elementOptions = { duration: 800, fill: 'forwards', easing: bezier };
export const power3out = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
export const power4out = 'cubic-bezier(0.165, 0.84, 0.44, 1)';
export const prefersReducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;
