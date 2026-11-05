import Link from "next/link";
import { List, type Section } from "@/features/legal/components/ContentPage";

/**
 * Copy for About, Terms, Privacy and Risk, written from the PRD (§2 goals and non-goals, §12 security and risk,
 * §13 copy rules) and docs/DECISIONS.md. TODO(legal): have counsel review Terms and Privacy before mainnet.
 */

const UPDATED = "5 November 2026";

export const ABOUT = {
	eyebrow: "About",
	title: "A curated home for community projects",
	intro:
		"Chucksales helps good community projects get found, supported and improved. Builders submit their projects, our team reviews them, and anyone with a Stellar wallet can contribute directly or share practical feedback.",
	sections: [
		{
			id: "why",
			title: "Why we built it",
			body: (
				<>
					<p>
						Community projects often struggle with two things at once: being trusted, and being funded. Generic crowdfunding is
						noisy, and it’s hard to tell which projects are real.
					</p>
					<p>
						Chucksales adds a review step before anything goes public, keeps funding transparent on the Stellar network, and gives
						supporters a structured way to help beyond money.
					</p>
				</>
			),
		},
		{
			id: "how",
			title: "How it works",
			body: (
				<List
					items={[
						"Builders create an account and submit a new idea or an existing project.",
						"An admin reviews each submission and approves it, asks for changes with a reason, or declines it.",
						"Approved projects are listed for everyone to discover.",
						"Contributors connect a Stellar wallet and send XLM or USDC straight to the project’s own wallet.",
						"Every contribution is verified on Stellar before it’s counted. Suggestions are moderated before they’re shown.",
					]}
				/>
			),
		},
		{
			id: "principles",
			title: "What we stand for",
			body: (
				<List
					items={[
						<>
							<strong className="text-white">Review first.</strong> Nothing is public until a person has checked it.
						</>,
						<>
							<strong className="text-white">Funds never pass through us.</strong> Contributions go from your wallet directly to
							the project. We don’t hold, control or route money.
						</>,
						<>
							<strong className="text-white">Verifiable.</strong> Every confirmed contribution links to its Stellar transaction.
						</>,
						<>
							<strong className="text-white">Honest.</strong> Contributions are support, not a purchase or a stake. Approval isn’t
							a promise of success.
						</>,
						<>
							<strong className="text-white">Safe by default.</strong> We never ask for your secret key or recovery phrase.
						</>,
					]}
				/>
			),
		},
		{
			id: "testnet",
			title: "Where we are today",
			body: (
				<p>
					Chucksales currently runs on the Stellar Testnet. Testnet funds have no real value, so you can try every part of the
					platform safely. Moving to the main network is a separate, reviewed step.
				</p>
			),
		},
	] satisfies Section[],
};

export const TERMS = {
	eyebrow: "Terms",
	title: "Terms of use",
	updated: UPDATED,
	intro:
		"These terms explain how Chucksales works and what we expect from everyone who uses it. By using the platform you agree to them.",
	sections: [
		{
			id: "service",
			title: "The service",
			body: (
				<p>
					Chucksales lists community projects that our team has reviewed and lets people support them with Stellar contributions
					and suggestions. We provide the listing, the review process and the tools; we are not a party to contributions between
					contributors and builders.
				</p>
			),
		},
		{
			id: "roles",
			title: "Who can do what",
			body: (
				<List
					items={[
						"Visitors can browse approved projects without an account.",
						"Contributors use a connected Stellar wallet to contribute or send suggestions. No account is needed.",
						"Builders need an account to submit and manage projects, and must give accurate information.",
						"Admins review projects, moderate suggestions and keep the platform safe. Every admin action is recorded.",
					]}
				/>
			),
		},
		{
			id: "builders",
			title: "Builder responsibilities",
			body: (
				<List
					items={[
						"Describe your project truthfully, including its stage, team and plans.",
						"Use a Stellar address you control to receive contributions.",
						"Use contributions for the project as described, and keep supporters informed.",
						"Don’t list token sales, presales, or anything that promises contributors a profit.",
					]}
				/>
			),
		},
		{
			id: "contributions",
			title: "Contributions",
			body: (
				<>
					<p>
						A contribution is a direct Stellar payment from your wallet to the project’s wallet. Chucksales never holds, controls
						or routes the funds.
					</p>
					<p>
						Contributions are voluntary support. They are not a purchase, a loan, a donation receipt for tax purposes, or a share
						in a project, and they don’t entitle you to any financial reward. Stellar payments are final, and we cannot reverse or
						refund them.
					</p>
				</>
			),
		},
		{
			id: "content",
			title: "Suggestions and content",
			body: (
				<>
					<p>
						Suggestions are reviewed before they’re public. Don’t post spam, scams, abuse, personal data of others, or anything
						illegal. We may hide or reject content, and suspend builder accounts, that break these rules.
					</p>
					<p>You keep ownership of what you post, and give us permission to display it on Chucksales.</p>
				</>
			),
		},
		{
			id: "liability",
			title: "Limits of our responsibility",
			body: (
				<p>
					Approval means a project passed our review at that time. It is not a guarantee that a project will succeed, deliver, or
					use funds as planned. To the extent the law allows, Chucksales isn’t liable for losses from contributions, wallet
					software, or the Stellar network.
				</p>
			),
		},
		{
			id: "changes",
			title: "Changes",
			body: (
				<p>
					We may update these terms. We’ll change the date above, and for significant changes we’ll let builders know in the app.
				</p>
			),
		},
	] satisfies Section[],
};

