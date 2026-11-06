import type { AdminOverview, AnalyticsEvent, AnalyticsSummary, ProjectAction, ProjectStatus, UserDetail } from "@repo/domain/types";
import { PROJECT_ACTION_RULES, actionRequiresReason } from "@repo/domain/project-status";
import { read, update } from "../db";
import type { MockDb, ProjectRec, UserRec } from "../records";
import { HttpError, invalid, ok, route } from "../router";
import { uuid } from "../util";
import { adminProjectDto, adminSummaryDto, audit, boolParam, event, insightsFor, notifyUser, now, page } from "./admin-shared";

/** Admin routes (backend guide, "Admin area" and "Admin: review queue and actions"). Builders get 403. */

// ---------------------------------------------------------------- projects

const slugify = (t: string) =>
	t
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60) || "project";

function uniqueSlug(db: MockDb, title: string) {
	const base = slugify(title);
	let slug = base;
	for (let n = 2; db.projects.some((p) => p.slug === slug); n++) slug = `${base}-${n}`;
	return slug;
}

function findProject(db: MockDb, id: string) {
	const p = db.projects.find((x) => x.id === id && x.status !== "draft");
	if (!p) throw new HttpError(404, "Project not found");
	return p;
}

route("GET", "/admin/projects", "admin", ({ query }) => {
	const db = read();
	const status = query.get("status");
	const q = (query.get("q") ?? "").trim().toLowerCase();
	const sort = query.get("sort") ?? "recently_updated";
	let list = db.projects.filter((p) => p.status !== "draft");
	if (status) list = list.filter((p) => p.status === status);
	if (q)
		list = list.filter((p) => {
			const o = db.users.find((u) => u.id === p.ownerId);
			return `${p.title} ${o?.name ?? ""} ${o?.email ?? ""}`.toLowerCase().includes(q);
		});
	if (query.get("categoryId")) list = list.filter((p) => p.categoryId === query.get("categoryId"));
	if (boolParam(query, "published") !== undefined) list = list.filter((p) => p.published === boolParam(query, "published"));
	if (boolParam(query, "featured") !== undefined) list = list.filter((p) => p.featured === boolParam(query, "featured"));
	list.sort((a, b) =>
		sort === "oldest_submitted"
			? (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "")
			: b.updatedAt.localeCompare(a.updatedAt),
	);
	return ok(
		page(
			list.map((p) => adminSummaryDto(db, p)),
			query,
		),
		"Projects retrieved",
	);
});

route("GET", "/admin/projects/:id", "admin", ({ params }) => {
	const db = read();
	return ok(adminProjectDto(db, findProject(db, params.id!)), "Project retrieved");
});

route("PATCH", "/admin/projects/:id", "admin", ({ params, body, user }) =>
	update((db) => {
		const p = findProject(db, params.id!);
		const c = db.categories.find((x) => x.id === body.categoryId && x.isActive);
		if (!c) throw invalid(["categoryId must be an active category"]);
		const before = { categoryId: p.categoryId };
		p.categoryId = c.id;
		p.updatedAt = now();
		audit(db, user!.id, "project.set_category", { type: "project", id: p.id }, { before, after: { categoryId: c.id } });
		return ok(adminProjectDto(db, p), "Category changed");
	}),
);

const NOTICE: Partial<
	Record<
		ProjectAction,
		{
			type: "project_approved" | "project_rejected" | "project_changes_requested" | "project_archived";
			title: (t: string) => string;
		}
	>
> = {
	approve: { type: "project_approved", title: (t) => `${t} was approved and is now live` },
	reject: { type: "project_rejected", title: (t) => `${t} was rejected` },
	request_changes: { type: "project_changes_requested", title: (t) => `Changes requested on ${t}` },
	archive: { type: "project_archived", title: (t) => `${t} was archived` },
};

