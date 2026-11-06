import type { ProjectStage, ProjectStatus, ProjectType, SuggestionStatus, SuggestionType } from "@repo/domain/types";
import type { CategoryRec, ContributionRec, MockDb, ProjectRec, ReviewRec, SuggestionRec, UserRec } from "./records";
import { DAY, USDC_ISSUER, hex, iso, random, stellarAddress, uuid } from "./util";

/**
 * Demo data for mock mode, in the live API's shapes. Deterministic (seeded PRNG), relative to "now" so dates
 * always look recent. Demo accounts: builder@demo.local / Password1 and admin@demo.local / Password1.
 */

export const DEMO_BUILDER_EMAIL = "builder@demo.local";
export const DEMO_ADMIN_EMAIL = "admin@demo.local";
const XLM = "XLM";
const USDC = `USDC:${USDC_ISSUER}`;

const CATEGORIES: [string, string][] = [
	["Payments & Remittances", "payments-remittances"],
	["Financial Inclusion", "financial-inclusion"],
	["Education", "education"],
	["Developer Tools", "developer-tools"],
	["Social Impact", "social-impact"],
	["Marketplaces & Commerce", "marketplaces-commerce"],
	["Infrastructure", "infrastructure"],
	["Other", "other"],
];

type Seed = {
	title: string;
	summary: string;
	cat: string;
	stage: ProjectStage;
	type: ProjectType;
	status: ProjectStatus;
	owner: "demo" | 0 | 1;
	daysAgo: number;
	featured?: boolean;
	target?: [string, "XLM" | "USDC"];
	accepts?: ("XLM" | "USDC")[];
	reason?: string;
};

const PROJECTS: Seed[] = [
	{ title: "Solar Schools Initiative", summary: "Solar kits for rural classrooms so lessons continue after dark.", cat: "social-impact", stage: "launched", type: "existing_project", status: "approved", owner: "demo", daysAgo: 40, featured: true, target: ["5000", "XLM"], accepts: ["XLM", "USDC"] },
	{ title: "Open Water Map", summary: "A community-maintained map of safe drinking water points.", cat: "social-impact", stage: "mvp", type: "existing_project", status: "approved", owner: 0, daysAgo: 33, featured: true, target: ["2500", "XLM"], accepts: ["XLM"] },
	{ title: "Code Club Lagos", summary: "Free weekend coding classes for teenagers, run by local volunteers.", cat: "education", stage: "launched", type: "existing_project", status: "approved", owner: 1, daysAgo: 28, target: ["1200", "USDC"], accepts: ["USDC", "XLM"] },
	{ title: "Market Pay", summary: "Instant USDC payments for market traders, settled on Stellar in seconds.", cat: "payments-remittances", stage: "prototype", type: "new_idea", status: "approved", owner: 0, daysAgo: 20, featured: true, target: ["3000", "USDC"], accepts: ["USDC"] },
	{ title: "Clinic Queue SMS", summary: "Text-message queue numbers so patients can wait at home instead of the clinic.", cat: "infrastructure", stage: "mvp", type: "existing_project", status: "approved", owner: 1, daysAgo: 14, target: ["1500", "XLM"], accepts: ["XLM"] },
	{ title: "Stellar Docs in Yoruba", summary: "Translating the core Stellar developer docs into Yoruba for new builders.", cat: "developer-tools", stage: "idea", type: "new_idea", status: "approved", owner: 0, daysAgo: 9 },
	{ title: "Mangrove Restoration Fund", summary: "Replanting coastal mangroves together with local fishing communities.", cat: "social-impact", stage: "prototype", type: "new_idea", status: "under_review", owner: "demo", daysAgo: 4, target: ["4000", "XLM"], accepts: ["XLM"] },
	{ title: "Community Radio Ibadan", summary: "A volunteer-run FM station for local news, health and farming tips.", cat: "other", stage: "launched", type: "existing_project", status: "submitted", owner: 1, daysAgo: 2, target: ["2000", "XLM"], accepts: ["XLM"] },
	{ title: "Riverbank Cleanups", summary: "Monthly cleanups with gear, transport and recycling partners along the river.", cat: "social-impact", stage: "launched", type: "existing_project", status: "submitted", owner: 0, daysAgo: 1 },
	{ title: "Neighbourhood Tool Library", summary: "Borrow tools instead of buying them: a shared shed for the whole block.", cat: "marketplaces-commerce", stage: "idea", type: "new_idea", status: "changes_requested", owner: "demo", daysAgo: 6, reason: "Please add who is on the team and how tools are tracked and returned. A short plan for the first three months would help too." },
	{ title: "Plastic-Free Markets", summary: "Reusable bag stations for open-air markets, funded by the stall holders.", cat: "social-impact", stage: "idea", type: "new_idea", status: "rejected", owner: "demo", daysAgo: 12, reason: "The description is too vague to review, and we couldn’t verify the partner markets. You’re welcome to submit a new project with more detail." },
	{ title: "Token Launchpad", summary: "A presale platform where anyone can launch a new token.", cat: "financial-inclusion", stage: "idea", type: "new_idea", status: "rejected", owner: 1, daysAgo: 18, reason: "Token sales, presales or profit promises aren’t allowed on Chucksales." },
	{ title: "Girls in Robotics", summary: "After-school robotics kits and mentors for girls aged 12–16.", cat: "education", stage: "idea", type: "new_idea", status: "draft", owner: "demo", daysAgo: 1 },
];

