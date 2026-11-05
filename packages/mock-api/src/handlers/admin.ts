import type {
	AdminBuilder,
	AdminBuilderProject,
	AdminOverview,
	AdminProjectListItem,
	Notification,
	Project,
	ProjectStatus,
	ReviewDecision,
} from "@repo/domain/types";
import { countsTowardTotal } from "@repo/domain/contribution-status";
import { compare, progressPercent, sum, toStroops } from "@repo/domain/money";
import {
	adminDecisions,
	inAdminTab,
	inBuilderGroup,
	isPubliclyVisible,
	transition,
	type AdminProjectTab,
} from "@repo/domain/project-status";
import { read, update, type MockDb, type MockUser } from "../db";
import { HttpError, TOKEN_PREFIX, ok, route } from "../router";
import { DEMO_ADMIN_EMAIL } from "../seed";
import { DAY, hex, iso, paginate, uuid } from "../util";

/**
 * Admin console (designs "admin page 1–4"): sign-in with a second step, overview, projects list, project detail
 * with its contributions, and review decisions through the state machine (each writes an audit entry and tells
 * the builder). Contract: docs/API.md § Admin.
 */

const ASSET_CODE: Record<string, string> = { xlm: "XLM", usdc: "USDC" };
const TABS: AdminProjectTab[] = ["all", "completed", "pending", "cancelled"];

const nameOf = (db: MockDb, userId: string) => db.profiles.find((p) => p.user_id === userId)?.display_name ?? "Unknown builder";
const emailOf = (db: MockDb, userId: string) => db.users.find((u) => u.id === userId)?.email ?? "";
const confirmedFor = (db: MockDb, projectId: string) =>
	db.contributions.filter((c) => c.project_id === projectId && countsTowardTotal(c.status));

function adminSession(db: MockDb, user: MockUser) {
	return {
		access_token: `${TOKEN_PREFIX}${user.id}.${hex(24)}`,
		expires_at: Date.now() + 12 * 60 * 60 * 1000,
		user: { id: user.id, email: user.email, role: user.role, display_name: nameOf(db, user.id) },
	};
}

// ------------------------------------------------------------------ auth (D7: password, then a 6-digit code)

/** Challenges live in memory: a reload just means signing in again. */
const challenges = new Map<string, { userId: string; expires: number }>();

/**
 * Mock (test mode): signing in can't get stuck. The real admin account works as usual; ANY other email/password
 * signs in as the demo admin. If the demo admin was deleted or suspended from the console, it's restored.
 * The real API keeps the strict rules: 401 wrong credentials, 403 non-admin or suspended.
 */
function demoAdmin() {
	return update((db) => {
		const u = db.users.find((x) => x.email === DEMO_ADMIN_EMAIL && x.role === "admin")!;
		u.is_active = true;
		u.status = "active";
		return u;
	});
}

route("POST", "/admin/auth/login", "public", ({ body }) => {
	const email = String(body.email ?? "")
		.trim()
		.toLowerCase();
	const match = read().users.find((u) => u.email === email && u.role === "admin" && u.is_active && u.password === body.password);
	const user = match ?? demoAdmin();
	const challenge_id = uuid();
	challenges.set(challenge_id, { userId: user.id, expires: Date.now() + 10 * 60 * 1000 });
	// Mock: any 6-digit code works; the demo inbox shows one anyway.
	return ok({ mfa_required: true, challenge_id, debug_code: user.mfa_code ?? "123456" }, "Enter your 6-digit code");
});

/** Mock only: "Continue as demo admin" on the sign-in page skips both steps. */
route("POST", "/mock/admin/session", "public", () => ok(adminSession(read(), demoAdmin()), "Signed in as the demo admin"));

route("POST", "/admin/auth/mfa", "public", ({ body }) => {
	const c = challenges.get(String(body.challenge_id ?? ""));
	if (!c || c.expires < Date.now())
		throw new HttpError(400, "This sign-in expired. Enter your password again.", { reason: "expired" });
	if (!/^\d{6}$/.test(String(body.code ?? ""))) throw new HttpError(400, "Enter the 6-digit code.");
	challenges.delete(String(body.challenge_id));
	const db = read();
	const user = db.users.find((u) => u.id === c.userId)!;
	return ok(adminSession(db, user), "Signed in");
});

route("GET", "/admin/me", "admin", ({ user }) => ok(adminSession(read(), user!).user));

// ------------------------------------------------------------------ overview (admin page 1)

