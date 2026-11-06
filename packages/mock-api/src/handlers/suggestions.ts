import type { ReportReason, SuggestionType } from "@repo/domain/types";
import { read, update } from "../db";
import type { MockDb, SuggestionRec } from "../records";
import { HttpError, NoContent, invalid, ok, route } from "../router";
import { uuid } from "../util";
import { audit, event, isAddress, isPublic, notifyWallet, now, page, rateLimit } from "../common";

/** Suggestions, reports and moderation (backend guide, "Suggestions and reports"). Text is stored as plain text. */

const TYPES: SuggestionType[] = ["product_improvement", "technical_feedback", "community_marketing", "other"];
const REASONS: ReportReason[] = ["spam", "abuse", "misleading", "scam", "other"];

function restricted(db: MockDb, wallet: string) {
	const r = db.restrictions.find((x) => x.address === wallet && (!x.until || Date.parse(x.until) > Date.now()));
	if (r)
		throw new HttpError(
			403,
			`This wallet can’t post right now: ${r.reason}${r.until ? ` (until ${new Date(r.until).toLocaleDateString("en-GB")})` : ""}`,
		);
}

const projectRef = (db: MockDb, id: string) => {
	const p = db.projects.find((x) => x.id === id);
	return { id, slug: p?.slug ?? null, title: p?.title ?? "Removed project" };
};

const suggestionDto = (db: MockDb, s: SuggestionRec) => ({
	id: s.id,
	project: projectRef(db, s.projectId),
	type: s.type,
	title: s.title,
	body: s.body,
	link: s.link,
	status: s.status,
	moderationNote: s.moderationNote,
	moderatedAt: s.moderatedAt,
	createdAt: s.createdAt,
});

const adminDto = (db: MockDb, s: SuggestionRec) => ({
	...suggestionDto(db, s),
	walletAddress: s.walletAddress,
	moderatedBy: s.moderatedBy ? (db.users.find((u) => u.id === s.moderatedBy)?.name ?? s.moderatedBy) : null,
	openReportCount: db.reports.filter((r) => r.entityType === "suggestion" && r.entityId === s.id && r.status === "open").length,
});

const detailDto = (db: MockDb, s: SuggestionRec) => ({
	...adminDto(db, s),
	reports: db.reports
		.filter((r) => r.entityType === "suggestion" && r.entityId === s.id)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
});

route("POST", "/projects/:slug/suggestions", "wallet", ({ params, body, wallet }) => {
	const problems: string[] = [];
	const title = typeof body.title === "string" ? body.title.trim() : "";
	const text = typeof body.body === "string" ? body.body.trim() : "";
	const link = typeof body.link === "string" ? body.link.trim() : "";
	if (!TYPES.includes(body.type as SuggestionType))
		problems.push("type must be one of: product_improvement, technical_feedback, community_marketing, other");
	if (title.length < 5 || title.length > 120 || /\n/.test(title)) problems.push("title must be 5 to 120 characters on one line");
	if (text.length < 20 || text.length > 2000) problems.push("body must be 20 to 2000 characters");
	if (link && !/^https:\/\/\S+\.\S+/.test(link)) problems.push("link must be an https URL");
	if (problems.length) throw invalid(problems);
	return update((db) => {
		const p = db.projects.find((x) => x.slug === params.slug && isPublic(db, x));
		if (!p) throw new HttpError(404, "Project not found");
		restricted(db, wallet!);
		if (db.suggestions.filter((s) => s.projectId === p.id && s.walletAddress === wallet && s.status === "pending").length >= 3)
			throw new HttpError(409, "You already have 3 suggestions waiting for moderation on this project");
		rateLimit(db, `suggest:${wallet}`, 5, 10 * 60_000, "Too many suggestions from this wallet");
		const s: SuggestionRec = {
			id: uuid(),
			projectId: p.id,
			walletAddress: wallet!,
			type: body.type as SuggestionType,
			title,
			body: text,
			link: link || null,
			status: "pending",
			moderationNote: null,
			moderatedAt: null,
			moderatedBy: null,
			createdAt: now(),
		};
		db.suggestions.push(s);
		event(db, "suggestion_submitted", { projectId: p.id, wallet: wallet! });
		return ok(suggestionDto(db, s), "Suggestion received", 201);
	});
});