export const PRIVACY = {
	eyebrow: "Privacy",
	title: "Privacy notice",
	updated: UPDATED,
	intro:
		"We collect as little as we can. This notice explains what we keep, why, and what is public by design on the Stellar network.",
	sections: [
		{
			id: "collect",
			title: "What we collect",
			body: (
				<List
					items={[
						"Builders: name, email address, password (stored hashed), profile details you add, and your projects.",
						"Contributors: your public wallet address when you contribute or suggest. We don’t ask for names or emails.",
						"Everyone: basic usage events to improve the product (pages viewed, steps completed), without wallet secrets.",
					]}
				/>
			),
		},
		{
			id: "public",
			title: "What’s public on Stellar",
			body: (
				<>
					<p>
						Stellar is a public network. When you contribute, your wallet address, the amount, the asset, the time and the memo
						are recorded on-chain and can be seen by anyone, including on Chucksales project pages.
					</p>
					<p>Published suggestions show a shortened version of the wallet that sent them.</p>
				</>
			),
		},
		{
			id: "never",
			title: "What we never collect",
			body: (
				<p>
					We never ask for, receive or store your secret key or recovery phrase. Your wallet signs transactions on your device; we
					only see the result. If anyone asks for your secret key claiming to be us, it’s a scam.
				</p>
			),
		},
		{
			id: "use",
			title: "How we use it",
			body: (
				<List
					items={[
						"To run your account and review your projects.",
						"To verify contributions and show accurate totals.",
						"To moderate suggestions and keep the platform safe.",
						"To send notifications you can see in the app.",
					]}
				/>
			),
		},
		{
			id: "storage",
			title: "Storage on your device",
			body: (
				<p>
					We keep your session and connected-wallet choice in your browser’s local storage so you stay signed in. You can clear it
					at any time by signing out, disconnecting your wallet or clearing site data.
				</p>
			),
		},
		{
			id: "rights",
			title: "Your choices",
			body: (
				<p>
					Builders can edit their profile at any time and ask us to delete their account. On-chain records can’t be deleted by
					anyone, including us.
				</p>
			),
		},
	] satisfies Section[],
};

export const RISK = {
	eyebrow: "Risk disclosure",
	title: "Know the risks before you contribute",
	updated: UPDATED,
	intro: "Supporting a project should be an informed choice. Please read this before you contribute.",
	sections: [
		{
			id: "guarantee",
			title: "Approval isn’t a guarantee",
			body: (
				<p>
					Our review checks that a project is clearly described and has a valid Stellar address. It can’t guarantee that a project
					will succeed, deliver what it plans, or use funds as described.
				</p>
			),
		},
		{
			id: "final",
			title: "Payments are final",
			body: (
				<p>
					Contributions are direct Stellar payments to the project’s wallet. Chucksales never holds the funds, so we can’t pause,
					reverse or refund them. Check the project, the amount and the address before you approve.
				</p>
			),
		},
		{
			id: "not-financial",
			title: "Support, not a financial product",
			body: (
				<p>
					A contribution doesn’t give you ownership, a share of revenue, interest, tokens or any financial reward. Don’t
					contribute money you can’t afford to give.
				</p>
			),
		},
		{
			id: "scams",
			title: "Protect yourself from scams",
			body: (
				<List
					items={[
						"We will never ask for your secret key or recovery phrase.",
						"Only contribute through the project page on Chucksales, and check the destination address shown there.",
						"Ignore messages promising to double your contribution or offering “rewards”.",
						<>
							Report suspicious suggestions or projects so moderators can act.{" "}
							<Link href="/faq#is-it-secure" className="text-primary-300 hover:underline">
								Read more about safety
							</Link>
							.
						</>,
					]}
				/>
			),
		},
		{
			id: "network",
			title: "Network and wallet risks",
			body: (
				<p>
					Stellar, wallet apps and browser extensions are run by third parties and can have outages, bugs or delays. A
					contribution only counts once we’ve verified it on Stellar.
				</p>
			),
		},
		{
			id: "testnet",
			title: "Testnet",
			body: (
				<p>
					Chucksales currently runs on the Stellar Testnet. Testnet funds have no real value and the network can be reset. Nothing
					on Testnet should be treated as real money.
				</p>
			),
		},
	] satisfies Section[],
};