const RANGES = {
	week: { buckets: 7, size: DAY, label: (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" }) },
	month: { buckets: 30, size: DAY, label: (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) },
	quarter: { buckets: 13, size: 7 * DAY, label: (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) },
} as const;

route("GET", "/admin/overview", "admin", ({ query }) => {
	const db = read();
	const rangeKey = (query.get("range") ?? "week") as keyof typeof RANGES;
	const range = RANGES[rangeKey] ?? RANGES.week;
	const confirmed = db.contributions.filter((c) => countsTowardTotal(c.status) && c.asset_id === "xlm");

	// Buckets end today; the last one is "today" (or "this week").
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const end = today.getTime() + (range.size === DAY ? DAY : 7 * DAY);
	const start = end - range.buckets * range.size;
	const series = Array.from({ length: range.buckets }, (_, i) => {
		const from = start + i * range.size;
		const inBucket = confirmed.filter((c) => {
			const t = new Date(c.confirmed_at ?? c.created_at).getTime();
			return t >= from && t < from + range.size;
		});
		return {
			label: range.label(new Date(from)),
			start: iso(from),
			amount: sum(inBucket.map((c) => c.amount)),
			count: inBucket.length,
		};
	});
	const inPeriod = confirmed.filter((c) => new Date(c.confirmed_at ?? c.created_at).getTime() >= start);

	const live = db.projects.filter((p) => isPubliclyVisible(p) && p.target_amount);
	const liveRaised = sum(live.flatMap((p) => confirmedFor(db, p.id).map((c) => c.amount)));
	const liveTarget = sum(live.map((p) => p.target_amount!));

	const trending = db.projects
		.filter(isPubliclyVisible)
		.map((p) => {
			const recent = inPeriod.filter((c) => c.project_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
			return {
				id: p.id,
				title: p.title,
				slug: p.slug,
				logo_url: p.logo_url,
				builder: nameOf(db, p.owner_user_id),
				period_amount: sum(recent.map((c) => c.amount)),
				period_contributors: new Set(recent.map((c) => c.sender_address)).size,
				recent_wallets: [...new Set(recent.map((c) => c.sender_address))].slice(0, 4),
			};
		})
		.filter((t) => t.period_contributors > 0)
		.sort((a, b) => b.period_contributors - a.period_contributors || compare(b.period_amount, a.period_amount))
		.slice(0, 6);

	const data: AdminOverview = {
		stats: {
			contributors: new Set(confirmed.map((c) => c.sender_address)).size,
			builders: db.users.filter((u) => u.role === "builder").length,
			projects: db.projects.filter((p) => p.status !== "draft").length,
			total_raised: sum(confirmed.map((c) => c.amount)),
			asset_code: "XLM",
		},
		range: (rangeKey in RANGES ? rangeKey : "week") as AdminOverview["range"],
		series,
		period_total: sum(inPeriod.map((c) => c.amount)),
		progress: { raised: liveRaised, target: liveTarget, percent: progressPercent(liveRaised, liveTarget) },
		recent: db.projects
			.filter((p) => p.status !== "draft")
			.sort((a, b) => (b.submitted_at ?? b.created_at).localeCompare(a.submitted_at ?? a.created_at))
			.slice(0, 6)
			.map((p) => ({
				id: p.id,
				title: p.title,
				builder: nameOf(db, p.owner_user_id),
				status: p.status,
				submitted_at: p.submitted_at,
			})),
		trending,
		pending_reviews: db.projects.filter((p) => p.status === "submitted" || p.status === "under_review").length,
	};
	return ok(data);
});

// ------------------------------------------------------------------ projects (admin pages 2–3)

function listItem(db: MockDb, p: Project): AdminProjectListItem {
	return {
		id: p.id,
		title: p.title,
		slug: p.slug,
		logo_url: p.logo_url,
		status: p.status,
		visibility: p.visibility,
		featured: p.featured,
		destination_address: p.destination_address,
		submitted_at: p.submitted_at,
		created_at: p.created_at,
		builder: { name: nameOf(db, p.owner_user_id), email: emailOf(db, p.owner_user_id) },
		target_asset: p.target_asset_id ? { id: p.target_asset_id, code: ASSET_CODE[p.target_asset_id] ?? p.target_asset_id } : null,
		target_amount: p.target_amount,
		raised_amount: sum(confirmedFor(db, p.id).map((c) => c.amount)),
	};
}

route("GET", "/admin/projects", "admin", ({ query }) => {
	const db = read();
	const tab = (TABS as string[]).includes(query.get("tab") ?? "") ? (query.get("tab") as AdminProjectTab) : "all";
	const q = (query.get("q") ?? "").trim().toLowerCase();
	// Date range on "time added" (submitted), inclusive of both days.
	const from = query.get("from") ? new Date(`${query.get("from")}T00:00:00`).getTime() : null;
	const to = query.get("to") ? new Date(`${query.get("to")}T00:00:00`).getTime() + DAY : null;

	const matches = db.projects
		.filter((p) => p.status !== "draft")
		.filter((p) => {
			if (!q) return true;
			const builder = nameOf(db, p.owner_user_id).toLowerCase();
			return p.title.toLowerCase().includes(q) || builder.includes(q) || (p.destination_address ?? "").toLowerCase().includes(q);
		})
		.filter((p) => {
			const t = new Date(p.submitted_at ?? p.created_at).getTime();
			return (from === null || t >= from) && (to === null || t < to);
		})
		.sort((a, b) => (b.submitted_at ?? b.created_at).localeCompare(a.submitted_at ?? a.created_at));

	const page = paginate(
		matches.filter((p) => inAdminTab(p.status, tab)),
		Number(query.get("page") ?? 1),
		Number(query.get("limit") ?? 7),
	);
	return ok({
		items: page.items.map((p) => listItem(db, p)),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		counts: Object.fromEntries(TABS.map((t) => [t, matches.filter((p) => inAdminTab(p.status, t)).length])),
	});
});

// ------------------------------------------------------------------ project detail (admin page 4)

function findProject(db: MockDb, id: string) {
	const p = db.projects.find((x) => x.id === id && x.status !== "draft");
	if (!p) throw new HttpError(404, "Project not found.");
	return p;
}

route("GET", "/admin/projects/:id", "admin", ({ params }) => {
	const db = read();
	const p = findProject(db, params.id!);
	const confirmed = confirmedFor(db, p.id);
	const owner = db.profiles.find((x) => x.user_id === p.owner_user_id);
	return ok({
		...listItem(db, p),
		summary: p.summary,
		links: p.links,
		contact_email: p.contact_email,
		category: db.categories.find((c) => c.id === p.category_id)?.name ?? null,
		stage: p.stage,
		approved_at: p.approved_at,
		ends_at: p.ends_at,
		contributor_count: new Set(confirmed.map((c) => c.sender_address)).size,
		contribution_count: confirmed.length,
		builder_profile: {
			name: owner?.display_name ?? "Unknown builder",
			email: emailOf(db, p.owner_user_id),
			wallet_address: owner?.wallet_address ?? null,
			twitter_url: owner?.twitter_url ?? null,
		},
		// Everything, including internal notes: this is the admin view.
		reviews: db.reviews
			.filter((r) => r.project_id === p.id)
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((r) => ({ ...r, admin_name: nameOf(db, r.admin_user_id) })),
		allowed_decisions: adminDecisions(p.status),
	});
});

route("GET", "/admin/projects/:id/contributions", "admin", ({ params, query }) => {
	const db = read();
	const p = findProject(db, params.id!);
	const all = db.contributions
		.filter((c) => c.project_id === p.id && countsTowardTotal(c.status))
		.sort((a, b) => (b.confirmed_at ?? b.created_at).localeCompare(a.confirmed_at ?? a.created_at));
	const raised = sum(all.map((c) => c.amount));
	const page = paginate(all, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 7));
	// "Percentage received": this contribution's share of the target (or of the total raised, without a target).
	const base = p.target_amount ?? raised;
	return ok({
		items: page.items.map((c) => ({
			id: c.id,
			sender_address: c.sender_address,
			amount: c.amount,
			asset_code: ASSET_CODE[c.asset_id] ?? c.asset_id,
			tx_hash: c.tx_hash,
			confirmed_at: c.confirmed_at ?? c.created_at,
			share_percent: toStroops(base) > 0n ? Number((toStroops(c.amount) * 10_000n) / toStroops(base)) / 100 : null,
			share_of: p.target_amount ? "target" : "raised",
		})),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		raised_amount: raised,
	});
});

// ------------------------------------------------------------------ decisions

const DECISION_TO: Record<ReviewDecision, ProjectStatus> = {
	under_review: "under_review",
	approve: "approved",
	request_changes: "changes_requested",
	reject: "rejected",
};

/** What the builder sees in their notifications. Rejections and change requests carry the admin's reason. */
const BUILDER_NOTE: Partial<
	Record<ReviewDecision, (title: string, reason: string | null) => Pick<Notification, "type" | "title" | "body" | "action">>
> = {
	approve: (t) => ({
		type: "project_approved",
		title: `${t} was approved and is now public`,
		body: null,
		action: { label: "View project", href: "" },
	}),
	request_changes: (t, r) => ({
		type: "changes_requested",
		title: `Changes requested on ${t}`,
		body: r,
		action: { label: "See what to change", href: "" },
	}),
	reject: (t, r) => ({ type: "project_rejected", title: `${t} was rejected`, body: r, action: { label: "See why", href: "" } }),
};

route("POST", "/admin/projects/:id/decision", "admin", ({ params, body, user }) => {
	const decision = String(body.decision ?? "") as ReviewDecision;
	if (!(decision in DECISION_TO)) throw new HttpError(422, "Choose a decision.");
	const reason = String(body.reason ?? "").trim() || null;
	const internal = String(body.internal_note ?? "").trim() || null;

	const result = update((db) => {
		const p = findProject(db, params.id!);
		const before = { status: p.status, visibility: p.visibility };
		// Throws InvalidTransitionError / ReasonRequiredError; the adapter turns them into 409 / 422.
		p.status = transition(p.status, DECISION_TO[decision], "admin", reason);
		const now = iso(Date.now());
		if (decision === "approve") {
			p.visibility = "published"; // D11
			p.approved_at = now;
		}
		p.updated_at = now;
		db.reviews.push({
			id: uuid(),
			project_id: p.id,
			admin_user_id: user!.id,
			decision,
			reason,
			internal_note: internal,
			created_at: now,
		});
		db.audit.push({
			id: uuid(),
			actor_user_id: user!.id,
			action: `project.${decision}`,
			entity_type: "project",
			entity_id: p.id,
			before_snapshot: before,
			after_snapshot: { status: p.status, visibility: p.visibility, reason },
			created_at: now,
		});
		const note = BUILDER_NOTE[decision]?.(p.title, reason);
		if (note)
			db.notifications.push({
				id: uuid(),
				user_id: p.owner_user_id,
				wallet_address: null,
				broadcast: false,
				...note,
				category: "projects",
				// Straight to the project's status page, where the reason and next steps are shown in full.
				action: { label: note.action!.label, href: `/builder/projects/${p.id}` },
				payload: { project_id: p.id, reason },
				read_by: [],
				created_at: now,
			});
		if (decision === "approve")
			db.notifications.push({
				id: uuid(),
				user_id: null,
				wallet_address: null,
				broadcast: true,
				type: "project_published",
				category: "projects",
				title: `${p.title} is now open for contributions`,
				action: { label: "Contribute", href: `/projects/${p.slug}` },
				payload: {},
				read_by: [],
				created_at: now,
			});
		return listItem(db, p);
	});
	return ok(result, "Decision saved");
});

route("POST", "/admin/projects/:id/visibility", "admin", ({ params, body, user }) => {
	const visibility = body.visibility === "published" ? "published" : "unpublished";
	return ok(
		update((db) => {
			const p = findProject(db, params.id!);
			if (p.status !== "approved") throw new HttpError(409, "Only approved projects can be published.");
			const before = p.visibility;
			p.visibility = visibility;
			p.updated_at = iso(Date.now());
			db.audit.push({
				id: uuid(),
				actor_user_id: user!.id,
				action: `project.${visibility === "published" ? "publish" : "unpublish"}`,
				entity_type: "project",
				entity_id: p.id,
				before_snapshot: { visibility: before },
				after_snapshot: { visibility },
				created_at: p.updated_at,
			});
			return listItem(db, p);
		}),
		visibility === "published" ? "Project published" : "Project hidden from the public",
	);
});

route("POST", "/admin/projects/:id/feature", "admin", ({ params, body, user }) => {
	const featured = !!body.featured;
	return ok(
		update((db) => {
			const p = findProject(db, params.id!);
			if (!isPubliclyVisible(p)) throw new HttpError(409, "Only public projects can be featured.");
			p.featured = featured;
			p.updated_at = iso(Date.now());
			db.audit.push({
				id: uuid(),
				actor_user_id: user!.id,
				action: featured ? "project.feature" : "project.unfeature",
				entity_type: "project",
				entity_id: p.id,
				before_snapshot: { featured: !featured },
				after_snapshot: { featured },
				created_at: p.updated_at,
			});
			return listItem(db, p);
		}),
		featured ? "Project featured" : "Project no longer featured",
	);
});

// ------------------------------------------------------------------ contributors (admin page 5)

const ACTIVE_DAYS = 30;

route("GET", "/admin/contributors", "admin", ({ query }) => {
	const db = read();
	const q = (query.get("q") ?? "").trim().toUpperCase();
	const confirmed = db.contributions.filter((c) => countsTowardTotal(c.status) && c.asset_id === "xlm");
	const platformTotal = toStroops(sum(confirmed.map((c) => c.amount)));
	const byWallet = new Map<string, typeof confirmed>();
	for (const c of confirmed) byWallet.set(c.sender_address, [...(byWallet.get(c.sender_address) ?? []), c]);

	const since = Date.now() - ACTIVE_DAYS * DAY;
	const rows = [...byWallet.entries()].map(([wallet, list]) => {
		const total = sum(list.map((c) => c.amount));
		const last = list
			.map((c) => c.confirmed_at ?? c.created_at)
			.sort()
			.at(-1)!;
		return {
			wallet_address: wallet,
			total_amount: total,
			asset_code: "XLM",
			share_percent: platformTotal > 0n ? Number((toStroops(total) * 10_000n) / platformTotal) / 100 : 0,
			contribution_count: list.length,
			project_count: new Set(list.map((c) => c.project_id)).size,
			last_contributed_at: last,
		};
	});
	const active = rows.filter((r) => new Date(r.last_contributed_at).getTime() >= since).length;
	const sorted = rows.filter((r) => !q || r.wallet_address.includes(q)).sort((a, b) => compare(b.total_amount, a.total_amount));
	const page = paginate(sorted, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 6));
	return ok({
		items: page.items,
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		stats: { contributors: rows.length, active, inactive: rows.length - active, active_days: ACTIVE_DAYS },
	});
});

// ------------------------------------------------------------------ account settings (admin page 6)

function accountOf(db: MockDb, user: MockUser) {
	const a = db.adminAccounts[user.id];
	if (!a) throw new HttpError(404, "Account not found.");
	return { ...a, email: user.email, mfa_enabled: true };
}

route("GET", "/admin/account", "admin", ({ user }) => ok(accountOf(read(), user!)));

const TEXT = (v: unknown, max: number) => {
	const s = String(v ?? "").trim();
	if (s.length > max) throw new HttpError(422, `Keep it under ${max} characters.`);
	return s || null;
};

/** Partial update: only the sections a card edits (personal info, address, photo). */
route("PATCH", "/admin/account", "admin", ({ user, body }) => {
	update((db) => {
		const a = db.adminAccounts[user!.id];
		if (!a) throw new HttpError(404, "Account not found.");
		if ("first_name" in body) {
			const first = String(body.first_name ?? "").trim();
			if (first.length < 1 || first.length > 40) throw new HttpError(422, "Enter your first name.", { field: "first_name" });
			a.first_name = first;
		}
		if ("last_name" in body) {
			const last = String(body.last_name ?? "").trim();
			if (last.length < 1 || last.length > 40) throw new HttpError(422, "Enter your last name.", { field: "last_name" });
			a.last_name = last;
		}
		if ("phone" in body) {
			const phone = TEXT(body.phone, 20);
			if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone))
				throw new HttpError(422, "Enter a valid phone number.", { field: "phone" });
			a.phone = phone;
		}
		if ("bio" in body) a.bio = TEXT(body.bio, 80);
		if ("country" in body) a.country = TEXT(body.country, 60);
		if ("city" in body) a.city = TEXT(body.city, 60);
		if ("postal_code" in body) a.postal_code = TEXT(body.postal_code, 12);
		if ("avatar_url" in body) a.avatar_url = TEXT(body.avatar_url, 1_500_000);
		// Keep the display name (used across the console and in audit entries) in step.
		const p = db.profiles.find((x) => x.user_id === user!.id);
		if (p) p.display_name = `${a.first_name} ${a.last_name}`.trim();
	});
	return ok(accountOf(read(), user!), "Saved");
});

