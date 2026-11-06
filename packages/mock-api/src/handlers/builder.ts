import type { ProjectInsights, ProjectStage, ProjectType } from "@repo/domain/types";
import { isValidAmount } from "@repo/domain/money";
import { read, update } from "../db";
import type { MockDb, ProjectRec } from "../records";
import { HttpError, NoContent, invalid, ok, route, type Ctx } from "../router";
import { uuid } from "../util";
import { assetById, audit, contributionDto, event, isAddress, lengthRule, notifyUser, now, page, projectDto } from "../common";

/** A builder's own projects (backend guide, "Projects"). Admins get 403 here. */

const TYPES: ProjectType[] = ["new_idea", "existing_project"];
const STAGES: ProjectStage[] = ["idea", "prototype", "mvp", "launched", "scaling"];
const FIELDS = [
	"type",
	"title",
	"summary",
	"problem",
	"solution",
	"categoryId",
	"stage",
	"beneficiaries",
	"teamMembers",
	"links",
	"fundraisingEnabled",
	"targetAmount",
	"targetAssetId",
	"acceptedAssetIds",
	"payoutAddress",
];

function own(db: MockDb, ctx: Ctx) {
	const p = db.projects.find((x) => x.id === ctx.params.id);
	if (!p || p.ownerId !== ctx.user!.id) throw new HttpError(404, "Project not found");
	return p;
}

/** The rules on every save (API wording), then applies the fields. */
function applyFields(db: MockDb, p: ProjectRec, body: Record<string, unknown>) {
	const extra = Object.keys(body).filter((k) => !FIELDS.includes(k));
	if (extra.length) throw invalid(extra.map((k) => `property ${k} should not exist`));
	const problems: string[] = [];
	const text = (k: string) => (body[k] === null || body[k] === undefined ? null : String(body[k]).trim() || null);
	if ("type" in body && !TYPES.includes(body.type as ProjectType)) problems.push("type must be one of: new_idea, existing_project");
	if ("title" in body) lengthRule("title", text("title"), 3, 120, problems);
	for (const [k, max] of [
		["summary", 280],
		["problem", 5000],
		["solution", 5000],
		["beneficiaries", 2000],
	] as const)
		if (k in body && (text(k)?.length ?? 0) > max) problems.push(`${k} must be shorter than or equal to ${max} characters`);
	if ("stage" in body && body.stage !== null && !STAGES.includes(body.stage as ProjectStage))
		problems.push("stage must be one of: idea, prototype, mvp, launched, scaling");
	if ("categoryId" in body && body.categoryId && !db.categories.some((c) => c.id === body.categoryId && c.isActive))
		problems.push("categoryId must be an active category");
	if ("teamMembers" in body) {
		const t = body.teamMembers as { name?: string; role?: string }[];
		if (!Array.isArray(t)) problems.push("teamMembers must be an array");
		else if (t.length > 20) problems.push("teamMembers must contain no more than 20 elements");
		else if (t.some((m) => !m?.name?.trim() || !m?.role?.trim())) problems.push("teamMembers each need a name and a role");
	}
	if ("links" in body) {
		const l = body.links as { label?: string; url?: string }[];
		if (!Array.isArray(l)) problems.push("links must be an array");
		else if (l.length > 10) problems.push("links must contain no more than 10 elements");
		else if (l.some((x) => !x?.label?.trim() || !/^https:\/\/\S+\.\S+/.test(x?.url ?? ""))) problems.push("links each need a label and an https URL");
	}
	if ("targetAmount" in body && body.targetAmount && !isValidAmount(String(body.targetAmount)))
		problems.push("targetAmount must be a decimal above 0 with up to 7 decimals");
	if ("targetAssetId" in body && body.targetAssetId && !assetById(String(body.targetAssetId))) problems.push("targetAssetId must be XLM or USDC");
	if ("acceptedAssetIds" in body && (!Array.isArray(body.acceptedAssetIds) || (body.acceptedAssetIds as string[]).some((a) => !assetById(a))))
		problems.push("acceptedAssetIds must only contain XLM or USDC");
	if ("payoutAddress" in body && body.payoutAddress && !isAddress(body.payoutAddress)) problems.push("payoutAddress must be a Stellar public key");
	if (problems.length) throw invalid(problems);

	if ("type" in body) p.type = body.type as ProjectType;
	if ("title" in body) p.title = text("title")!;
	for (const k of ["summary", "problem", "solution", "beneficiaries"] as const) if (k in body) p[k] = text(k);
	if ("categoryId" in body) p.categoryId = text("categoryId");
	if ("stage" in body) p.stage = (body.stage as ProjectStage) ?? null;
	if ("teamMembers" in body) p.teamMembers = (body.teamMembers as { name: string; role: string }[]).map((m) => ({ name: m.name.trim(), role: m.role.trim() }));
	if ("links" in body) p.links = (body.links as { label: string; url: string }[]).map((x) => ({ label: x.label.trim(), url: x.url.trim() }));
	if ("fundraisingEnabled" in body) p.fundraisingEnabled = !!body.fundraisingEnabled;
	if ("targetAmount" in body) p.targetAmount = text("targetAmount");
	if ("targetAssetId" in body) p.targetAssetId = text("targetAssetId");
	if ("acceptedAssetIds" in body) p.acceptedAssetIds = [...new Set(body.acceptedAssetIds as string[])];
	if ("payoutAddress" in body) p.payoutAddress = text("payoutAddress");
	p.updatedAt = now();
}