const STORY = {
	problem: (t: string) =>
		`Without ${t.toLowerCase()}, the people it serves rely on slow, expensive or missing alternatives. That costs time and money every week, and the gap is widest for those with the least.`,
	solution: (t: string) =>
		`${t} closes that gap with a simple, local approach the community runs itself. Funds go straight to the team’s Stellar wallet, and progress is shared openly with supporters.`,
	beneficiaries: "Families, students and small businesses in the neighbourhoods we work in, starting with about 400 people.",
};

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildSeed(version: number): MockDb {
	const rand = random(20261105);
	const t0 = Date.now();
	const ago = (days: number, hours = 0) => iso(t0 - days * DAY - hours * 3_600_000);

	const user = (email: string, name: string, role: "builder" | "admin", org: string | null, days: number): UserRec => ({
		id: uuid(rand),
		email,
		name,
		role,
		password: "Password1",
		emailVerified: true,
		suspension: null,
		profile:
			role === "builder"
				? { displayName: name, organizationName: org, bio: org ? `Building with ${org} since 2024.` : null, websiteUrl: null, contactEmail: null }
				: null,
		createdAt: ago(days),
	});
	const demo = user(DEMO_BUILDER_EMAIL, "Ada Builder", "builder", "Lagos Stellar Builders", 60);
	demo.profile!.bio = "Community organiser and builder. I start small projects that make daily life a little easier in Lagos.";
	demo.profile!.websiteUrl = "https://example.org";
	const others = [user("edith@demo.local", "Edith Samson", "builder", "Lagos Makers", 55), user("kofi@demo.local", "Kofi Mensah", "builder", null, 50)];
	const admin = user(DEMO_ADMIN_EMAIL, "Demo Admin", "admin", null, 90);
	const admin2 = user("moderator@demo.local", "Tolu Moderator", "admin", null, 80);
	const users = [demo, ...others, admin, admin2];

	const categories: CategoryRec[] = CATEGORIES.map(([name, slug], i) => ({ id: uuid(rand), name, slug, isActive: true, sortOrder: i + 1 }));
	const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

	const projects: ProjectRec[] = [];
	const reviews: ReviewRec[] = [];
	const revisions: MockDb["revisions"] = [];
	const notifications: MockDb["notifications"] = [];
	const audit: MockDb["audit"] = [];
	let reviewId = 0;

	for (const s of PROJECTS) {
		const owner = s.owner === "demo" ? demo : others[s.owner]!;
		const submitted = s.status !== "draft";
		const decided = ["approved", "rejected", "changes_requested"].includes(s.status);
		const fundraising = !!s.target;
		const p: ProjectRec = {
			id: uuid(rand),
			ownerId: owner.id,
			type: s.type,
			status: s.status,
			title: s.title,
			slug: s.status === "approved" ? slugify(s.title) : null,
			summary: s.summary,
			problem: s.status === "draft" ? null : STORY.problem(s.title),
			solution: s.status === "draft" ? null : STORY.solution(s.title),
			categoryId: catId(s.cat),
			stage: s.stage,
			beneficiaries: s.status === "draft" ? null : STORY.beneficiaries,
			teamMembers: s.status === "draft" ? [] : [{ name: owner.name, role: "Founder" }, { name: "Chidi Okafor", role: "Operations" }],
			links: s.status === "draft" ? [] : [{ label: "Website", url: `https://${slugify(s.title)}.example.org` }],
			coverImageUrl: null,
			fundraisingEnabled: fundraising,
			targetAmount: s.target?.[0] ?? null,
			targetAssetId: s.target ? (s.target[1] === "XLM" ? XLM : USDC) : null,
			acceptedAssetIds: (s.accepts ?? []).map((a) => (a === "XLM" ? XLM : USDC)),
			payoutAddress: fundraising ? stellarAddress(rand) : null,
			published: s.status === "approved",
			featured: !!s.featured,
			revision: submitted ? 1 : 0,
			submittedAt: submitted ? ago(s.daysAgo + 2) : null,
			decidedAt: decided ? ago(s.daysAgo) : null,
			publishedAt: s.status === "approved" ? ago(s.daysAgo) : null,
			createdAt: ago(s.daysAgo + 4),
			updatedAt: ago(s.daysAgo),
		};
		projects.push(p);
		if (submitted) {
			const { id: _i, ownerId: _o, ...snapshot } = p;
			revisions.push({ projectId: p.id, revision: 1, submittedBy: owner.id, submittedAt: p.submittedAt!, snapshot });
		}
		const review = (action: ReviewRec["action"], from: ProjectStatus, to: ProjectStatus, reason: string | null, at: string, note: string | null = null) => {
			reviews.push({ id: ++reviewId, projectId: p.id, action, fromStatus: from, toStatus: to, reason, internalNote: note, adminId: admin.id, revision: p.revision, at });
			audit.unshift({ id: 0, at, actorId: admin.id, action: `project.${action}`, resourceType: "project", resourceId: p.id, requestId: uuid(rand), traceId: null, ip: "127.0.0.1", metadata: reason ? { reason } : {}, before: { status: from }, after: { status: to } });
		};
		if (s.status === "under_review") review("start_review", "submitted", "under_review", null, ago(s.daysAgo, -2));
		if (decided) {
			review("start_review", "submitted", "under_review", null, ago(s.daysAgo + 1));
			if (s.status === "approved") review("approve", "under_review", "approved", null, ago(s.daysAgo));
			if (s.status === "rejected") review("reject", "under_review", "rejected", s.reason!, ago(s.daysAgo), "Checked the partner list: none of the markets could be reached.");
			if (s.status === "changes_requested") review("request_changes", "under_review", "changes_requested", s.reason!, ago(s.daysAgo), "Looks promising. Repo is active.");
		}
		if (owner === demo) {
			if (s.status === "approved") notifications.push({ id: uuid(rand), userId: demo.id, type: "project_approved", title: `${p.title} was approved and is now live`, body: "Congratulations! Your project is live and can receive contributions.", projectId: p.id, readAt: ago(s.daysAgo - 1), createdAt: ago(s.daysAgo) });
			if (s.status === "rejected") notifications.push({ id: uuid(rand), userId: demo.id, type: "project_rejected", title: `${p.title} was rejected`, body: s.reason!, projectId: p.id, readAt: null, createdAt: ago(s.daysAgo) });
			if (s.status === "changes_requested") notifications.push({ id: uuid(rand), userId: demo.id, type: "project_changes_requested", title: `Changes requested on ${p.title}`, body: s.reason!, projectId: p.id, readAt: null, createdAt: ago(s.daysAgo) });
			if (s.status === "under_review") notifications.push({ id: uuid(rand), userId: demo.id, type: "project_submitted", title: `We received ${p.title} for review`, body: "An admin will review it soon. You’ll be notified of the decision.", projectId: p.id, readAt: null, createdAt: p.submittedAt! });
		}
		if (s.status === "submitted")
			for (const a of [admin, admin2])
				notifications.push({ id: uuid(rand), userId: a.id, type: "review_requested", title: `${p.title} is waiting for review`, body: `Revision 1, submitted by ${owner.name}.`, projectId: p.id, readAt: null, createdAt: p.submittedAt! });
	}
	audit.forEach((a, i) => (a.id = audit.length - i));

	// Contributions: confirmed totals for live projects, plus a pending and a failed one.
	const wallets = Array.from({ length: 9 }, () => stellarAddress(rand));
	const contributions: ContributionRec[] = [];
	const add = (p: ProjectRec, status: ContributionRec["status"], daysAgo: number, assetId: string, amount: string, wallet: string) => {
		const at = ago(daysAgo, Math.floor(rand() * 20));
		contributions.push({
			id: uuid(rand),
			projectId: p.id,
			status,
			contributorAddress: wallet,
			assetId,
			amount,
			destination: p.payoutAddress!,
			memo: `CS-${hex(6, rand).toUpperCase()}`,
			fee: "0.0000100",
			txHash: hex(64, rand),
			expiresAt: iso(Date.parse(at) + 10 * 60_000),
			submittedAt: at,
			confirmedAt: status === "confirmed" ? at : null,
			ledger: status === "confirmed" ? 1_100_000 + Math.floor(rand() * 90_000) : null,
			failureReason: status === "failed" ? "Not enough XLM in the wallet for this amount and the network fee" : null,
			resultCodes: status === "confirmed" ? ["tx_success"] : status === "failed" ? ["tx_failed", "op_underfunded"] : null,
			createdAt: at,
			updatedAt: at,
		});
	};
	for (const p of projects.filter((x) => x.status === "approved" && x.fundraisingEnabled)) {
		const n = 3 + Math.floor(rand() * 6);
		for (let i = 0; i < n; i++) {
			const assetId = p.acceptedAssetIds[i % p.acceptedAssetIds.length]!;
			const amount = String([25, 50, 100, 150, 250, 40, 75][Math.floor(rand() * 7)]);
			add(p, "confirmed", 1 + Math.floor(rand() * 25), assetId, amount, wallets[Math.floor(rand() * wallets.length)]!);
		}
	}
	const solar = projects[0]!;
	add(solar, "pending", 0, XLM, "60", wallets[0]!);
	contributions.at(-1)!.submittedAt = iso(t0 - 25 * 60_000); // stuck > 10 min: shows on the admin overview
	add(solar, "failed", 2, XLM, "9000", wallets[1]!);
	notifications.push({ id: uuid(rand), userId: demo.id, type: "first_contribution", title: `${solar.title} received its first contribution`, body: "50 XLM was confirmed on Stellar.", projectId: solar.id, readAt: ago(20), createdAt: ago(21) });

	// Suggestions and a report.
	const suggestions: SuggestionRec[] = [];
	const suggest = (p: ProjectRec, type: SuggestionType, title: string, body: string, status: SuggestionStatus, daysAgo: number, wallet: string, note: string | null = null) =>
		suggestions.push({ id: uuid(rand), projectId: p.id, walletAddress: wallet, type, title, body, link: null, status, moderationNote: note, moderatedAt: status === "pending" ? null : ago(daysAgo - 1 < 0 ? 0 : daysAgo - 1), moderatedBy: status === "pending" ? null : admin.id, createdAt: ago(daysAgo) });
	suggest(solar, "product_improvement", "Publish a per-school install log", "A short log per school (date, kit size, photos) would show supporters exactly where the funds went.", "published", 10, wallets[2]!);
	suggest(solar, "technical_feedback", "Use LiFePO4 batteries for the kits", "They last far longer in heat than lead-acid batteries and need less maintenance over the years.", "published", 7, wallets[3]!);
	suggest(solar, "community_marketing", "Partner with local radio for updates", "Community radio reaches parents who aren’t online. A monthly slot could share progress.", "pending", 1, wallets[4]!);
	suggest(projects[1]!, "product_improvement", "Offline mode for the map", "Many water points are in areas with poor signal. Caching the map would make it usable there.", "published", 6, wallets[5]!);
	suggest(projects[1]!, "other", "Free tokens for everyone!!!", "Click my link to claim free tokens now, limited offer for the first hundred wallets only!!", "pending", 0, wallets[6]!);
	suggest(projects[2]!, "community_marketing", "Share student projects on the page", "Showing what students built each term would bring in more volunteers and supporters.", "rejected", 5, wallets[7]!, "Please share this with the club directly; we keep suggestions about the project itself.");
	const reports: MockDb["reports"] = [
		{ id: uuid(rand), entityType: "suggestion", entityId: suggestions[3]!.id, entityTitle: suggestions[3]!.title, reporterAddress: wallets[8]!, reason: "spam", details: "Looks like a copy-paste from another project.", status: "open", resolutionNote: null, resolvedBy: null, resolvedAt: null, createdAt: ago(1) },
		{ id: uuid(rand), entityType: "project", entityId: projects[3]!.id, entityTitle: projects[3]!.title, reporterAddress: wallets[2]!, reason: "misleading", details: "The demo link doesn’t work.", status: "open", resolutionNote: null, resolvedBy: null, resolvedAt: null, createdAt: ago(0, 5) },
	];

	// Analytics events over the last 30 days.
	const events: MockDb["events"] = [];
	for (const p of projects) {
		events.push({ name: "project_draft_created", at: p.createdAt, projectId: p.id });
		if (p.submittedAt) events.push({ name: "project_submitted", at: p.submittedAt, projectId: p.id });
		if (p.decidedAt) events.push({ name: "project_review_decided", at: p.decidedAt, projectId: p.id });
		if (p.publishedAt) {
			events.push({ name: "project_published", at: p.publishedAt, projectId: p.id });
			for (let d = 0; d < 30; d++) for (let k = Math.floor(rand() * 6); k > 0; k--) events.push({ name: "project_viewed", at: ago(d, Math.floor(rand() * 23)), projectId: p.id });
		}
	}
	for (const c of contributions) {
		events.push({ name: "contribution_started", at: c.createdAt, projectId: c.projectId, wallet: c.contributorAddress });
		events.push({ name: "contribution_submitted", at: c.createdAt, projectId: c.projectId, wallet: c.contributorAddress });
		if (c.status === "confirmed") events.push({ name: "contribution_confirmed", at: c.createdAt, projectId: c.projectId });
		if (c.status === "failed") events.push({ name: "contribution_failed", at: c.createdAt, projectId: c.projectId });
	}
	for (const s of suggestions) events.push({ name: "suggestion_submitted", at: s.createdAt, projectId: s.projectId, wallet: s.walletAddress });
	for (const u of users.filter((x) => x.role === "builder")) events.push({ name: "builder_registered", at: u.createdAt });
	for (const w of wallets) events.push({ name: "wallet_connected", at: ago(Math.floor(rand() * 28)), wallet: w });

	return {
		version,
		seededAt: iso(t0),
		users,
		refreshTokens: [],
		otps: [],
		categories,
		projects,
		reviews,
		revisions,
		contributions,
		walletSessions: [],
		challenges: [],
		suggestions,
		reports,
		restrictions: [],
		notifications: notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
		audit,
		events,
		rateLimits: {},
	};
}