route("POST", "/admin/account/password", "admin", ({ user, body }) => {
	const current = String(body.current_password ?? "");
	const next = String(body.new_password ?? "");
	if (user!.password !== current) throw new HttpError(400, "Your current password isn’t right.", { field: "current_password" });
	if (!/^(?=.*[A-Za-z])(?=.*\d).{10,}$/.test(next))
		throw new HttpError(422, "Use at least 10 characters with a letter and a number.", { field: "new_password" });
	if (next === current) throw new HttpError(422, "Choose a password you haven’t used here.", { field: "new_password" });
	update((db) => {
		db.users.find((u) => u.id === user!.id)!.password = next;
		db.adminAccounts[user!.id]!.password_changed_at = iso(Date.now());
		db.audit.push({
			id: uuid(),
			actor_user_id: user!.id,
			action: "admin.password_change",
			entity_type: "user",
			entity_id: user!.id,
			before_snapshot: null,
			after_snapshot: null,
			created_at: iso(Date.now()),
		});
	});
	return ok({}, "Password updated");
});

route("PATCH", "/admin/account/notifications", "admin", ({ user, body }) => {
	update((db) => {
		const a = db.adminAccounts[user!.id]!;
		for (const key of Object.keys(a.notifications) as (keyof typeof a.notifications)[])
			if (typeof body[key] === "boolean") a.notifications[key] = body[key] as boolean;
	});
	return ok(accountOf(read(), user!).notifications, "Preferences saved");
});

