import { read, update } from "../db";
import type { MockDb, UpdateRec } from "../records";
import { HttpError, NoContent, invalid, ok, route, type Ctx } from "../router";
import { uuid } from "../util";
import { audit, imagePart, isPublic, notifyUser, notifyWallet, now, page, rateLimit, readAsDataUrl } from "../common";

/**
 * Project updates (backend: "Project updates"). Builders post on approved projects; they're public immediately and
 * every wallet with a confirmed contribution is notified. Admins can remove one with a reason the builder sees.
 * Plain text only.
 */

const flat = (v: unknown) => (typeof v === "string" ? v.replace(/\s*\n\s*/g, " ").trim() : "");
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function rules(body: Record<string, unknown>, partial: boolean) {
	const extra = Object.keys(body).filter((k) => k !== "title" && k !== "body");
	if (extra.length) throw invalid(extra.map((k) => `property ${k} should not exist`));
	const problems: string[] = [];
	if (!partial || "title" in body) {
		const t = flat(body.title);
		if (t.length < 5) problems.push("title must be longer than or equal to 5 characters");
		else if (t.length > 120) problems.push("title must be shorter than or equal to 120 characters");
	}
	if (!partial || "body" in body) {
		const b = text(body.body);
		if (b.length < 20) problems.push("body must be longer than or equal to 20 characters");
		else if (b.length > 5000) problems.push("body must be shorter than or equal to 5000 characters");
	}
	if (partial && !("title" in body) && !("body" in body)) problems.push("Send title, body or both");
	if (problems.length) throw invalid(problems);
}

function ownProject(db: MockDb, ctx: Ctx) {
	const p = db.projects.find((x) => x.id === ctx.params.projectId);
	if (!p || p.ownerId !== ctx.user!.id) throw new HttpError(404, "Project not found");
	return p;
}

function ownUpdate(db: MockDb, ctx: Ctx) {
	const p = ownProject(db, ctx);
	const u = db.updates.find((x) => x.id === ctx.params.id && x.projectId === p.id);
	if (!u) throw new HttpError(404, "Update not found");
	return u;
}

const newestFirst = (a: UpdateRec, b: UpdateRec) => b.createdAt.localeCompare(a.createdAt);
const publicDto = ({ id, title, body, imageUrl, createdAt, updatedAt }: UpdateRec) => ({
	id,
	title,
	body,
	imageUrl,
	createdAt,
	updatedAt,
});

route("GET", "/projects/:slug/updates", "public", ({ params, query }) => {
	const db = read();
	const p = db.projects.find((x) => x.slug === params.slug && isPublic(db, x));
	if (!p) throw new HttpError(404, "Project not found");
	const list = db.updates
		.filter((u) => u.projectId === p.id && u.status === "published")
		.sort(newestFirst)
		.map(publicDto);
	return ok(page(list, query), "Updates retrieved");
});

route("GET", "/builder/projects/:projectId/updates", "builder", (ctx) => {
	const db = read();
	const p = ownProject(db, ctx);
	return ok(page(db.updates.filter((u) => u.projectId === p.id).sort(newestFirst), ctx.query), "Updates retrieved");
});

route("POST", "/builder/projects/:projectId/updates", "builder", (ctx) => {
	rules(ctx.body, false);
	return update((db) => {
		const p = ownProject(db, ctx);
		if (p.status !== "approved") throw new HttpError(409, "Updates can be posted on approved projects only");
		rateLimit(db, `updates:${p.id}`, 10, 60 * 60_000, "Too many updates; try again later");
		const t = now();
		const u: UpdateRec = {
			id: uuid(),
			projectId: p.id,
			title: flat(ctx.body.title),
			body: text(ctx.body.body),
			imageUrl: null,
			status: "published",
			removalReason: null,
			removedAt: null,
			createdAt: t,
			updatedAt: t,
		};
		db.updates.push(u);
		const backers = new Set(
			db.contributions.filter((c) => c.projectId === p.id && c.status === "confirmed").map((c) => c.contributorAddress),
		);
		for (const address of backers) notifyWallet(db, address, "project_update", `${p.title} posted an update`, u.title, p.id);
		return ok(u, "Update posted", 201);
	});
});

route("PATCH", "/builder/projects/:projectId/updates/:id", "builder", (ctx) => {
	rules(ctx.body, true);
	return update((db) => {
		const u = ownUpdate(db, ctx);
		if (u.status === "removed") throw new HttpError(409, "A removed update cannot be edited");
		if ("title" in ctx.body) u.title = flat(ctx.body.title);
		if ("body" in ctx.body) u.body = text(ctx.body.body);
		u.updatedAt = now();
		return ok(u, "Update edited");
	});
});

route("DELETE", "/builder/projects/:projectId/updates/:id", "builder", (ctx) => {
	update((db) => {
		const u = ownUpdate(db, ctx);
		db.updates = db.updates.filter((x) => x.id !== u.id);
	});
	return new NoContent();
});

route("PUT", "/builder/projects/:projectId/updates/:id/image", "builder", async (ctx) => {
	const url = await readAsDataUrl(imagePart(ctx.body, "image", "image"));
	return update((db) => {
		const u = ownUpdate(db, ctx);
		u.imageUrl = url;
		u.updatedAt = now();
		return ok(u, "Image uploaded");
	});
});

route("DELETE", "/builder/projects/:projectId/updates/:id/image", "builder", (ctx) =>
	update((db) => {
		const u = ownUpdate(db, ctx);
		u.imageUrl = null;
		u.updatedAt = now();
		return ok(u, "Image removed");
	}),
);

route("GET", "/admin/projects/:id/updates", "admin", ({ params, query }) => {
	const db = read();
	if (!db.projects.some((p) => p.id === params.id)) throw new HttpError(404, "Project not found");
	return ok(page(db.updates.filter((u) => u.projectId === params.id).sort(newestFirst), query), "Updates retrieved");
});

route("POST", "/admin/project-updates/:id/remove", "admin", ({ params, body, user }) => {
	const reason = text(body.reason);
	if (reason.length < 5 || reason.length > 1000) throw invalid(["reason must be longer than or equal to 5 characters"]);
	return update((db) => {
		const u = db.updates.find((x) => x.id === params.id);
		if (!u) throw new HttpError(404, "Update not found");
		if (u.status === "removed") throw new HttpError(409, "This update was already removed");
		u.status = "removed";
		u.removalReason = reason;
		u.removedAt = now();
		const p = db.projects.find((x) => x.id === u.projectId)!;
		notifyUser(db, p.ownerId, "project_update_removed", `An update on ${p.title} was removed`, reason, p.id);
		audit(db, user!.id, "project_update.remove", { type: "project_update", id: u.id }, { metadata: { reason, projectId: p.id } });
		return ok(u, "Update removed");
	});
});
