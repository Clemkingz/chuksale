import type { AuditLog, Project, ProjectReview, Suggestion } from "@repo/domain/types";
import type { MockContribution, MockDb, MockNotification } from "./db";
import { DAY, hex, iso, random, stellarAddress, uuid } from "./util";

/**
 * Demo data. Dates are relative to the first run. Phase 2/3 grow the project list to cover every status.
 * Seeded projects that should accept real Testnet contributions use NEXT_PUBLIC_DEMO_DESTINATION (a funded
 * Testnet account) as their destination; otherwise a display-only address.
 */

export const DEMO_BUILDER_EMAIL = "builder@demo.local";
export const DEMO_ADMIN_EMAIL = "admin@demo.local";
export const DEMO_PASSWORD = "Password1";
export const DEMO_ADMIN_MFA = "123456";

type Seedable = Pick<Project, "title" | "slug" | "summary" | "category_id" | "stage" | "project_type" | "status"> &
	Partial<Project> & {
		daysAgo: number;
		/** Days until the fundraising window closes (negative = already ended). Approved + fundraising only. */
		endsInDays?: number;
		/** Confirmed demo contributions (XLM). */
		raised?: string[];
		/** Index into OTHER_BUILDERS; omitted = the demo builder. */
		owner?: number;
	};

/** Extra builders, so the admin console has more than one owner to show. They can't sign in (no password shared). */
const OTHER_BUILDERS = [
	{ name: "Edith Samson", email: "edith@demo.local", org: "Lagos Makers" },
	{ name: "Kofi Mensah", email: "kofi@demo.local", org: null },
];