/** Needs the password. The last active admin can't remove their own account (the console would be locked). */
route("DELETE", "/admin/account", "admin", ({ user, body }) => {
	if (user!.password !== String(body.password ?? ""))
		throw new HttpError(400, "Your password isn’t right.", { field: "password" });
	update((db) => {
		const admins = db.users.filter((u) => u.role === "admin" && u.is_active);
		if (admins.length <= 1) throw new HttpError(409, "You’re the only admin. Add another admin before deleting this account.");
		const u = db.users.find((x) => x.id === user!.id)!;
		u.is_active = false;
		u.status = "suspended";
		db.audit.push({
			id: uuid(),
			actor_user_id: user!.id,
			action: "admin.delete_account",
			entity_type: "user",
			entity_id: user!.id,
			before_snapshot: null,
			after_snapshot: { is_active: false },
			created_at: iso(Date.now()),
		});
	});
	return ok({}, "Account deleted");
});

// ------------------------------------------------------------------ builders (admin developer D1–D2)

function builderRow(db: MockDb, u: MockUser): AdminBuilder {
	const profile = db.profiles.find((p) => p.user_id === u.id);
	const projects = db.projects
		.filter((p) => p.owner_user_id === u.id && p.status !== "draft")
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const latest = projects[0];
	return {
		id: u.id,
		name: profile?.display_name ?? u.email,
		email: u.email,
		avatar_url: profile?.avatar_url ?? null,
		wallet_address: profile?.wallet_address ?? null,
		status: u.is_active ? "active" : "suspended",
		joined_at: u.created_at,
		project_count: projects.length,
		latest_project: latest ? { id: latest.id, title: latest.title, logo_url: latest.logo_url } : null,
		raised_amount: sum(projects.flatMap((p) => confirmedFor(db, p.id).map((c) => c.amount))),
	};
}