route("GET", "/suggestions/mine", "wallet", ({ wallet, query }) => {
	const db = read();
	const list = db.suggestions
		.filter((s) => s.walletAddress === wallet)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.map((s) => suggestionDto(db, s));
	return ok(page(list, query), "Suggestions retrieved");
});

function report(
	entityType: "suggestion" | "project",
	find: (db: MockDb) => { id: string; title: string; ownWallet?: string } | null,
) {
	return ({ body, wallet }: { body: Record<string, unknown>; wallet: string | null }) => {
		if (!REASONS.includes(body.reason as ReportReason))
			throw invalid(["reason must be one of: spam, abuse, misleading, scam, other"]);
		const details = typeof body.details === "string" ? body.details.trim().slice(0, 1000) : "";
		return update((db) => {
			const target = find(db);
			if (!target) throw new HttpError(404, `${entityType === "project" ? "Project" : "Suggestion"} not found`);
			restricted(db, wallet!);
			if (target.ownWallet === wallet) throw new HttpError(400, "You can’t report your own suggestion");
			if (db.reports.some((r) => r.entityType === entityType && r.entityId === target.id && r.reporterAddress === wallet))
				throw new HttpError(409, "Already reported");
			rateLimit(db, `report:${wallet}`, 10, 60_000, "Too many reports");
			const r = {
				id: uuid(),
				entityType,
				entityId: target.id,
				entityTitle: target.title,
				reporterAddress: wallet!,
				reason: body.reason as ReportReason,
				details: details || null,
				status: "open" as const,
				resolutionNote: null,
				resolvedBy: null,
				resolvedAt: null,
				createdAt: now(),
			};
			db.reports.push(r);
			return ok({ id: r.id, status: r.status }, "Report received", 201);
		});
	};
}

route("POST", "/suggestions/:id/reports", "wallet", (ctx) =>
	report("suggestion", (db) => {
		const s = db.suggestions.find((x) => x.id === ctx.params.id && x.status === "published");
		return s ? { id: s.id, title: s.title, ownWallet: s.walletAddress } : null;
	})(ctx),
);

route("POST", "/projects/:slug/reports", "wallet", (ctx) =>
	report("project", (db) => {
		const p = db.projects.find((x) => x.slug === ctx.params.slug && isPublic(db, x));
		return p ? { id: p.id, title: p.title } : null;
	})(ctx),
);

// ---------------------------------------------------------------- admin moderation

