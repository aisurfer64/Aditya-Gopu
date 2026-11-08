// Ruled-ledger floor for the Work title card: hairline rules and columns receding to a horizon.
// Same family of idea as the Awards vanishing-point grid (SVG paths recomputed every frame),
// but a single ground plane: the rules flow toward the viewer as the page scrolls, and the
// vanishing point swings with the pointer. Hairline only: pure 1px ink lines on paper.

const crisp = v => Math.round(v) + 0.5;
const num = v => Math.round(v * 10) / 10;

export default class WorkFloor {
	constructor(svg) {
		this.svg = svg;
		this.rules = svg.querySelector('.work-floor-rules');
		this.cols = svg.querySelector('.work-floor-cols');
		this.line = svg.querySelector('.work-floor-horizon');
		this.w = 0;
		this.h = 0;
		this.key = '';
	}

	resize(w, h) {
		this.w = w;
		this.h = h;
		this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
		this.key = '';
	}

	// horizon: y of the vanishing line. vp: x of the vanishing point. bottom: x shift of the
	// columns where they leave the card. phase: 0..1, the rules slide one slot per 1.0.
	draw({ horizon, vp, bottom = 0, phase = 0, columns = 6, rules = 12, growth = 0.9 }) {
		const { w, h } = this;
		if (!w || !h) return;

		const key = `${num(horizon)}|${num(vp)}|${num(bottom)}|${Math.round(phase * 400)}|${columns}`;
		if (key === this.key) return;
		this.key = key;

		const depth = h - horizon;
		if (depth < 6) {
			this.rules.setAttribute('d', '');
			this.cols.setAttribute('d', '');
			this.line.setAttribute('d', `M0 ${crisp(Math.min(horizon, h - 1))}H${w}`);
			return;
		}

		this.line.setAttribute('d', `M0 ${crisp(horizon)}H${w}`);

		// The plane starts a hair below the horizon: one fixed far rule closes it, flowing rules fill the rest.
		const gap = Math.max(14, depth * 0.05);
		const far = horizon + gap;
		let d = `M0 ${crisp(far)}H${w}`;
		let prev = Infinity;
		for (let k = 0; k <= rules; k++) {
			const u = 1 / (1 + (k - phase) * growth);
			if (u > 1) continue;
			const y = horizon + depth * u;
			if (y - far < 9 || prev - y < 9) break;
			prev = y;
			d += `M0 ${crisp(y)}H${w}`;
		}
		this.rules.setAttribute('d', d);

		// Columns: straight lines from the vanishing point to evenly spaced points on the near edge.
		const step = w / columns;
		const anchor = vp + bottom;
		let c = '';
		for (let j = -columns * 2; j <= columns * 2; j++) {
			const xb = anchor + j * step;
			if (xb < -w * 0.7 || xb > w * 1.7) continue;
			const xt = vp + (xb - vp) * (gap / depth);
			c += `M${num(xt)} ${num(far)}L${num(xb + (xb - vp) * 0.02)} ${num(h + 2)}`;
		}
		this.cols.setAttribute('d', c);
	}
}