route("GET", "/admin/builders", "admin", ({ query }) => {
	const db = read();
	const q = (query.get("q") ?? "").trim().toLowerCase();
	const all = db.users.filter((u) => u.role === "builder").map((u) => builderRow(db, u));
	const matches = all
		.filter(
			(b) => !q || b.name.toLowerCase().includes(q) || b.email.includes(q) || (b.wallet_address ?? "").toLowerCase().includes(q),
		)
		.sort((a, b) => b.joined_at.localeCompare(a.joined_at));
	const page = paginate(matches, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 7));
	const active = all.filter((b) => b.status === "active").length;
	return ok({
		items: page.items,
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		stats: { builders: all.length, active, disabled: all.length - active },
	});
});

function findBuilder(db: MockDb, id: string) {
	const u = db.users.find((x) => x.id === id && x.role === "builder");
	if (!u) throw new HttpError(404, "Builder not found.");
	return u;
}

route("GET", "/admin/builders/:id", "admin", ({ params }) => {
	const db = read();
	const u = findBuilder(db, params.id!);
	const profile = db.profiles.find((p) => p.user_id === u.id);
	return ok({ ...builderRow(db, u), bio: profile?.bio ?? null, organization_name: profile?.organization_name ?? null });
});

route("GET", "/admin/builders/:id/projects", "admin", ({ params, query }) => {
	const db = read();
	const u = findBuilder(db, params.id!);
	const group = (["all", "pending", "completed"] as const).find((g) => g === query.get("group")) ?? "all";
	// Drafts stay private to the builder, even here.
	const mine = db.projects
		.filter((p) => p.owner_user_id === u.id && p.status !== "draft")
		.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
	const page = paginate(
		mine.filter((p) => inBuilderGroup(p.status, group)),
		Number(query.get("page") ?? 1),
		Number(query.get("limit") ?? 6),
	);
	return ok({
		items: page.items.map((p): AdminBuilderProject => {
			const confirmed = confirmedFor(db, p.id);
			return {
				id: p.id,
				title: p.title,
				slug: p.slug,
				logo_url: p.logo_url,
				status: p.status,
				visibility: p.visibility,
				featured: p.featured,
				destination_address: p.destination_address,
				target_amount: p.target_amount,
				ends_at: p.ends_at,
				raised_amount: sum(confirmed.map((c) => c.amount)),
				contributor_count: new Set(confirmed.map((c) => c.sender_address)).size,
				target_asset: p.target_asset_id
					? { id: p.target_asset_id, code: ASSET_CODE[p.target_asset_id] ?? p.target_asset_id }
					: null,
			};
		}),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		counts: Object.fromEntries(
			(["all", "pending", "completed"] as const).map((g) => [g, mine.filter((p) => inBuilderGroup(p.status, g)).length]),
		),
	});
});