const SEED_PROJECTS: Seedable[] = [
	{
		title: "Solar Schools Initiative",
		slug: "solar-schools-initiative",
		summary: "Solar kits for rural classrooms so lessons continue after dark.",
		category_id: "cat-education",
		stage: "live",
		project_type: "existing_project",
		status: "approved",
		target_amount: "5000.0000000",
		featured: true,
		daysAgo: 25,
		endsInDays: 18,
		raised: ["1500", "750", "300", "180"],
	},
	{
		title: "Open Water Map",
		slug: "open-water-map",
		summary: "A community-maintained map of safe drinking water points.",
		category_id: "cat-public-goods",
		stage: "mvp",
		project_type: "existing_project",
		status: "approved",
		target_amount: "2500.0000000",
		daysAgo: 12,
		endsInDays: 6.3,
		raised: ["400", "240"],
	},
	{
		title: "Code Club Lagos",
		slug: "code-club-lagos",
		summary: "Free weekend coding classes for teenagers, run by local volunteers.",
		category_id: "cat-education",
		stage: "prototype",
		project_type: "new_idea",
		status: "approved",
		target_amount: "1200.0000000",
		daysAgo: 4,
		endsInDays: -1,
		raised: ["800", "450"],
	},
	{
		title: "Mangrove Restoration Fund",
		slug: "mangrove-restoration-fund",
		summary: "Replanting coastal mangroves with fishing communities.",
		category_id: "cat-climate",
		stage: "idea",
		project_type: "new_idea",
		status: "under_review",
		daysAgo: 2,
	},
	{
		title: "Neighbourhood Tool Library",
		slug: "neighbourhood-tool-library",
		summary: "Borrow tools instead of buying them: a shared shed for the block.",
		category_id: "cat-community",
		stage: "idea",
		project_type: "new_idea",
		status: "changes_requested",
		daysAgo: 6,
	},
	{
		title: "Rainwater for Clinics",
		slug: "rainwater-for-clinics",
		summary: "Rainwater harvesting tanks for three rural health clinics.",
		category_id: "cat-climate",
		stage: "mvp",
		project_type: "existing_project",
		status: "approved",
		target_amount: "3000.0000000",
		daysAgo: 20,
		endsInDays: 0.073, // ≈ 1 h 45 m: shows the countdown ticking
		raised: ["1200", "650", "90"],
	},
	{
		title: "Community Radio Ibadan",
		slug: "community-radio-ibadan",
		summary: "A volunteer-run FM station for local news, health and farming tips.",
		category_id: "cat-community",
		stage: "prototype",
		project_type: "existing_project",
		status: "submitted",
		target_amount: "2000.0000000",
		daysAgo: 1,
	},
	{
		title: "Plastic-Free Markets",
		slug: "plastic-free-markets",
		summary: "Reusable bag stations for open-air markets.",
		category_id: "cat-climate",
		stage: "idea",
		project_type: "new_idea",
		status: "rejected",
		daysAgo: 15,
	},
	{
		title: "Girls in Robotics",
		slug: "girls-in-robotics",
		summary: "After-school robotics kits and mentors for girls aged 12–16.",
		category_id: "cat-education",
		stage: "idea",
		project_type: "new_idea",
		status: "draft",
		daysAgo: 0,
	},
	{
		title: "Clinic Queue SMS",
		slug: "clinic-queue-sms",
		summary: "Text-message queue numbers so patients can wait at home.",
		category_id: "cat-public-goods",
		stage: "live",
		project_type: "existing_project",
		status: "approved",
		target_amount: "4000.0000000",
		daysAgo: 40,
		endsInDays: 9,
		raised: ["900", "620", "410", "380"],
		owner: 0,
	},
	{
		title: "Makers Library Kano",
		slug: "makers-library-kano",
		summary: "A shared 3D printer and electronics bench for students.",
		category_id: "cat-education",
		stage: "mvp",
		project_type: "existing_project",
		status: "approved",
		target_amount: "2200.0000000",
		daysAgo: 30,
		endsInDays: 21,
		raised: ["300", "260"],
		owner: 1,
	},
	{
		title: "Riverbank Cleanups",
		slug: "riverbank-cleanups",
		summary: "Monthly cleanups with gear, transport and recycling partners.",
		category_id: "cat-climate",
		stage: "idea",
		project_type: "new_idea",
		status: "submitted",
		target_amount: "1500.0000000",
		daysAgo: 0.2,
		owner: 0,
	},
	{
		title: "Open Bus Times",
		slug: "open-bus-times",
		summary: "Crowd-sourced arrival times for city minibuses.",
		category_id: "cat-public-goods",
		stage: "prototype",
		project_type: "new_idea",
		status: "under_review",
		target_amount: "3500.0000000",
		daysAgo: 1.5,
		owner: 1,
	},
	{
		title: "Token Launchpad",
		slug: "token-launchpad",
		summary: "A presale platform for new tokens.",
		category_id: "cat-community",
		stage: "idea",
		project_type: "new_idea",
		status: "rejected",
		daysAgo: 9,
		owner: 1,
	},
];