/** What a submission needs, in form order (the API's 400 details). */
export function submitProblems(p: ProjectRec) {
	const out: string[] = [];
	lengthRule("title", p.title, 3, 120, out);
	lengthRule("summary", p.summary, 20, 280, out);
	lengthRule("problem", p.problem, 50, 5000, out);
	lengthRule("solution", p.solution, 50, 5000, out);
	if (!p.categoryId) out.push("categoryId must be set");
	if (!p.stage) out.push("stage must be set");
	lengthRule("beneficiaries", p.beneficiaries, 10, 2000, out);
	if (!p.teamMembers.length) out.push("teamMembers must list at least one person");
	if (p.fundraisingEnabled) {
		if (!p.targetAmount) out.push("targetAmount is required when fundraising");
		if (!p.targetAssetId) out.push("targetAssetId is required when fundraising");
		if (!p.acceptedAssetIds.length) out.push("acceptedAssetIds must include at least one asset");
		else if (p.targetAssetId && !p.acceptedAssetIds.includes(p.targetAssetId)) out.push("acceptedAssetIds must include targetAssetId");
		if (!p.payoutAddress) out.push("payoutAddress is required when fundraising");
	}
	return out;
}

route("POST", "/builder/projects", "builder", ({ user, body }) => {
	const problems: string[] = [];
	if (!TYPES.includes(body.type as ProjectType)) problems.push("type must be one of: new_idea, existing_project");
	if (typeof body.title !== "string") problems.push("title must be a string");
	if (problems.length) throw invalid(problems);
	return update((db) => {
		const t = now();
		const p: ProjectRec = {
			id: uuid(),
			ownerId: user!.id,
			type: body.type as ProjectType,
			status: "draft",
			title: "",
			slug: null,
			summary: null,
			problem: null,
			solution: null,
			categoryId: null,
			stage: null,
			beneficiaries: null,
			teamMembers: [],
			links: [],
			coverImageUrl: null,
			fundraisingEnabled: false,
			targetAmount: null,
			targetAssetId: null,
			acceptedAssetIds: [],
			payoutAddress: null,
			published: false,
			featured: false,
			revision: 0,
			submittedAt: null,
			decidedAt: null,
			publishedAt: null,
			createdAt: t,
			updatedAt: t,
		};
		applyFields(db, p, body);
		db.projects.push(p);
		event(db, "project_draft_created", { projectId: p.id });
		return ok(projectDto(db, p), "Project created", 201);
	});
});

route("GET", "/builder/projects", "builder", ({ user, query }) => {
	const db = read();
	const status = query.get("status");
	const list = db.projects
		.filter((p) => p.ownerId === user!.id && (!status || p.status === status))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.map((p) => projectDto(db, p));
	return ok(page(list, query), "Projects retrieved");
});

route("GET", "/builder/projects/:id", "builder", (ctx) => {
	const db = read();
	return ok(projectDto(db, own(db, ctx)), "Project retrieved");
});

route("PATCH", "/builder/projects/:id", "builder", (ctx) => {
	if (!Object.keys(ctx.body).length) throw invalid(["Send at least one field"]);
	return update((db) => {
		const p = own(db, ctx);
		if (p.status !== "draft" && p.status !== "changes_requested") throw new HttpError(409, `Cannot edit a project that is ${p.status}`);
		applyFields(db, p, ctx.body);
		return ok(projectDto(db, p), "Project updated");
	});
});

route("DELETE", "/builder/projects/:id", "builder", (ctx) => {
	update((db) => {
		const p = own(db, ctx);
		if (p.status !== "draft" || p.revision > 0) throw new HttpError(409, "Only drafts that were never submitted can be deleted");
		db.projects = db.projects.filter((x) => x.id !== p.id);
	});
	return new NoContent();
});