/** Suspend / reactivate a builder (D24). A suspended builder can't sign in; their public projects stay up. */
route("POST", "/admin/builders/:id/status", "admin", ({ params, body, user }) => {
	const active = body.status === "active";
	const reason = String(body.reason ?? "").trim() || null;
	if (!active && (!reason || reason.length < 10))
		throw new HttpError(422, "Add a reason (at least 10 characters) for the audit log.", { field: "reason" });
	const row = update((db) => {
		const u = findBuilder(db, params.id!);
		const before = u.is_active;
		u.is_active = active;
		u.status = active ? "active" : "suspended";
		u.updated_at = iso(Date.now());
		db.audit.push({
			id: uuid(),
			actor_user_id: user!.id,
			action: active ? "builder.reactivate" : "builder.suspend",
			entity_type: "user",
			entity_id: u.id,
			before_snapshot: { is_active: before },
			after_snapshot: { is_active: active, reason },
			created_at: u.updated_at,
		});
		return builderRow(db, u);
	});
	return ok(row, active ? "Builder reactivated" : "Builder suspended");
});

// ------------------------------------------------------------------ admin notifications (Account settings → Notification)

/**
 * The admin's feed, derived from what happened (no separate store): submissions and resubmissions waiting for
 * review, funding milestones, new builders, and the admin team's own decisions. Newest first.
 */
route("GET", "/admin/notifications", "admin", ({ query }) => {
	const db = read();
	type Item = { id: string; kind: string; title: string; body: string; href: string | null; created_at: string };
	const items: Item[] = [];
	for (const p of db.projects) {
		const builder = nameOf(db, p.owner_user_id);
		if ((p.status === "submitted" || p.status === "under_review") && p.submitted_at) {
			const resubmitted = db.reviews.some((r) => r.project_id === p.id && r.decision === "request_changes");
			items.push({
				id: `sub-${p.id}`,
				kind: resubmitted ? "resubmission" : "submission",
				title: resubmitted ? `${p.title} was resubmitted` : `New project to review: ${p.title}`,
				body: `${builder} ${resubmitted ? "sent this project back after your requested changes" : "submitted this project"}. ${
					p.status === "under_review" ? "It’s marked as under review." : "It hasn’t been picked up yet."
				} Approve it, request changes or reject it from the project page.`,
				href: `/projects/${p.id}`,
				created_at: p.submitted_at,
			});
		}
		if (p.status === "approved" && p.target_amount) {
			const confirmed = confirmedFor(db, p.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
			let running = 0n;
			const target = toStroops(p.target_amount);
			const reached: number[] = [];
			for (const c of confirmed) {
				running += toStroops(c.amount);
				for (const m of [50, 100])
					if (!reached.includes(m) && running * 100n >= target * BigInt(m)) {
						reached.push(m);
						items.push({
							id: `ms-${p.id}-${m}`,
							kind: "milestone",
							title: `${p.title} reached ${m}% of its target`,
							body: `Confirmed contributions passed ${m}% of the ${money(p.target_amount)} target. Contributions stay open after the target is reached.`,
							href: `/projects/${p.id}`,
							created_at: c.confirmed_at ?? c.created_at,
						});
					}
			}
		}
	}
	for (const u of db.users.filter((x) => x.role === "builder"))
		items.push({
			id: `b-${u.id}`,
			kind: "builder",
			title: `New builder: ${nameOf(db, u.id)}`,
			body: `${u.email} created a builder account. They can submit projects for review once their email is verified.`,
			href: `/builders/${u.id}`,
			created_at: u.created_at,
		});
	for (const r of db.reviews) {
		const p = db.projects.find((x) => x.id === r.project_id);
		if (!p) continue;
		const verb = {
			under_review: "started reviewing",
			approve: "approved",
			request_changes: "requested changes on",
			reject: "rejected",
		}[r.decision];
		items.push({
			id: `rv-${r.id}`,
			kind: "decision",
			title: `${nameOf(db, r.admin_user_id)} ${verb} ${p.title}`,
			body: r.reason ? `Reason shared with the builder: “${r.reason}”` : "Recorded in the audit log.",
			href: `/projects/${p.id}`,
			created_at: r.created_at,
		});
	}
	items.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const page = paginate(items, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 6));
	return ok({
		items: page.items,
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
	});
});

const money = (amount: string) => `${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })} XLM`;

// ------------------------------------------------------------------ suggestion moderation (PRD §6.6, FR-MOD-*)

type ModTab = "pending" | "reported" | "published" | "all";

function suggestionRow(db: MockDb, s: MockDb["suggestions"][number]) {
	const p = db.projects.find((x) => x.id === s.project_id);
	return {
		...s,
		project: { id: s.project_id, title: p?.title ?? "Removed project", slug: p?.slug ?? "" },
		reports: db.reports
			.filter((r) => r.entity_type === "suggestion" && r.entity_id === s.id)
			.sort((a, b) => b.created_at.localeCompare(a.created_at)),
	};
}

route("GET", "/admin/suggestions", "admin", ({ query }) => {
	const db = read();
	const tab = (["pending", "reported", "published", "all"] as ModTab[]).find((t) => t === query.get("status")) ?? "pending";
	const inTab = (s: MockDb["suggestions"][number], t: ModTab) =>
		t === "all" ||
		(t === "pending"
			? s.status === "pending_moderation"
			: t === "reported"
				? s.report_count > 0 && s.status !== "rejected"
				: s.status === "published");
	const list = db.suggestions
		.filter((s) => inTab(s, tab))
		.sort((a, b) => b.report_count - a.report_count || b.created_at.localeCompare(a.created_at));
	const page = paginate(list, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 8));
	return ok({
		items: page.items.map((s) => suggestionRow(db, s)),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		counts: Object.fromEntries(
			(["pending", "reported", "published", "all"] as ModTab[]).map((t) => [t, db.suggestions.filter((s) => inTab(s, t)).length]),
		),
	});
});

