/**
 * Hairline line-art placeholders for media that has not arrived yet. Each is a small stack of
 * layers at different translateZ, so the frame's pointer tilt gives them real parallax.
 * They are replaced (hidden) the moment the live iframe / image / snippet is there.
 */

const esc = s =>
	String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const lay = (z, cls, inner = '') => `<div class="ov-lay ${cls}" style="--z:${z}px">${inner}</div>`;
const star = (cls = '') => `<i class="ov-star ${cls}"></i>`;
const X = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" vector-effect="non-scaling-stroke"/></svg>`;

// Browser window: chrome row, nav ticks, display headline as hatch bars, image box with a cross.
function browser(label) {
	return `
	<div class="ov-art ov-art--browser" aria-hidden="true">
		<div class="ov-sheet">
			<div class="ov-chrome"><i></i><i></i><i></i><span class="ov-url">${esc(label)}</span></div>
			<div class="ov-canvas">
				${lay(10, 'ov-a-cols', '<div></div><div></div><div></div>')}
				${lay(16, 'ov-a-nav', '<b></b><b></b><b></b><b></b>')}
				${lay(24, 'ov-a-hero', '<u></u><u></u><u></u>')}
				${lay(16, 'ov-a-copy', '<s></s><s></s><s></s><s></s>')}
				${lay(38, 'ov-a-shot', X)}
				${lay(60, 'ov-a-pin', star())}
			</div>
		</div>
	</div>`;
}

// Poster board: portrait sheet with crop marks, a title block, a hero box and ruled columns.
function poster() {
	return `
	<div class="ov-art ov-art--poster" aria-hidden="true">
		<div class="ov-sheet">
			${lay(-8, 'ov-a-marks', '<i></i><i></i><i></i><i></i>')}
			<div class="ov-canvas">
				${lay(14, 'ov-a-kick', '<s></s><s></s>')}
				${lay(26, 'ov-a-hero', '<u></u><u></u>')}
				${lay(40, 'ov-a-shot', X)}
				${lay(14, 'ov-a-copy', '<s></s><s></s><s></s><s></s><s></s>')}
				${lay(14, 'ov-a-copy ov-a-copy--b', '<s></s><s></s><s></s><s></s><s></s>')}
				${lay(20, 'ov-a-foot', '<b></b><b></b><b></b><b></b><s></s>')}
				${lay(62, 'ov-a-pin', star())}
			</div>
		</div>
	</div>`;
}

// Code window with gutter. The first line is the real snippet text (usually a placeholder comment).
function code(snippet) {
	const widths = [0, 72, 54, 88, 40, 0, 66, 80, 48, 58, 34, 0, 62];
	const lines = widths
		.map((w, i) => `<div class="ov-a-ln"><em>${String(i + 1).padStart(2, '0')}</em>${i === 0 ? `<code>${esc(snippet)}</code>` : w ? `<u style="width:${w}%"></u>` : ''}</div>`)
		.join('');
	return `
	<div class="ov-art ov-art--code" aria-hidden="true">
		<div class="ov-sheet">
			<div class="ov-chrome"><i></i><i></i><i></i><span class="ov-url">Code</span></div>
			<div class="ov-canvas">
				${lay(12, 'ov-a-code', lines)}
				${lay(52, 'ov-a-pin', star())}
			</div>
		</div>
	</div>`;
}

// Layered node / edge schematic: squares for neurons, hairlines for weights, one star on the output.
function network(snippet) {
	const cols = [4, 6, 6, 3];
	const xs = [12, 37, 63, 88];
	const pos = cols.map((n, c) => Array.from({ length: n }, (_, k) => [xs[c], n === 1 ? 50 : 14 + (72 * k) / (n - 1)]));
	let edges = '';
	for (let c = 0; c < cols.length - 1; c++) {
		pos[c].forEach(a => pos[c + 1].forEach(b => (edges += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`)));
	}
	const nodes = pos
		.map((col, c) =>
			lay(
				5 + c * 5,
				'ov-a-layer',
				col.map((p, k) => `<b style="left:${p[0]}%;top:${p[1]}%">${c === 3 && k === 1 ? star() : ''}</b>`).join('')
			)
		)
		.join('');
	return `
	<div class="ov-art ov-art--network" aria-hidden="true">
		<div class="ov-sheet">
			${lay(0, 'ov-a-edges', `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${edges}" vector-effect="non-scaling-stroke"/></svg>`)}
			${nodes}
			${lay(54, 'ov-a-snip', `<code>${esc(snippet)}</code>`)}
		</div>
	</div>`;
}

export function isPlaceholderSnippet(s) {
	return !s || /^\s*\/\*\s*snippet to come\s*\*\/\s*$/i.test(s);
}

export function renderArt(p) {
	const m = p.media || {};
	if (m.type === 'embed') return browser(m.url || '');
	if (m.type === 'image') return poster();
	if (/neural/.test(p.slug)) return network(m.snippet);
	return code(m.snippet);
}
