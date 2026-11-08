// Hairline line-art placeholders for the Work ledger image cells.
// Generated in pixel space (viewBox == plate size) so every stroke is exactly 1px and the
// `pathLength=1` dash trick can draw them in. Replaced automatically by a real <img> when
// content.js supplies image.src (the template only renders this <svg> in the no-image case).

const f = n => Math.round(n * 100) / 100;
const ell = (cx, cy, rx, ry) =>
	`M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
const seg = (x1, y1, x2, y2) => `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
const box = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;

// Drawn-in path (stroke-dash reveal, staggered by k).
const draw = (d, k = 0) => `<path class="d" pathLength="1" style="--k:${k}" d="${d}"/>`;
// Always-moving path: fades in with the row, never dashed (animated scale would distort dashes).
const live = (d, cls, i = 0) => `<path class="l ${cls}" style="--i:${i}" d="${d}"/>`;

export const FIGURE_COUNT = 5;

// 0. Wire globe: latitude rings and three meridians that swing through edge-on.
function sphere(w, h) {
	const cx = w / 2;
	const cy = h / 2;
	const r = Math.min(w, h) * 0.36;
	let s = `<g class="wf-sphere" style="transform-origin:${f(cx)}px ${f(cy)}px">`;
	s += draw(ell(cx, cy, r, r), 0);
	s += draw(ell(cx, cy, r, r * 0.26), 1);
	[-0.55, 0.55].forEach((lat, i) => {
		const rr = r * Math.cos(lat);
		s += draw(ell(cx, cy + r * Math.sin(lat), rr, rr * 0.26), 2 + i);
	});
	for (let i = 0; i < 3; i++) {
		s += `<g class="wf-mer" style="--i:${i};transform-origin:${f(cx)}px ${f(cy)}px">${live(ell(cx, cy, r, r), 'wf-mer-p', i)}</g>`;
	}
	return s + '</g>';
}

// 1. Tunnel: diagonals to a vanishing square, squares flowing toward the viewer.
function tunnel(w, h) {
	const cx = w / 2;
	const cy = h / 2;
	const ow = w * 0.82;
	const oh = h * 0.8;
	const t0 = 0.14;
	let s = '';
	s += draw(box(cx - ow / 2, cy - oh / 2, ow, oh), 0);
	s += draw(box(cx - (ow * t0) / 2, cy - (oh * t0) / 2, ow * t0, oh * t0), 1);
	[
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
	].forEach(([sx, sy], i) => {
		s += draw(seg(cx + (sx * ow) / 2, cy + (sy * oh) / 2, cx + (sx * ow * t0) / 2, cy + (sy * oh * t0) / 2), 2 + i);
	});
	for (let i = 0; i < 4; i++) {
		s += `<g class="wf-flow" style="--i:${i};transform-origin:${f(cx)}px ${f(cy)}px"><path class="l" d="${box(
			cx - ow / 2,
			cy - oh / 2,
			ow,
			oh
		)}"/></g>`;
	}
	return s;
}

// 2. Floor: a miniature of the title card, with a scan line sweeping toward the viewer.
function floor(w, h) {
	const cx = w / 2;
	const hz = h * 0.4;
	const depth = h - hz;
	let s = draw(seg(0, hz, w, hz), 0);
	[0.8, 0.5, 0.31, 0.19, 0.11].forEach((u, i) => {
		s += draw(seg(0, hz + depth * u, w, hz + depth * u), 1 + i);
	});
	for (let j = -6; j <= 6; j++) {
		s += draw(seg(cx + (j * w) / 26, hz + 4, cx + (j * w) / 5.2, h), 2 + Math.abs(j) * 0.4);
	}
	s += `<g class="wf-scan"><path class="l" d="${seg(0, hz, w, hz)}" style="--dy:${f(depth)}px"/></g>`;
	return s;
}

// 3. Drum: stacked rings that tip back and forth, the Work ledger's own device in miniature.
function drum(w, h) {
	const cx = w / 2;
	const cy = h / 2;
	const rx = Math.min(w * 0.22, h * 0.42);
	const ry = rx * 0.3;
	const top = cy - h * 0.27;
	const bot = cy + h * 0.27;
	let s = draw(seg(cx - rx, top, cx - rx, bot), 0) + draw(seg(cx + rx, top, cx + rx, bot), 0);
	for (let i = 0; i < 5; i++) {
		const y = top + ((bot - top) * i) / 4;
		s += `<g class="wf-ring" style="--i:${i};transform-origin:${f(cx)}px ${f(y)}px">${live(ell(cx, y, rx, ry), 'wf-ring-p', i)}</g>`;
	}
	return s;
}

// 4. Orbits: three tilted rings around a point, slowly turning.
function orbit(w, h) {
	const cx = w / 2;
	const cy = h / 2;
	const rx = Math.min(w * 0.36, h * 0.7);
	const ry = rx * 0.36;
	let s = `<g class="wf-spin" style="transform-origin:${f(cx)}px ${f(cy)}px">`;
	[0, 60, 120].forEach((a, i) => {
		s += `<g transform="rotate(${a} ${f(cx)} ${f(cy)})">${draw(ell(cx, cy, rx, ry), i)}</g>`;
	});
	s += draw(ell(cx, cy, 3, 3), 3);
	return s + '</g>';
}

const KINDS = [sphere, tunnel, floor, drum, orbit];

export function figureMarkup(kind, w, h) {
	return KINDS[kind % KINDS.length](w, h);
}