export function buildSeed(version: number): MockDb {
	const rand = random(42);
	const now = Date.now();
	const at = (daysAgo: number) => iso(now - daysAgo * DAY);
	const builderId = uuid(rand);
	const adminId = uuid(rand);
	const otherIds = OTHER_BUILDERS.map(() => uuid(rand));
	const destination = process.env.NEXT_PUBLIC_DEMO_DESTINATION || stellarAddress(rand);
	// A pool of contributor wallets, so some people back several projects (admin "Trending" shows them).
	const wallets = Array.from({ length: 24 }, () => stellarAddress(rand));
	const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)]!;

	const contributions: MockContribution[] = [];
	const contribute = (projectId: string, amount: string, daysAgo: number) => {
		const when = at(daysAgo);
		contributions.push({
			id: uuid(rand),
			project_id: projectId,
			intent_id: uuid(rand),
			tx_hash: hex(64, rand),
			network: "testnet",
			sender_address: pick(wallets),
			destination_or_contract: destination,
			asset_id: "xlm",
			amount: `${amount}.0000000`,
			ledger_or_event_ref: null,
			status: "confirmed",
			failure_reason: null,
			created_at: when,
			confirmed_at: when,
		});
	};
	const projects: Project[] = SEED_PROJECTS.map(({ daysAgo, endsInDays, raised, owner, ...p }) => {
		const approved = p.status === "approved";
		const id = uuid(rand);
		// Spread each seeded amount over the time the project has been live, plus a trickle of small ones.
		const live = Math.max(1, daysAgo - 0.5);
		(raised ?? []).forEach((amount) => contribute(id, amount, rand() * live));
		if (approved)
			for (let i = 0; i < 4 + Math.floor(rand() * 6); i++) contribute(id, String(5 + Math.floor(rand() * 90)), rand() * live);
		const ownerId = owner === undefined ? builderId : otherIds[owner]!;
		return {
			id,
			owner_user_id: ownerId,
			problem: "",
			solution: "",
			beneficiaries: "",
			cover_image_url: null,
			logo_url: null,
			contact_email: owner === undefined ? DEMO_BUILDER_EMAIL : OTHER_BUILDERS[owner]!.email,
			team: [{ name: owner === undefined ? "Ada Builder" : OTHER_BUILDERS[owner]!.name, role: "Lead" }],
			links: [],
			fundraising: !!p.target_amount,
			target_amount: null,
			target_asset_id: p.target_amount ? "xlm" : null,
			destination_address: p.target_amount ? destination : null,
			visibility: approved ? "published" : "unpublished",
			featured: false,
			submitted_at: p.status === "draft" ? null : at(daysAgo + 3),
			approved_at: approved ? at(daysAgo) : null,
			ends_at: approved && endsInDays !== undefined ? iso(now + endsInDays * DAY) : null,
			created_at: at(daysAgo + 5),
			updated_at: at(daysAgo),
			...p,
		};
	});

	const note = (n: Omit<MockNotification, "id" | "payload" | "read_by"> & Partial<MockNotification>): MockNotification => ({
		id: uuid(rand),
		payload: {},
		read_by: [],
		...n,
	});
	const forBuilder = { user_id: builderId, wallet_address: null, broadcast: false } as const;
	const toAll = { user_id: null, wallet_address: null, broadcast: true } as const;

	const notifications: MockNotification[] = [
		...projects
			.filter((p) => p.status === "approved")
			.map((p) =>
				note({
					...toAll,
					type: "project_published",
					category: "projects",
					title: `${p.title} is now open for contributions`,
					action: { label: "Contribute", href: `/projects/${p.slug}` },
					created_at: p.approved_at!,
				}),
			),
		note({
			...forBuilder,
			type: "changes_requested",
			category: "projects",
			title: "Changes requested on Neighbourhood Tool Library",
			body: "Please add a short summary of how tools are stored and lent out, and the Stellar address that should receive contributions.",
			action: { label: "See what to change", href: `/builder/projects/${projects[4]!.id}` },
			created_at: at(1),
		}),
		note({
			...forBuilder,
			type: "project_rejected",
			category: "projects",
			title: "Plastic-Free Markets was rejected",
			body: "We couldn’t verify the market partners named in the plan. You’re welcome to submit a new project with letters of support from at least two markets.",
			action: { label: "See why", href: `/builder/projects/${projects.find((p) => p.slug === "plastic-free-markets")!.id}` },
			created_at: at(0.3),
		}),
		note({
			...forBuilder,
			type: "submission_received",
			category: "projects",
			title: "We received Mangrove Restoration Fund for review",
			action: { label: "View status", href: `/builder/projects/${projects[3]!.id}` },
			created_at: at(2),
			read_by: [`u:${builderId}`],
		}),
		note({
			...forBuilder,
			type: "funding_milestone",
			category: "contributions",
			title: "Solar Schools Initiative passed 50% of its target",
			action: { label: "View project", href: "/projects/solar-schools-initiative" },
			created_at: at(3),
			read_by: [`u:${builderId}`],
		}),
	].sort((a, b) => b.created_at.localeCompare(a.created_at));

	// A few contributions that didn't (or haven't yet) confirmed, for the admin monitor. Never counted.
	const live = projects.filter((p) => p.status === "approved");
	const notCounted = (
		status: "pending" | "failed",
		p: Project,
		amount: string,
		daysAgo: number,
		reason: string | null,
	): MockContribution => ({
		id: uuid(rand),
		project_id: p.id,
		intent_id: uuid(rand),
		tx_hash: hex(64, rand),
		network: "testnet",
		sender_address: pick(wallets),
		destination_or_contract: p.destination_address ?? destination,
		asset_id: "xlm",
		amount: `${amount}.0000000`,
		ledger_or_event_ref: null,
		status,
		failure_reason: reason,
		created_at: at(daysAgo),
		confirmed_at: null,
		reconcile_flag: status === "failed" ? reason : null,
	});
	contributions.push(
		notCounted("pending", live[0]!, "120", 0.01, null),
		notCounted("failed", live[1]!, "60", 2, "The payment’s memo didn’t match the contribution reference."),
		notCounted("failed", live[2]!, "25", 5, "Stellar rejected the transaction (op_underfunded)."),
	);

	// Suggestions (PRD §6.6): published ones show on project pages; pending/reported wait for moderation.
	const suggestion = (
		p: Project,
		s: Pick<Suggestion, "type" | "title" | "body" | "status"> & Partial<Suggestion>,
		daysAgo: number,
	): Suggestion => ({
		id: uuid(rand),
		project_id: p.id,
		wallet_address: pick(wallets),
		link: null,
		report_count: 0,
		created_at: at(daysAgo),
		moderated_by: s.status === "pending_moderation" ? null : adminId,
		moderated_at: s.status === "pending_moderation" ? null : at(Math.max(0, daysAgo - 0.5)),
		moderation_reason: null,
		...s,
	});
	const solar = projects.find((p) => p.slug === "solar-schools-initiative")!;
	const water = projects.find((p) => p.slug === "open-water-map")!;
	const code = projects.find((p) => p.slug === "code-club-lagos")!;
	const suggestions: Suggestion[] = [
		suggestion(
			solar,
			{
				type: "product_improvement",
				title: "Publish a per-school install log",
				body: "A simple public log of which classrooms got kits and when would make progress easy to follow for everyone who contributed.",
				status: "published",
			},
			9,
		),
		suggestion(
			solar,
			{
				type: "technical_feedback",
				title: "Use LiFePO4 batteries for the kits",
				body: "They last far longer in hot classrooms than lead-acid batteries and need less maintenance, so the kits keep working after the first year.",
				status: "published",
			},
			6,
		),
		suggestion(
			solar,
			{
				type: "community_marketing",
				title: "Partner with local radio for updates",
				body: "A short monthly segment on community radio would reach parents who aren’t online and build trust in the project.",
				status: "pending_moderation",
			},
			0.4,
		),
		suggestion(
			water,
			{
				type: "technical_feedback",
				title: "Offline mode for the map",
				body: "Many water points are in places with no signal. Caching the map tiles and syncing reports later would help field volunteers a lot.",
				status: "published",
			},
			4,
		),
		suggestion(
			water,
			{
				type: "other",
				title: "Free tokens for everyone!!!",
				body: "Click my link to claim free tokens and double your contribution in minutes, limited time offer for early users only.",
				status: "pending_moderation",
				report_count: 3,
				link: "https://example.com/claim",
			},
			0.2,
		),
		suggestion(
			code,
			{
				type: "product_improvement",
				title: "Add a girls-only weekend cohort",
				body: "A dedicated cohort with a mentor could help more girls join and stay. Other clubs saw retention improve with this.",
				status: "published",
			},
			2,
		),
		suggestion(
			code,
			{
				type: "community_marketing",
				title: "Share student projects on the page",
				body: "Posting a few student projects each month as updates would show contributors exactly what their support makes possible.",
				status: "rejected",
				moderation_reason: "Duplicate of an existing suggestion.",
			},
			3,
		),
	];

	// Review records behind the seeded decisions: the builder sees `reason`, admins also see `internal_note`.
	const bySlug = (slug: string) => projects.find((p) => p.slug === slug)!;
	const review = (
		slug: string,
		decision: ProjectReview["decision"],
		reason: string | null,
		internal: string | null,
		daysAgo: number,
	): ProjectReview => ({
		id: uuid(rand),
		project_id: bySlug(slug).id,
		admin_user_id: adminId,
		decision,
		reason,
		internal_note: internal,
		created_at: at(daysAgo),
	});
	const reviews: ProjectReview[] = [
		review(
			"neighbourhood-tool-library",
			"request_changes",
			"Please add a short summary of how tools are stored and lent out, and the Stellar address that should receive contributions.",
			"Good idea, thin on details.",
			1,
		),
		review(
			"plastic-free-markets",
			"reject",
			"We couldn’t verify the market partners named in the plan. You’re welcome to submit a new project with letters of support from at least two markets.",
			"Two of the named markets said they hadn’t heard of it.",
			0.3,
		),
		review(
			"token-launchpad",
			"reject",
			"Token sales and presales aren’t allowed on Chucksales (see the Terms of use).",
			"Out of scope per PRD §2.",
			8.5,
		),
		review("open-bus-times", "under_review", null, null, 1.2),
	];

	// Audit history for the seeded approvals (every admin action is audited, PRD §18).
	const audit: AuditLog[] = projects
		.filter((p) => p.approved_at)
		.map((p) => ({
			id: uuid(rand),
			actor_user_id: adminId,
			action: "project.approve",
			entity_type: "project",
			entity_id: p.id,
			before_snapshot: { status: "under_review", visibility: "unpublished" },
			after_snapshot: { status: "approved", visibility: "published", reason: null },
			created_at: p.approved_at!,
		}));

	return {
		version,
		seededAt: iso(now),
		users: [
			{
				id: builderId,
				email: DEMO_BUILDER_EMAIL,
				password: DEMO_PASSWORD,
				role: "builder",
				email_verified: true,
				status: "active",
				is_active: true,
				mfa_code: null,
				created_at: at(60),
				updated_at: at(60),
			},
			{
				id: adminId,
				email: DEMO_ADMIN_EMAIL,
				password: DEMO_PASSWORD,
				role: "admin",
				email_verified: true,
				status: "active",
				is_active: true,
				mfa_code: DEMO_ADMIN_MFA,
				created_at: at(90),
				updated_at: at(90),
			},
			...OTHER_BUILDERS.map((b, i) => ({
				id: otherIds[i]!,
				email: b.email,
				password: hex(16, rand),
				role: "builder" as const,
				email_verified: true,
				status: "active" as const,
				is_active: true,
				mfa_code: null,
				created_at: at(70 - i * 10),
				updated_at: at(70 - i * 10),
			})),
		],
		profiles: [
			{
				id: uuid(rand),
				user_id: builderId,
				display_name: "Ada Builder",
				organization_name: "Open Commons Lab",
				bio: null,
				website: null,
				contact_email: DEMO_BUILDER_EMAIL,
				avatar_url: null,
				wallet_address: destination,
				twitter_url: null,
				discord_url: null,
				telegram_url: null,
			},
			...[...OTHER_BUILDERS, { name: "Site Admin", email: DEMO_ADMIN_EMAIL, org: null }].map((b, i) => ({
				id: uuid(rand),
				user_id: i < OTHER_BUILDERS.length ? otherIds[i]! : adminId,
				display_name: b.name,
				organization_name: b.org,
				bio: null,
				website: null,
				contact_email: b.email,
				avatar_url: null,
				wallet_address: null,
				twitter_url: null,
				discord_url: null,
				telegram_url: null,
			})),
		],
		categories: [
			{ id: "cat-education", name: "Education", slug: "education", is_active: true },
			{ id: "cat-climate", name: "Climate", slug: "climate", is_active: true },
			{ id: "cat-public-goods", name: "Public goods", slug: "public-goods", is_active: true },
			{ id: "cat-community", name: "Community", slug: "community", is_active: true },
		],
		projects,
		revisions: [],
		reviews,
		updates: [],
		intents: [],
		contributions,
		suggestions,
		reports: [],
		notifications,
		otps: [],
		seededWallets: [],
		seededContributionWallets: [],
		audit,
		adminAccounts: {
			[adminId]: {
				first_name: "Site",
				last_name: "Admin",
				phone: null,
				bio: "Lead Admin",
				country: "Nigeria",
				city: "Lagos",
				postal_code: null,
				avatar_url: null,
				password_changed_at: at(90),
				notifications: {
					new_submissions: true,
					resubmissions: true,
					reported_suggestions: true,
					contribution_issues: true,
					weekly_summary: false,
				},
			},
		},
		rateLimits: {},
	};
}