route("GET", "/admin/suggestions/:id", "admin", ({ params }) => {
	const db = read();
	const s = db.suggestions.find((x) => x.id === params.id);
	if (!s) throw new HttpError(404, "Suggestion not found.");
	const fromWallet = db.suggestions.filter((x) => x.wallet_address === s.wallet_address).length;
	return ok({ ...suggestionRow(db, s), wallet_suggestion_count: fromWallet });
});

route("POST", "/admin/suggestions/:id/moderate", "admin", ({ params, body, user }) => {
	const action = String(body.action ?? "");
	const reason = String(body.reason ?? "").trim() || null;
	const to = { publish: "published", hide: "hidden", reject: "rejected" }[action] as
		"published" | "hidden" | "rejected" | undefined;
	if (!to) throw new HttpError(422, "Choose publish, hide or reject.");
	if (to !== "published" && (!reason || reason.length < 5))
		throw new HttpError(422, "Add a short reason (it’s kept in the audit log).", { field: "reason" });
	const row = update((db) => {
		const s = db.suggestions.find((x) => x.id === params.id);
		if (!s) throw new HttpError(404, "Suggestion not found.");
		if (s.status === to) throw new HttpError(409, `This suggestion is already ${to}.`);
		const before = s.status;
		s.status = to;
		s.moderated_by = user!.id;
		s.moderated_at = iso(Date.now());
		s.moderation_reason = reason;
		for (const r of db.reports)
			if (r.entity_id === s.id && r.status === "open") r.status = to === "published" ? "dismissed" : "resolved";
		db.audit.push({
			id: uuid(),
			actor_user_id: user!.id,
			action: `suggestion.${action}`,
			entity_type: "suggestion",
			entity_id: s.id,
			before_snapshot: { status: before },
			after_snapshot: { status: to, reason },
			created_at: s.moderated_at,
		});
		if (to === "published") {
			const p = db.projects.find((x) => x.id === s.project_id);
			db.notifications.push({
				id: uuid(),
				user_id: null,
				wallet_address: s.wallet_address,
				broadcast: false,
				type: "suggestion_published",
				category: "suggestions",
				title: `Your suggestion on ${p?.title ?? "a project"} is now public`,
				action: p ? { label: "View", href: `/projects/${p.slug}` } : null,
				payload: {},
				read_by: [],
				created_at: s.moderated_at,
			});
			if (p)
				db.notifications.push({
					id: uuid(),
					user_id: p.owner_user_id,
					wallet_address: null,
					broadcast: false,
					type: "suggestion_published",
					category: "suggestions",
					title: `New suggestion on ${p.title}: “${s.title}”`,
					action: { label: "Read it", href: `/builder/projects/${p.id}` },
					payload: {},
					read_by: [],
					created_at: s.moderated_at,
				});
		}
		return suggestionRow(db, s);
	});
	return ok(row, "Saved");
});

// ------------------------------------------------------------------ contributions monitor (Phase 5, FR-CON-*)

route("GET", "/admin/contributions", "admin", ({ query }) => {
	const db = read();
	const status = query.get("status") ?? "all";
	const q = (query.get("q") ?? "").trim().toLowerCase();
	const list = db.contributions
		.filter((c) => status === "all" || (status === "flagged" ? !!c.reconcile_flag : c.status === status))
		.filter((c) => {
			if (!q) return true;
			const p = db.projects.find((x) => x.id === c.project_id);
			const ref = db.intents.find((i) => i.id === c.intent_id)?.reference ?? "";
			return `${c.tx_hash} ${c.sender_address} ${p?.title ?? ""} ${ref}`.toLowerCase().includes(q);
		})
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const page = paginate(list, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 8));
	const all = db.contributions;
	return ok({
		items: page.items.map((c) => {
			const p = db.projects.find((x) => x.id === c.project_id);
			return {
				id: c.id,
				project: { id: c.project_id, title: p?.title ?? "Removed project" },
				sender_address: c.sender_address,
				destination: c.destination_or_contract,
				amount: c.amount,
				asset_code: ASSET_CODE[c.asset_id] ?? c.asset_id,
				status: c.status,
				tx_hash: c.tx_hash,
				reference: db.intents.find((i) => i.id === c.intent_id)?.reference ?? null,
				ledger: c.ledger_or_event_ref,
				failure_reason: c.failure_reason,
				reconcile_flag: c.reconcile_flag ?? null,
				simulated: !!c.simulated,
				created_at: c.created_at,
				confirmed_at: c.confirmed_at,
			};
		}),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		counts: {
			all: all.length,
			confirmed: all.filter((c) => c.status === "confirmed").length,
			pending: all.filter((c) => c.status === "pending").length,
			failed: all.filter((c) => c.status === "failed").length,
			flagged: all.filter((c) => !!c.reconcile_flag).length,
		},
	});
});

/** Re-runs verification: pending real payments are re-checked by the status endpoint; flags are cleared on confirm. */
route("POST", "/admin/contributions/:id/reconcile", "admin", ({ params, user }) => {
	const row = update((db) => {
		const c = db.contributions.find((x) => x.id === params.id);
		if (!c) throw new HttpError(404, "Contribution not found.");
		db.audit.push({
			id: uuid(),
			actor_user_id: user!.id,
			action: "contribution.reconcile",
			entity_type: "contribution",
			entity_id: c.id,
			before_snapshot: { status: c.status, flag: c.reconcile_flag ?? null },
			after_snapshot: { requested: true },
			created_at: iso(Date.now()),
		});
		if (c.status === "failed" && !c.simulated) {
			// Give a real payment another verification pass.
			c.status = "pending";
			c.failure_reason = null;
		}
		return { id: c.id, status: c.status };
	});
	return ok(row, "Verification re-queued");
});