route("POST", "/builder/projects/:id/submit", "builder", (ctx) =>
	update((db) => {
		const p = own(db, ctx);
		if (p.status !== "draft" && p.status !== "changes_requested") throw new HttpError(409, `Cannot submit a project that is ${p.status}`);
		const problems = submitProblems(p);
		if (problems.length) throw invalid(problems);
		// With fundraising on, the payout account must exist and trust every issued asset (mock: an address ending in
		// "X" stands in for an unfunded account).
		if (p.fundraisingEnabled && p.payoutAddress?.endsWith("X"))
			throw new HttpError(400, "payoutAddress does not exist on the Stellar network yet: fund it with XLM first");
		const from = p.status;
		p.status = "submitted";
		p.revision += 1;
		p.submittedAt = now();
		p.updatedAt = now();
		const { id: _id, ownerId: _o, ...snapshot } = p;
		db.revisions.push({ projectId: p.id, revision: p.revision, submittedBy: ctx.user!.id, submittedAt: p.submittedAt, snapshot });
		notifyUser(db, p.ownerId, "project_submitted", `We received ${p.title} for review`, "An admin will review it soon. You’ll be notified of the decision.", p.id);
		for (const admin of db.users.filter((u) => u.role === "admin"))
			notifyUser(db, admin.id, "review_requested", `${p.title} is waiting for review`, `Revision ${p.revision}, submitted by ${ctx.user!.name}.`, p.id);
		audit(db, ctx.user!.id, "project.submit", { type: "project", id: p.id }, { metadata: { from, revision: p.revision } });
		event(db, "project_submitted", { projectId: p.id });
		return ok(projectDto(db, p), "Project submitted");
	}),
);

route("GET", "/builder/projects/:id/feedback", "builder", (ctx) => {
	const db = read();
	const p = own(db, ctx);
	return ok(
		db.reviews
			.filter((r) => r.projectId === p.id)
			.sort((a, b) => a.at.localeCompare(b.at))
			.map((r) => ({ action: r.action, fromStatus: r.fromStatus, toStatus: r.toStatus, reason: r.reason, revision: r.revision, at: r.at })),
		"Feedback retrieved",
	);
});

const readAsDataUrl = (file: Blob) =>
	new Promise<string>((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(String(r.result));
		r.onerror = () => reject(new HttpError(415, "Could not read the image"));
		r.readAsDataURL(file);
	});

route("PUT", "/builder/projects/:id/cover", "builder", async (ctx) => {
	const file = ctx.body.cover;
	if (!(file instanceof Blob)) throw invalid(["cover file is required"]);
	if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new HttpError(415, "Cover must be a JPEG, PNG or WebP image");
	if (file.size > 5 * 1024 * 1024) throw new HttpError(413, "Cover must be 5 MB or smaller");
	const url = await readAsDataUrl(file);
	return update((db) => {
		const p = own(db, ctx);
		if (p.status !== "draft" && p.status !== "changes_requested") throw new HttpError(409, `Cannot edit a project that is ${p.status}`);
		p.coverImageUrl = url;
		p.updatedAt = now();
		return ok(projectDto(db, p), "Cover uploaded");
	});
});

route("DELETE", "/builder/projects/:id/cover", "builder", (ctx) =>
	update((db) => {
		const p = own(db, ctx);
		p.coverImageUrl = null;
		p.updatedAt = now();
		return ok(projectDto(db, p), "Cover removed");
	}),
);

route("GET", "/builder/projects/:id/contributions", "builder", (ctx) => {
	const db = read();
	const p = own(db, ctx);
	const list = db.contributions
		.filter((c) => c.projectId === p.id && c.status === "confirmed")
		.sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""))
		.map((c) => contributionDto(db, c));
	return ok(page(list, ctx.query), "Contributions retrieved");
});

/** Views per day, contributions started/confirmed, suggestions received/published (default: the last 30 days). */
export function insights(db: MockDb, projectId: string, query: URLSearchParams): ProjectInsights {
	const to = query.get("to") ? new Date(query.get("to")!) : new Date(Date.now() + 86_400_000);
	const from = query.get("from") ? new Date(query.get("from")!) : new Date(to.getTime() - 30 * 86_400_000);
	const inRange = (iso: string) => iso >= from.toISOString() && iso < to.toISOString();
	const views = db.events.filter((e) => e.name === "project_viewed" && e.projectId === projectId && inRange(e.at));
	const days: Record<string, number> = {};
	for (let t = from.getTime(); t < to.getTime(); t += 86_400_000) days[new Date(t).toISOString().slice(0, 10)] = 0;
	for (const v of views) days[v.at.slice(0, 10)] = (days[v.at.slice(0, 10)] ?? 0) + 1;
	const contribs = db.contributions.filter((c) => c.projectId === projectId && inRange(c.createdAt));
	const sugg = db.suggestions.filter((s) => s.projectId === projectId && inRange(s.createdAt));
	return {
		projectId,
		from: from.toISOString(),
		to: to.toISOString(),
		views: views.length,
		viewsByDay: Object.entries(days).map(([date, n]) => ({ date, views: n })),
		contributionsStarted: contribs.length,
		contributionsConfirmed: contribs.filter((c) => c.status === "confirmed").length,
		suggestionsReceived: sugg.length,
		suggestionsPublished: sugg.filter((s) => s.status === "published").length,
	};
}

route("GET", "/builder/projects/:id/insights", "builder", (ctx) => {
	const db = read();
	return ok(insights(db, own(db, ctx).id, ctx.query), "Insights");
});
