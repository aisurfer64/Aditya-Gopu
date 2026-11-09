// Single source of truth for the Work + Projects sections.
// Rendered to HTML at build time (vite.config.js `context`) and read at runtime by the detail overlay.
// Every string below is PLACEHOLDER copy; replace it freely. Missing fields render nothing.

const BODY = ['Placeholder. Copy to come.'];
const TEASER = 'Placeholder. One sentence to come.';

export const work = [
	{
		id: '001',
		slug: 'subscribe-studio',
		org: 'Subscribe Studio',
		role: 'Role',
		dates: 'YYYY — YYYY',
		feature: true,
		teaser: TEASER,
		body: BODY,
		facts: [
			{ k: 'Role', v: 'To come' },
			{ k: 'Dates', v: 'YYYY — YYYY' },
		],
		// Set src to e.g. 'images/work/subscribe-studio/large.avif' when the image exists.
		image: { src: null, alt: '' },
	},
	{
		id: '002',
		slug: 'duke-research',
		org: 'Duke',
		role: 'Research position',
		dates: 'YYYY — YYYY',
		teaser: TEASER,
		body: BODY,
		facts: [
			{ k: 'Role', v: 'Research position' },
			{ k: 'Dates', v: 'YYYY — YYYY' },
		],
	},
	{
		id: '003',
		slug: 'broad-research',
		org: 'Broad',
		role: 'Research assistant',
		dates: 'YYYY — YYYY',
		teaser: TEASER,
		body: BODY,
		facts: [
			{ k: 'Role', v: 'Research assistant' },
			{ k: 'Dates', v: 'YYYY — YYYY' },
		],
	},
	{
		id: '004',
		slug: 'here-on-capital',
		org: 'Here on Capital',
		role: 'Role',
		dates: 'YYYY — YYYY',
		teaser: TEASER,
		body: BODY,
		facts: [
			{ k: 'Role', v: 'To come' },
			{ k: 'Dates', v: 'YYYY — YYYY' },
		],
	},
	{
		id: '005',
		slug: 'intel',
		org: 'Intel',
		role: 'Internship',
		dates: 'YYYY — YYYY',
		teaser: TEASER,
		body: BODY,
		facts: [
			{ k: 'Role', v: 'Internship' },
			{ k: 'Dates', v: 'YYYY — YYYY' },
		],
	},
];

// media.type: 'embed' (live site) | 'image' | 'link' (code snippet + link)
// embed.url null renders the hatch fallback + "Site link pending".
// embed.handshake: set true only if the embedded site posts {morena:'ready'} to its parent;
// otherwise the preview swaps in on iframe load.
const projectList = [
	{
		id: '006',
		slug: 'morena-institute',
		title: 'Morena Institute',
		tag: 'Live site',
		side: 'right',
		summary: TEASER,
		body: BODY,
		facts: [{ k: 'Type', v: 'Website' }],
		media: { type: 'embed', url: 'https://morena-labs.vercel.app/', handshake: false, w: 1440, h: 900 },
		link: { href: 'https://morena-labs.vercel.app/', label: 'Visit the live site' },
	},
	{
		id: '007',
		slug: 'morena-surgical',
		title: 'Morena Surgical',
		tag: 'Interactive site',
		side: 'left',
		summary: TEASER,
		body: BODY,
		facts: [{ k: 'Type', v: 'Interactive website' }],
		media: { type: 'embed', url: 'https://aisurfer64.github.io/3D-Morena-Surgical-Viewer/', handshake: false, w: 1440, h: 900 },
		link: { href: 'https://aisurfer64.github.io/3D-Morena-Surgical-Viewer/', label: 'Visit the live site' },
	},
	{
		id: '008',
		slug: 'research-poster',
		title: 'Research poster',
		tag: 'Poster',
		side: 'right',
		summary: TEASER,
		body: BODY,
		facts: [{ k: 'Type', v: 'Research poster' }],
		// src: display image; thumb: small preview; full: full-resolution render for zooming (3402x3888).
		media: {
			type: 'image',
			src: 'images/projects/research-poster/poster.webp',
			thumb: 'images/projects/research-poster/poster-thumb.webp',
			full: 'images/projects/research-poster/poster-full.webp',
			w: 3402,
			h: 3888,
			alt: 'Research poster: Lipid-based Codelivery of Doxorubicin and siRNA PD-L1, a multi-function chemo-immunotherapy selective to pancreatic cancer via its MUC1 overexpression',
		},
		link: { href: null, label: '' },
	},
	{
		id: '009',
		slug: 'neural-network-in-c',
		title: 'Neural network in C',
		tag: 'Code',
		side: 'left',
		summary: TEASER,
		body: BODY,
		facts: [{ k: 'Language', v: 'C' }],
		media: { type: 'link', snippet: '/* snippet to come */' },
		link: { href: null, label: 'View the code' },
	},
];

export const projects = projectList.map((p, i) => ({
	...p,
	n: `${String(i + 1).padStart(2, '0')} / ${String(projectList.length).padStart(2, '0')}`,
	isEmbed: p.media.type === 'embed',
	isImage: p.media.type === 'image',
	isLink: p.media.type === 'link',
	first: i === 0,
}));
