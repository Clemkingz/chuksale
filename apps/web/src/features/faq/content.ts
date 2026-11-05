import { routes } from "@/lib/routes";

/**
 * FAQ copy, written from the PRD (not the design's sample text about presales and Ethereum, which are out of scope:
 * PRD §2 non-goals). Product rules come from docs/DECISIONS.md; where a rule is still PENDING the answer states the
 * current behaviour only. Copy rules (PRD §13): "contribute / support", never investment wording.
 * `links` render under the answer.
 */

export interface Faq {
	id: string;
	question: string;
	answer: string[];
	links?: { label: string; href: string }[];
}

export const FAQS: Faq[] = [
	{
		id: "what-is-chucksales",
		question: "What is Chucksales?",
		answer: [
			"Chucksales is a curated home for community projects. Builders submit new ideas or existing projects, our team reviews them, and approved projects are listed for everyone to discover.",
			"Anyone can support a listed project with a contribution on the Stellar network, or help it improve by sending a suggestion.",
		],
		links: [{ label: "Explore projects", href: routes.projects }],
	},
	{
		id: "how-does-it-work",
		question: "How does Chucksales work?",
		answer: [
			"1. A builder creates an account and submits a project.",
			"2. An admin reviews it, then approves it, asks for changes, or declines it.",
			"3. Approved projects appear on the projects page for everyone to discover.",
			"4. Contributors connect a Stellar wallet to contribute or send feedback.",
			"5. Builders follow their funding and suggestions from their dashboard.",
		],
	},
	{
		id: "is-it-secure",
		question: "Is Chucksales secure?",
		answer: [
			"Chucksales never holds your money. When you contribute, you send a payment from your own wallet directly to the project’s Stellar address, and you approve every transaction in your wallet yourself.",
			"We never ask for your secret key or recovery phrase. If anyone does, it isn’t us.",
			"A contribution only counts once we’ve found and verified it on the Stellar network. You can check every confirmed contribution on a public Stellar explorer.",
		],
	},
	{
		id: "need-account",
		question: "Do I need an account to contribute?",
		answer: [
			"No. Contributors don’t sign up. Your connected Stellar wallet is all you need, and we only ask you to connect it when you contribute or send a suggestion.",
			"Builders do need an account, so they can submit and manage their projects.",
		],
	},
	{
		id: "which-wallets",
		question: "Which wallets can I use?",
		answer: [
			"On a computer: the Varial or xBull browser extensions, or Albedo in your browser. On a phone: the LOBSTR or Varial app, through WalletConnect.",
			"Chucksales currently runs on the Stellar Testnet, so use a Testnet account. Testnet funds have no real value.",
		],
	},
	{
		id: "which-assets",
		question: "Which assets can I contribute?",
		answer: [
			"XLM and USDC (Testnet). The asset code and issuer are always shown before you confirm, and totals are kept per asset, without converting between them.",
			"The minimum contribution is 1 XLM or 1 USDC. Stellar also charges a tiny network fee, paid from your wallet.",
		],
	},
	{
		id: "where-does-money-go",
		question: "Where does my contribution go?",
		answer: [
			"Straight to the project’s own Stellar address, shown on the project page and again before you confirm. Chucksales doesn’t hold, control or route the funds.",
		],
	},
	{
		id: "what-do-i-get",
		question: "Do I get anything back for contributing?",
		answer: [
			"A contribution is support for a project you believe in. It isn’t a purchase, a loan or a share in the project, and it doesn’t come with any financial reward.",
			"Approval means a project passed our review, not that it will succeed. Read the project page and decide for yourself.",
		],
		links: [{ label: "Read the risk disclosure", href: routes.risk }],
	},
	{
		id: "refunds",
		question: "Can I get a refund?",
		answer: [
			"No. Payments on Stellar are final, and because funds go directly to the project, Chucksales can’t reverse them. Check the project and the amount before you approve.",
		],
	},
	{
		id: "pending-or-failed",
		question: "My contribution says pending or failed. What now?",
		answer: [
			"Pending means we’re waiting to see your transaction on the Stellar network; it usually takes a few seconds. It counts toward the project only once it’s confirmed.",
			"Failed means nothing was sent. Closing or declining the wallet window also sends nothing, so you can safely try again.",
		],
	},
	{
		id: "funding-target",
		question: "What happens when a project reaches its target?",
		answer: ["The target is a guide, not a limit. A project can keep receiving contributions after it reaches 100%."],
	},
	{
		id: "suggestions",
		question: "How do suggestions work?",
		answer: [
			"Connect your wallet on a project page and send product, technical or community feedback. A moderator checks each suggestion before it’s shown publicly, and the builder can read it from their dashboard.",
		],
	},
	{
		id: "submit-project",
		question: "How do I submit my project?",
		answer: [
			"Create a builder account, then choose Add Project on your dashboard. Add your project name, logo, contact email, the Stellar address that should receive contributions, and your community links.",
			"Your project shows as Submitted while it waits for review. You’ll be notified when it’s approved, or if we need changes.",
		],
		links: [{ label: "Create a builder account", href: routes.signUp }],
	},
	{
		id: "review",
		question: "How are projects reviewed?",
		answer: [
			"An admin reviews every submission. They approve it, request changes (with a reason you can see on your dashboard), or decline it. Only approved projects are public.",
		],
	},
];
