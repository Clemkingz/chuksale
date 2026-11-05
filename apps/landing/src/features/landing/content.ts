import { APP_LINKS } from "@/lib/site";

/**
 * Landing copy, tailored to the PRD. The design's sample copy (presale tokens, Ethereum wallets, rewards,
 * "receive tokens") is out of scope (PRD §2 non-goals: no tokens or presales, Stellar only) and §13 forbids
 * investment wording. Everything here says "contribute / support", never "invest / returns / escrow".
 */

export const NAV_LINKS = [
	{ label: "How it works", href: "#how-it-works" },
	{ label: "Projects", href: APP_LINKS.projects },
	{ label: "FAQs", href: APP_LINKS.faq },
] as const;

/**
 * Header CTAs, one per audience. Contributors have no account (PRD §3.2), so theirs goes straight to discovery.
 * Builders pick sign-up (new) or sign-in (returning): the landing is another origin and can't see their session.
 */
export const HEADER_CTA = {
	contributor: { label: "Explore projects", href: APP_LINKS.projects },
	builder: {
		label: "For builders",
		options: [
			{ id: "sign-up", label: "Create an account", hint: "New here? Submit your first project", href: APP_LINKS.signUp },
			{ id: "sign-in", label: "Sign in", hint: "Already a builder? Pick up where you left off", href: APP_LINKS.signIn },
		],
	},
} as const;

export const HERO = {
	titleTop: "Never struggle to",
	titleBottom: "fund your project",
	subtitle: "A curated home where community projects earn trust, funding and feedback, with contributions on Stellar.",
	primary: { label: "Explore projects", href: APP_LINKS.projects },
	secondary: { label: "Submit a project", href: APP_LINKS.submit },
};

/**
 * TODO(API): placeholder figures. Replace with live counts (approved projects, distinct contributor wallets,
 * builders) before launch; don't ship invented numbers on a public page.
 */
export const STATS = [
	{ value: 534, label: "Builders" },
	{ value: 534, label: "Contributors" },
	{ value: 534, label: "Projects" },
] as const;

export type FeatureIcon = "eye" | "lock" | "check";

export const FEATURES: {
	icon: FeatureIcon;
	title: string;
	body: string;
	cta: { label: string; href: string };
	image: { src: string; alt: string };
}[] = [
	{
		icon: "eye",
		title: "Transparent by Default",
		body: "Every contribution is a Stellar transaction anyone can check. Project pages show the funding target, the confirmed amount raised and each contribution with a link to the Stellar explorer.",
		cta: { label: "Get Started", href: APP_LINKS.projects },
		image: { src: "/images/feature-transparent.webp", alt: "A hand touching a glowing digital interface" },
	},
	{
		icon: "lock",
		title: "Secure Contributions",
		body: "You contribute from your own Stellar wallet and approve every transaction yourself. We never ask for your secret key, and a contribution only counts once it’s verified on-chain.",
		cta: { label: "Contribute", href: APP_LINKS.projects },
		image: { src: "/images/feature-secure.webp", alt: "A padlock inside a glowing circuit" },
	},
	{
		icon: "check",
		title: "Reviewed Projects",
		body: "Every project is reviewed by our team before it’s listed, and builders get actionable feedback. Once live, the community can suggest improvements directly on each project.",
		cta: { label: "Submit a project", href: APP_LINKS.submit },
		image: { src: "/images/feature-curated.webp", alt: "A network of connected blocks" },
	},
];

export const READY = {
	titleTop: "Ready to shape the future",
	titleBottom: "of community funding?",
	body: "Join Chucksales today. Whether you’re a builder looking for support and feedback, or a contributor looking for promising projects to back, we’ve got you covered.",
	builder: { label: "I’m a builder", href: APP_LINKS.signUp },
	contributor: { label: "I’m a contributor", href: APP_LINKS.projects },
};

export const STEPS = [
	{
		title: "Submit a project",
		body: "Builders create an account and share a new idea or an existing project: the problem, the plan, the team and a funding target.",
		image: "/images/step-1.webp",
	},
	{
		title: "Get reviewed",
		body: "Our team reviews every submission. Projects are approved and published, or sent back with clear feedback to improve and resubmit.",
		image: "/images/step-2.webp",
	},
	{
		title: "Connect your wallet",
		body: "Contributors browse freely, then connect a Stellar wallet such as Freighter, xBull, Albedo or LOBSTR. No account or password needed.",
		image: "/images/step-3.webp",
	},
	{
		title: "Contribute",
		body: "Choose XLM or USDC and an amount, review the details, and approve the transaction in your wallet. Funds go directly to the project’s wallet.",
		image: "/images/step-4.webp",
	},
	{
		title: "Track and suggest",
		body: "Each contribution is verified on Stellar before it counts toward the total, with a receipt and explorer link. Connected contributors can also suggest improvements.",
		image: "/images/step-5.webp",
	},
] as const;

export const FOOTER_COLUMNS = [
	{
		title: "Platform",
		links: [
			{ label: "Explore projects", href: APP_LINKS.projects },
			{ label: "Submit a project", href: APP_LINKS.submit },
			{ label: "Builder sign in", href: APP_LINKS.signIn },
		],
	},
	{
		title: "Resources",
		links: [
			{ label: "How it works", href: "#how-it-works" },
			{ label: "FAQ", href: APP_LINKS.faq },
			{ label: "About", href: APP_LINKS.about },
		],
	},
	{
		title: "Legal",
		links: [
			{ label: "Terms", href: APP_LINKS.terms },
			{ label: "Privacy", href: APP_LINKS.privacy },
			{ label: "Risk disclosure", href: APP_LINKS.risk },
		],
	},
] as const;