// ------------------------------------------------------------------ categories (P1)

route("GET", "/admin/categories", "admin", () => {
	const db = read();
	return ok(
		db.categories.map((c) => ({
			...c,
			project_count: db.projects.filter((p) => p.category_id === c.id && p.status !== "draft").length,
		})),
	);
});

const slugOf = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_-]+/g, "-");

route("POST", "/admin/categories", "admin", ({ body, user }) => {
	const name = String(body.name ?? "").trim();
	if (name.length < 2 || name.length > 40) throw new HttpError(422, "Use 2–40 characters.", { field: "name" });
	return ok(
		update((db) => {
			const slug = slugOf(name);
			if (db.categories.some((c) => c.slug === slug))
				throw new HttpError(409, "A category with this name already exists.", { field: "name" });
			const c = { id: `cat-${slug}`, name, slug, is_active: true };
			db.categories.push(c);
			db.audit.push({
				id: uuid(),
				actor_user_id: user!.id,
				action: "category.create",
				entity_type: "category",
				entity_id: c.id,
				before_snapshot: null,
				after_snapshot: c,
				created_at: iso(Date.now()),
			});
			return c;
		}),
		"Category added",
		201,
	);
});

route("PATCH", "/admin/categories/:id", "admin", ({ params, body, user }) =>
	ok(
		update((db) => {
			const c = db.categories.find((x) => x.id === params.id);
			if (!c) throw new HttpError(404, "Category not found.");
			const before = { ...c };
			if ("name" in body) {
				const name = String(body.name ?? "").trim();
				if (name.length < 2 || name.length > 40) throw new HttpError(422, "Use 2–40 characters.", { field: "name" });
				if (db.categories.some((x) => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase()))
					throw new HttpError(409, "Another category has this name.", { field: "name" });
				c.name = name; // slug stays: links keep working
			}
			if ("is_active" in body) c.is_active = !!body.is_active;
			db.audit.push({
				id: uuid(),
				actor_user_id: user!.id,
				action: "category.update",
				entity_type: "category",
				entity_id: c.id,
				before_snapshot: before,
				after_snapshot: { ...c },
				created_at: iso(Date.now()),
			});
			return c;
		}),
		"Saved",
	),
);

// ------------------------------------------------------------------ audit log (read-only, PRD §18)

route("GET", "/admin/audit-log", "admin", ({ query }) => {
	const db = read();
	const type = query.get("entity_type");
	const list = db.audit
		.filter((a) => !type || type === "all" || a.entity_type === type)
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const page = paginate(list, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 12));
	const label = (a: (typeof list)[number]) => {
		if (a.entity_type === "project") return db.projects.find((p) => p.id === a.entity_id)?.title ?? a.entity_id;
		if (a.entity_type === "suggestion") return db.suggestions.find((s) => s.id === a.entity_id)?.title ?? a.entity_id;
		if (a.entity_type === "category") return db.categories.find((c) => c.id === a.entity_id)?.name ?? a.entity_id;
		if (a.entity_type === "user") return nameOf(db, a.entity_id);
		return a.entity_id;
	};
	return ok({
		items: page.items.map((a) => ({ ...a, actor_name: nameOf(db, a.actor_user_id), entity_label: label(a) })),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
	});
});

// ------------------------------------------------------------------ one contributor wallet (admin page 5 → detail)

route("GET", "/admin/contributors/:address", "admin", ({ params, query }) => {
	const db = read();
	const wallet = params.address!;
	const mine = db.contributions
		.filter((c) => c.sender_address === wallet)
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	if (!mine.length) throw new HttpError(404, "No contributions from this wallet.");
	const confirmed = mine.filter((c) => countsTowardTotal(c.status));
	const page = paginate(mine, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 8));
	const totals: Record<string, string> = {};
	for (const id of Object.keys(ASSET_CODE)) {
		const list = confirmed.filter((c) => c.asset_id === id);
		if (list.length) totals[ASSET_CODE[id]!] = sum(list.map((c) => c.amount));
	}
	return ok({
		wallet_address: wallet,
		totals,
		confirmed_count: confirmed.length,
		pending_count: mine.filter((c) => c.status === "pending").length,
		failed_count: mine.filter((c) => c.status === "failed").length,
		project_count: new Set(confirmed.map((c) => c.project_id)).size,
		first_at: mine.at(-1)!.created_at,
		last_at: mine[0]!.created_at,
		suggestion_count: db.suggestions.filter((s) => s.wallet_address === wallet).length,
		simulated: mine.every((c) => !!c.simulated),
		items: page.items.map((c) => {
			const p = db.projects.find((x) => x.id === c.project_id);
			return {
				id: c.id,
				project: { id: c.project_id, title: p?.title ?? "Removed project", logo_url: p?.logo_url ?? null },
				amount: c.amount,
				asset_code: ASSET_CODE[c.asset_id] ?? c.asset_id,
				status: c.status,
				tx_hash: c.tx_hash,
				reference: db.intents.find((i) => i.id === c.intent_id)?.reference ?? null,
				destination: c.destination_or_contract,
				failure_reason: c.failure_reason,
				created_at: c.created_at,
				confirmed_at: c.confirmed_at,
			};
		}),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
	});
});
