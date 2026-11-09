// Single source of truth for the Work + Projects sections.
// Rendered to HTML at build time (vite.config.js `context`) and read at runtime by the detail overlay.
// All five work items carry real copy (from the owner's activity descriptions); everything else is still
// PLACEHOLDER copy; replace it freely. Missing fields render nothing.
// Logo images (image.logo: true) are the organizations' own marks, shown in greyscale and coloured on hover.
// OWNER RULE: never show time commitments (hours/week, weeks/year) on any work item, including future ones.

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
		teaser: 'Created an AI-powered software suite to streamline clinical documentation.',
		body: [
			'Clinics and hospitals could use the software to create discharge summaries, operative parts, surgical reports etc.',
			'ScribeMate was adopted in 6 midwest-based medical practices before all software and IP was acquired by an enterprise software investment firm for a 6-figure exit.',
		],
		facts: [
			{ k: 'Role', v: 'Ex-Lead Developer [acquired]' },
			{ k: 'Product', v: 'ScribeMate' },
			{ k: 'Team', v: '3-member entity' },
			{ k: 'Adoption', v: '6 midwest-based medical practices' },
			{ k: 'Outcome', v: 'Software and IP acquired (6-figure exit)' },
			{ k: 'Grades', v: '9, 10 (Year)' },
		],
		image: {
			src: 'images/work/scribe-studio/large.webp',
			alt: 'Demo scan of an abdominopelvic CT shown in a planning interface, with a 3D volume view and axial and coronal slice views',
		},
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
		],
		image: { src: 'images/work/duke-research/logo.svg', alt: 'Duke University logo', logo: true },
	},
	{
		id: '003',
		slug: 'broad-institute',
		org: 'Broad Institute',
		role: 'Large-Data Assistant',
		dates: 'Grade 11 (School)',
		teaser: 'Eric and Wendy Schmidt Center, Broad Institute of MIT and Harvard.',
		body: [
			'Helped design a nanoparticle drug-delivery system tailored to the pH of the pancreas.',
			'Worked under postdoctoral researcher Tara Chari.',
		],
		facts: [
			{ k: 'Role', v: 'Large-Data Assistant' },
			{ k: 'Center', v: 'Eric and Wendy Schmidt Center' },
			{ k: 'Institution', v: 'Broad Institute of MIT and Harvard' },
			{ k: 'Grade', v: '11 (School)' },
			{ k: 'Under', v: 'Postdoctoral researcher Tara Chari' },
		],
		image: { src: 'images/work/broad-institute/logo.png', alt: 'Broad Institute logo', logo: true },
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
		],
		image: { src: 'images/work/huron-capital/logo.svg', alt: 'Huron Capital logo', logo: true },
	},
	{
		id: '005',
		slug: 'intel',
		org: 'Intel',
		role: 'Computational Artificial Intelligence Intern',
		dates: 'Grade 10 (Break)',
		teaser:
			'Engineered high-performance C++ solutions for the Persistent Memory team, building low-latency storage features from the ground up.',
		body: [
			'Worked with Intel’s Artificial Intelligence and Persistent Memory teams to develop a next-generation persistent storage solution that works like random-access memory, improving memory performance for data centers and personal computers.',
			'Collaborated with the Persistent Memory Development Kit and Programming Languages and Software Engineering teams to publish C++ code samples that help developers program persistent memory applications.',
			'Implemented data loss prevention across multiple Intel campuses using Veeam Backup and Replication, built a company-wide website consolidating millions of data points, and automated power usage monitoring with Selenium and Grafana.',
			'Shipped quality code that directly affected Intel engineers by co-developing the Persistent Memory Development Kit, providing critical architecture and programming foundations for enterprise integration.',
		],
		facts: [
			{ k: 'Role', v: 'Computational Artificial Intelligence Intern' },
			{ k: 'Company', v: 'Intel Corporation' },
			{ k: 'Teams', v: 'Artificial Intelligence, Persistent Memory' },
			{ k: 'Grade', v: '10 (Break)' },
		],
		image: { src: 'images/work/intel/logo.svg', alt: 'Intel logo', logo: true },
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