route("GET", "/admin/suggestions", "admin", ({ query }) => {
	const db = read();
	let list = [...db.suggestions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	if (query.get("status")) list = list.filter((s) => s.status === query.get("status"));
	if (query.get("projectId")) list = list.filter((s) => s.projectId === query.get("projectId"));
	if (query.get("address")) list = list.filter((s) => s.walletAddress === query.get("address"));
	const dtos = list.map((s) => adminDto(db, s));
	return ok(
		page(query.get("reported") === "true" ? dtos.filter((s) => s.openReportCount > 0) : dtos, query),
		"Suggestions retrieved",
	);
});

route("GET", "/admin/suggestions/:id", "admin", ({ params }) => {
	const db = read();
	const s = db.suggestions.find((x) => x.id === params.id);
	if (!s) throw new HttpError(404, "Suggestion not found");
	return ok(detailDto(db, s), "Suggestion retrieved");
});

route("POST", "/admin/suggestions/:id/actions", "admin", ({ params, body, user }) => {
	const action = body.action as "approve" | "reject" | "hide";
	if (!["approve", "reject", "hide"].includes(action)) throw invalid(["action must be one of: approve, reject, hide"]);
	const note = typeof body.note === "string" ? body.note.trim() : "";
	if (action !== "approve" && !note) throw invalid(["note is required to reject or hide"]);
	return update((db) => {
		const s = db.suggestions.find((x) => x.id === params.id);
		if (!s) throw new HttpError(404, "Suggestion not found");
		const allowed =
			action === "approve"
				? s.status === "pending" || s.status === "hidden"
				: action === "reject"
					? s.status === "pending"
					: s.status === "published";
		if (!allowed) throw new HttpError(409, `Cannot ${action} a suggestion that is ${s.status}`);
		const before = { status: s.status };
		s.status = action === "approve" ? "published" : action === "reject" ? "rejected" : "hidden";
		s.moderationNote = note || null;
		s.moderatedAt = now();
		s.moderatedBy = user!.id;
		// Acting resolves the suggestion's open reports.
		for (const r of db.reports.filter((x) => x.entityType === "suggestion" && x.entityId === s.id && x.status === "open"))
			Object.assign(r, { status: "resolved", resolvedBy: user!.id, resolvedAt: now(), resolutionNote: `Suggestion ${s.status}` });
		event(db, "suggestion_moderated", { projectId: s.projectId });
		const title = db.projects.find((p) => p.id === s.projectId)?.title ?? "a project";
		const notice = {
			published: [
				"suggestion_published",
				`Your suggestion on ${title} is public`,
				`“${s.title}” is now visible on the project page.`,
			],
			rejected: ["suggestion_rejected", `Your suggestion on ${title} wasn’t published`, note],
			hidden: ["suggestion_hidden", `Your suggestion on ${title} was hidden`, note],
		} as const;
		const [type, nTitle, nBody] = notice[s.status as "published" | "rejected" | "hidden"];
		notifyWallet(db, s.walletAddress, type, nTitle, nBody, s.projectId);
		audit(
			db,
			user!.id,
			`suggestion.${action}`,
			{ type: "suggestion", id: s.id },
			{ metadata: note ? { note } : {}, before, after: { status: s.status } },
		);
		return ok(detailDto(db, s), "Suggestion moderated");
	});
});

route("GET", "/admin/reports", "admin", ({ query }) => {
	let list = [...read().reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	if (query.get("status")) list = list.filter((r) => r.status === query.get("status"));
	if (query.get("entityType")) list = list.filter((r) => r.entityType === query.get("entityType"));
	return ok(page(list, query), "Reports retrieved");
});

route("POST", "/admin/reports/:id/close", "admin", ({ params, body, user }) => {
	if (!["resolved", "dismissed"].includes(body.outcome as string)) throw invalid(["outcome must be one of: resolved, dismissed"]);
	return update((db) => {
		const r = db.reports.find((x) => x.id === params.id);
		if (!r) throw new HttpError(404, "Report not found");
		if (r.status !== "open") throw new HttpError(409, "This report is already closed");
		Object.assign(r, {
			status: body.outcome,
			resolutionNote: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
			resolvedBy: user!.id,
			resolvedAt: now(),
		});
		audit(db, user!.id, "report.close", { type: "report", id: r.id }, { after: { status: r.status } });
		return ok(r, "Report closed");
	});
});

route("GET", "/admin/wallet-restrictions", "admin", () => ok(read().restrictions, "Restrictions retrieved"));

route("PUT", "/admin/wallet-restrictions/:address", "admin", ({ params, body, user }) => {
	if (!isAddress(params.address)) throw invalid(["address must be a Stellar public key"]);
	const reason = typeof body.reason === "string" ? body.reason.trim() : "";
	if (reason.length < 3) throw invalid(["reason must be longer than or equal to 3 characters"]);
	if (body.days !== undefined && !(Number.isInteger(body.days) && (body.days as number) > 0))
		throw invalid(["days must be a positive integer"]);
	return update((db) => {
		const r = {
			address: params.address!,
			reason,
			restrictedBy: user!.id,
			until: body.days ? new Date(Date.now() + (body.days as number) * 86_400_000).toISOString() : null,
			createdAt: now(),
		};
		db.restrictions = [r, ...db.restrictions.filter((x) => x.address !== r.address)];
		audit(db, user!.id, "wallet.restrict", { type: "wallet", id: r.address }, { after: r });
		return ok(r, "Wallet restricted");
	});
});

route("DELETE", "/admin/wallet-restrictions/:address", "admin", ({ params, user }) => {
	update((db) => {
		db.restrictions = db.restrictions.filter((x) => x.address !== params.address);
		audit(db, user!.id, "wallet.lift_restriction", { type: "wallet", id: params.address! });
	});
	return new NoContent();
});
