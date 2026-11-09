// Single source of truth for the Work + Projects sections.
// Rendered to HTML at build time (vite.config.js `context`) and read at runtime by the detail overlay.
// Work items 001, 002 and 004 carry real copy (from the owner's activity descriptions); everything else
// is still PLACEHOLDER copy; replace it freely. Missing fields render nothing.

const BODY = ['Placeholder. Copy to come.'];
const TEASER = 'Placeholder. One sentence to come.';

export const work = [
	{
		id: '001',
		slug: 'scribe-studio',
		org: 'Scribe Studio',
		role: 'Ex-Lead Developer [acquired]',
		dates: 'Grades 9, 10 (Year)',
		feature: true,
		teaser: 'AI Clinical Documentation Software [acquired].',
		body: [
			'Built an AI tool to draft discharge summaries & surgical reports.',
			'Pitched to 6 Midwest medical practices.',
		],
		facts: [
			{ k: 'Role', v: 'Ex-Lead Developer [acquired]' },
			{ k: 'Team', v: '3-member entity' },
			{ k: 'Grades', v: '9, 10 (Year)' },
			{ k: 'Time', v: '7 hr/wk, 45 wk/yr' },
		],
		// Set src to e.g. 'images/work/scribe-studio/large.avif' when the image exists.
		image: { src: null, alt: '' },
	},
	{
		id: '002',
		slug: 'duke-research',
		org: 'Duke',
		role: 'Computational Assistant',
		dates: 'Grade 11 (Break)',
		teaser: 'Lefkowitz Lab (2012 Nobel Prize in Chemistry), Duke University Medical Center.',
		body: [
			'Helping build a computational framework to compare beta-arrestin isoforms.',
			'Supporting the lab’s discovery of small-molecule beta-arrestin inhibitors.',
		],
		facts: [
			{ k: 'Role', v: 'Computational Assistant' },
			{ k: 'Lab', v: 'Lefkowitz Lab (2012 Nobel Prize in Chemistry)' },
			{ k: 'Institution', v: 'Duke University Medical Center' },
			{ k: 'Grade', v: '11 (Break)' },
			{ k: 'Time', v: '4 hr/wk, 17 wk/yr' },
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
		slug: 'huron-capital',
		org: 'Huron Capital',
		role: 'Summer Intern',
		dates: 'Grade 9 (Break)',
		teaser: 'Detroit private equity firm that invests $50 million or more per company.',
		body: [
			'Screened 40 pitch decks from companies with $1.5 billion combined revenue.',
			'Built 5 full LBO models with self-built C++ software → onboarded 2 others.',
		],
		facts: [
			{ k: 'Role', v: 'Summer Intern' },
			{ k: 'Intern to', v: 'Ex-Vice President Ryan Costello' },
			{ k: 'Grade', v: '9 (Break)' },
			{ k: 'Time', v: '7 hr/wk, 12 wk/yr' },
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