route("POST", "/admin/projects/:id/actions", "admin", ({ params, body, user }) => {
	const action = body.action as ProjectAction;
	if (!(action in PROJECT_ACTION_RULES))
		throw invalid([
			"action must be one of: start_review, approve, reject, request_changes, publish, unpublish, archive, feature, unfeature",
		]);
	const reason = typeof body.reason === "string" ? body.reason.trim() : "";
	const internalNote = typeof body.internalNote === "string" ? body.internalNote.trim() : "";
	if (actionRequiresReason(action) && !reason) throw invalid(["reason is required for this action"]);
	return update((db) => {
		const p = findProject(db, params.id!);
		const rule = PROJECT_ACTION_RULES[action];
		const allowed =
			rule.from.includes(p.status) &&
			(rule.published === undefined || rule.published === p.published) &&
			!(action === "feature" && p.featured) &&
			!(action === "unfeature" && !p.featured);
		if (!allowed)
			throw new HttpError(
				409,
				`Cannot ${action.replace("_", " ")} a project that is ${p.published && p.status === "approved" ? "published" : p.status.replace("_", " ")}`,
			);
		const before = { status: p.status, published: p.published, featured: p.featured };
		const from = p.status;
		const to: Record<ProjectAction, ProjectStatus> = {
			start_review: "under_review",
			approve: "approved",
			reject: "rejected",
			request_changes: "changes_requested",
			archive: "archived",
			publish: p.status,
			unpublish: p.status,
			feature: p.status,
			unfeature: p.status,
		};
		p.status = to[action];
		if (action === "approve") {
			p.published = true;
			p.publishedAt = p.publishedAt ?? now();
			p.slug = p.slug ?? uniqueSlug(db, p.title);
			event(db, "project_published", { projectId: p.id });
		}
		if (["approve", "reject", "request_changes"].includes(action)) {
			p.decidedAt = now();
			event(db, "project_review_decided", { projectId: p.id });
		}
		if (action === "publish") p.published = true;
		if (action === "unpublish") ((p.published = false), (p.featured = false));
		if (action === "feature") p.featured = true;
		if (action === "unfeature") p.featured = false;
		if (action === "archive") ((p.published = false), (p.featured = false));
		p.updatedAt = now();
		db.reviews.push({
			id: (db.reviews.reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1,
			projectId: p.id,
			action,
			fromStatus: from,
			toStatus: p.status,
			reason: reason || null,
			internalNote: internalNote || null,
			adminId: user!.id,
			revision: p.revision,
			at: now(),
		});
		const n = NOTICE[action];
		if (n)
			notifyUser(
				db,
				p.ownerId,
				n.type,
				n.title(p.title),
				reason || "Congratulations! Your project is live and can receive contributions.",
				p.id,
			);
		audit(
			db,
			user!.id,
			`project.${action}`,
			{ type: "project", id: p.id },
			{ metadata: reason ? { reason } : {}, before, after: { status: p.status, published: p.published, featured: p.featured } },
		);
		return ok(adminProjectDto(db, p), "Action applied");
	});
});

route("GET", "/admin/projects/:id/revisions", "admin", ({ params }) => {
	const db = read();
	findProject(db, params.id!);
	return ok(
		db.revisions
			.filter((r) => r.projectId === params.id)
			.sort((a, b) => b.revision - a.revision)
			.map((r) => ({ revision: r.revision, submittedBy: r.submittedBy, submittedAt: r.submittedAt })),
		"Revisions retrieved",
	);
});

route("GET", "/admin/projects/:id/revisions/:revision", "admin", ({ params }) => {
	const r = read().revisions.find((x) => x.projectId === params.id && x.revision === Number(params.revision));
	if (!r) throw new HttpError(404, "Revision not found");
	return ok(
		{ revision: r.revision, submittedBy: r.submittedBy, submittedAt: r.submittedAt, snapshot: r.snapshot },
		"Revision retrieved",
	);
});

route("GET", "/admin/analytics/projects/:id", "admin", ({ params, query }) => {
	const db = read();
	return ok(insightsFor(db, findProject(db, params.id!).id, query), "Insights");
});

// ---------------------------------------------------------------- categories

route("GET", "/admin/categories", "admin", () => {
	const db = read();
	return ok(
		[...db.categories]
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((c) => ({ ...c, projectCount: db.projects.filter((p) => p.categoryId === c.id).length })),
		"Categories retrieved",
	);
});

route("POST", "/admin/categories", "admin", ({ body, user }) => {
	const name = typeof body.name === "string" ? body.name.trim() : "";
	if (name.length < 2 || name.length > 60) throw invalid(["name must be 2 to 60 characters"]);
	return update((db) => {
		const slug = typeof body.slug === "string" && body.slug ? body.slug : slugify(name);
		if (db.categories.some((c) => c.slug === slug || c.name.toLowerCase() === name.toLowerCase()))
			throw new HttpError(409, "A category with that name or slug already exists");
		const c = {
			id: uuid(),
			name,
			slug,
			isActive: true,
			sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : db.categories.length + 1,
		};
		db.categories.push(c);
		audit(db, user!.id, "category.create", { type: "category", id: c.id }, { after: c });
		return ok({ ...c, projectCount: 0 }, "Category created", 201);
	});
});

route("PATCH", "/admin/categories/:id", "admin", ({ params, body, user }) =>
	update((db) => {
		const c = db.categories.find((x) => x.id === params.id);
		if (!c) throw new HttpError(404, "Category not found");
		const before = { ...c };
		if (typeof body.name === "string") {
			if (body.name.trim().length < 2) throw invalid(["name must be 2 to 60 characters"]);
			c.name = body.name.trim();
		}
		if (typeof body.isActive === "boolean") c.isActive = body.isActive;
		if (typeof body.sortOrder === "number") c.sortOrder = body.sortOrder;
		audit(db, user!.id, "category.update", { type: "category", id: c.id }, { before, after: { ...c } });
		return ok({ ...c, projectCount: db.projects.filter((p) => p.categoryId === c.id).length }, "Category updated");
	}),
);

// ---------------------------------------------------------------- users

const summary = (u: UserRec) => ({
	id: u.id,
	email: u.email,
	name: u.name,
	role: u.role,
	avatarUrl: u.avatarUrl,
	emailVerified: u.emailVerified,
	suspended: !!u.suspension,
	createdAt: u.createdAt,
});

/** Everything about an account (`GET /admin/users/{id}`). Sessions = unused refresh tokens in the mock. */
function detail(db: MockDb, u: UserRec): UserDetail {
	const owned = db.projects.filter((p) => p.ownerId === u.id);
	const byStatus: Partial<Record<ProjectStatus, number>> = {};
	for (const p of owned) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
	return {
		...summary(u),
		emailVerifiedAt: u.emailVerified ? (u.emailVerifiedAt ?? u.createdAt) : null,
		updatedAt: u.updatedAt ?? u.createdAt,
		lastLoginAt: u.lastLoginAt ?? null,
		activeSessions: db.refreshTokens.filter((t) => t.userId === u.id).length,
		profile: u.role === "builder" ? u.profile : null,
		projects: u.role === "builder" ? { total: owned.length, byStatus } : null,
		suspension: u.suspension
			? { ...u.suspension, suspendedByName: db.users.find((x) => x.id === u.suspension!.suspendedBy)?.name ?? null }
			: null,
	};
}

route("GET", "/admin/users", "admin", ({ query }) => {
	const db = read();
	const q = (query.get("q") ?? "").trim().toLowerCase();
	let list = [...db.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	if (q) list = list.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
	if (query.get("role")) list = list.filter((u) => u.role === query.get("role"));
	if (boolParam(query, "suspended") !== undefined) list = list.filter((u) => !!u.suspension === boolParam(query, "suspended"));
	if (boolParam(query, "emailVerified") !== undefined)
		list = list.filter((u) => u.emailVerified === boolParam(query, "emailVerified"));
	return ok(page(list.map(summary), query), "Users retrieved");
});

route("POST", "/admin/users", "admin", ({ body, user }) => {
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const problems: string[] = [];
	if (!/^\S+@\S+\.\S+$/.test(email)) problems.push("email must be an email");
	if (!name) problems.push("name must be longer than or equal to 1 characters");
	if (problems.length) throw invalid(problems);
	return update((db) => {
		if (db.users.some((u) => u.email === email)) throw new HttpError(409, "An account with this email already exists");
		const u: UserRec = {
			id: uuid(),
			email,
			name,
			role: "admin",
			password: `unset-${uuid()}`,
			emailVerified: true,
			suspension: null,
			avatarUrl: null,
			profile: null,
			createdAt: now(),
		};
		db.users.push(u);
		db.otps.push({ email, purpose: "reset", at: Date.now() });
		audit(db, user!.id, "admin.create", { type: "user", id: u.id }, { after: summary(u) });
		return ok(
			{ id: u.id, email, name, role: "admin", createdAt: u.createdAt, otpExpiresInSeconds: 86_400 },
			"Admin created",
			201,
		);
	});
});

route("GET", "/admin/users/:id", "admin", ({ params }) => {
	const db = read();
	const u = db.users.find((x) => x.id === params.id);
	if (!u) throw new HttpError(404, "User not found");
	return ok(detail(db, u), "User retrieved");
});

route("POST", "/admin/users/:id/suspension", "admin", ({ params, body, user }) => {
	const reason = typeof body.reason === "string" ? body.reason.trim() : "";
	if (reason.length < 3 || reason.length > 500) throw invalid(["reason must be 3 to 500 characters"]);
	if (params.id === user!.id) throw new HttpError(400, "You can’t suspend yourself");
	return update((db) => {
		const u = db.users.find((x) => x.id === params.id);
		if (!u) throw new HttpError(404, "User not found");
		u.suspension = { reason, suspendedBy: user!.id, suspendedAt: now() };
		db.refreshTokens = db.refreshTokens.filter((t) => t.userId !== u.id);
		audit(db, user!.id, "user.suspend", { type: "user", id: u.id }, { metadata: { reason } });
		return ok(detail(db, u), "User suspended", 201);
	});
});

route("DELETE", "/admin/users/:id/suspension", "admin", ({ params, user }) =>
	update((db) => {
		const u = db.users.find((x) => x.id === params.id);
		if (!u) throw new HttpError(404, "User not found");
		u.suspension = null;
		audit(db, user!.id, "user.restore", { type: "user", id: u.id });
		return ok(detail(db, u), "User restored");
	}),
);

// ---------------------------------------------------------------- audit, overview, analytics

route("GET", "/audit-logs", "admin", ({ query }) => {
	let list = read().audit;
	for (const k of ["resourceType", "resourceId", "action", "actorId"] as const) {
		const v = query.get(k);
		if (v) list = list.filter((a) => a[k] === v);
	}
	if (query.get("from")) list = list.filter((a) => a.at >= query.get("from")!);
	if (query.get("to")) list = list.filter((a) => a.at < query.get("to")!);
	return ok(page(list, query), "Audit log retrieved");
});

route("GET", "/admin/overview", "admin", () => {
	const db = read();
	const day = Date.now() - 86_400_000;
	const in24 = (iso: string | null) => !!iso && Date.parse(iso) >= day;
	const overview: AdminOverview = {
		queue: {
			projectsAwaitingReview: db.projects.filter((p) => p.status === "submitted" || p.status === "under_review").length,
			suggestionsPending: db.suggestions.filter((s) => s.status === "pending").length,
			reportsOpen: db.reports.filter((r) => r.status === "open").length,
		},
		contributions: {
			stuckPending: db.contributions.filter(
				(c) => c.status === "pending" && c.submittedAt && Date.now() - Date.parse(c.submittedAt) > 10 * 60_000,
			).length,
			stuckAfterMinutes: 10,
			confirmed24h: db.contributions.filter((c) => c.status === "confirmed" && in24(c.confirmedAt)).length,
			failed24h: db.contributions.filter((c) => c.status === "failed" && in24(c.updatedAt)).length,
			expired24h: db.contributions.filter((c) => c.status === "expired" && in24(c.updatedAt)).length,
		},
		recentDecisions: [...db.reviews]
			.sort((a, b) => b.at.localeCompare(a.at))
			.slice(0, 10)
			.map((r) => ({
				projectId: r.projectId,
				projectTitle: db.projects.find((p) => p.id === r.projectId)?.title ?? "Removed project",
				action: r.action,
				adminName: db.users.find((u) => u.id === r.adminId)?.name ?? null,
				createdAt: r.at,
			})),
	};
	return ok(overview, "Overview");
});

const EVENTS: AnalyticsEvent[] = [
	"builder_registered",
	"project_draft_created",
	"project_submitted",
	"project_review_decided",
	"project_published",
	"project_viewed",
	"wallet_connected",
	"contribution_started",
	"contribution_submitted",
	"contribution_confirmed",
	"contribution_failed",
	"suggestion_submitted",
	"suggestion_moderated",
];

const rate = (a: number, b: number) => (b ? a / b : null);

route("GET", "/admin/analytics", "admin", ({ query }) => {
	const db = read();
	const to = query.get("to") ? new Date(query.get("to")!) : new Date(Date.now() + 86_400_000);
	const from = query.get("from") ? new Date(query.get("from")!) : new Date(to.getTime() - 30 * 86_400_000);
	if (to.getTime() - from.getTime() > 366 * 86_400_000) throw invalid(["The range can be at most 366 days"]);
	const inRange = (iso: string) => iso >= from.toISOString() && iso < to.toISOString();
	const ev = db.events.filter((e) => inRange(e.at));
	const count = (n: AnalyticsEvent) => ev.filter((e) => e.name === n).length;
	const events = Object.fromEntries(EVENTS.map((n) => [n, count(n)])) as AnalyticsSummary["events"];
	const decisions = db.reviews.filter((r) => ["approve", "reject", "request_changes"].includes(r.action) && inRange(r.at));
	const hours = decisions
		.map((r) => {
			const p = db.projects.find((x) => x.id === r.projectId);
			return p?.submittedAt ? (Date.parse(r.at) - Date.parse(p.submittedAt)) / 3_600_000 : null;
		})
		.filter((h): h is number => h !== null && h >= 0)
		.sort((a, b) => a - b);
	const approved = db.projects.filter((p) => p.status === "approved" && p.decidedAt && inRange(p.decidedAt));
	const funded = approved.filter((p) => db.contributions.some((c) => c.projectId === p.id && c.status === "confirmed"));
	const c = {
		started: count("contribution_started"),
		submitted: count("contribution_submitted"),
		confirmed: count("contribution_confirmed"),
		failed: count("contribution_failed"),
		expired: db.contributions.filter((x) => x.status === "expired" && inRange(x.updatedAt)).length,
	};
	const summaryOut: AnalyticsSummary = {
		from: from.toISOString(),
		to: to.toISOString(),
		events,
		metrics: {
			submissionCompletion: {
				rate: rate(events.project_submitted, events.project_draft_created),
				draftsCreated: events.project_draft_created,
				submitted: events.project_submitted,
			},
			reviewTurnaround: { decisions: decisions.length, medianHours: hours.length ? hours[Math.floor(hours.length / 2)]! : null },
			approvalToFunding: { rate: rate(funded.length, approved.length), approved: approved.length, funded: funded.length },
			contributions: { ...c, successRate: rate(c.confirmed, c.submitted), failedTransactionRate: rate(c.failed, c.submitted) },
			suggestions: {
				submitted: events.suggestion_submitted,
				wallets: new Set(ev.filter((e) => e.name === "suggestion_submitted").map((e) => e.wallet)).size,
			},
			projectViews: events.project_viewed,
			backlog: {
				projectsAwaitingReview: db.projects.filter((p) => p.status === "submitted" || p.status === "under_review").length,
				suggestionsPending: db.suggestions.filter((s) => s.status === "pending").length,
				reportsOpen: db.reports.filter((r) => r.status === "open").length,
			},
		},
	};
	return ok(summaryOut, "Analytics");
});

export type { ProjectRec };
