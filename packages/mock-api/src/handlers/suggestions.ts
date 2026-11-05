import type { Report, Suggestion, SuggestionType } from "../model";
import { isPubliclyVisible } from "../model-rules";
import { read, update } from "../db";
import { HttpError, ok, route } from "../router";
import { iso, paginate, uuid } from "../util";

/**
 * Suggestions (PRD §6.6, D8): anyone with a connected wallet can suggest; new ones are `pending_moderation` and
 * never public until an admin publishes them. Stored as plain text (the UI renders text, never HTML).
 * Rate limit: 3 per wallet per hour (FR-SUG-04). Reports flag a suggestion for moderation.
 */

const TYPES: SuggestionType[] = ["product_improvement", "technical_feedback", "community_marketing", "other"];
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const HOUR = 60 * 60 * 1000;
const PER_HOUR = 3;

/** Strips control characters and collapses runs of blank lines; text stays text. */
const clean = (v: unknown) =>
	String(v ?? "")
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

const publicShape = (s: Suggestion) => ({
	id: s.id,
	type: s.type,
	title: s.title,
	body: s.body,
	link: s.link,
	wallet_address: s.wallet_address,
	created_at: s.created_at,
});

function liveProject(slug: string) {
	const db = read();
	const p = db.projects.find((x) => x.slug === slug && isPubliclyVisible(x));
	if (!p) throw new HttpError(404, "This project isn’t available.");
	return { db, p };
}

route("GET", "/projects/:slug/suggestions", "public", ({ params, query }) => {
	const { db, p } = liveProject(params.slug!);
	const list = db.suggestions
		.filter((s) => s.project_id === p.id && s.status === "published")
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const page = paginate(list, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 10));
	return ok({
		items: page.items.map(publicShape),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
	});
});

route("POST", "/projects/:slug/suggestions", "public", ({ params, body }) => {
	const { p } = liveProject(params.slug!);
	const wallet = String(body.wallet_address ?? "").trim();
	const type = String(body.type ?? "") as SuggestionType;
	const title = clean(body.title);
	const text = clean(body.body);
	const link = clean(body.link);
	if (!STELLAR_ADDRESS.test(wallet))
		throw new HttpError(422, "Connect a Stellar wallet to send a suggestion.", { field: "wallet_address" });
	if (!TYPES.includes(type)) throw new HttpError(422, "Choose a type.", { field: "type" });
	if (title.length < 5 || title.length > 120) throw new HttpError(422, "Use 5–120 characters for the title.", { field: "title" });
	if (text.length < 20 || text.length > 2000)
		throw new HttpError(422, "Use 20–2,000 characters for your suggestion.", { field: "body" });
	if (link && !/^https?:\/\/\S+\.\S+/i.test(link))
		throw new HttpError(422, "Enter a full link, starting with https://", { field: "link" });

	const created = update((db) => {
		const key = `suggest:${wallet}`;
		const recent = (db.rateLimits[key] ?? []).filter((t) => t > Date.now() - HOUR);
		if (recent.length >= PER_HOUR)
			throw new HttpError(429, "You’ve sent 3 suggestions in the last hour. Please try again later.", {
				retry_after: Math.ceil((recent[0]! + HOUR - Date.now()) / 1000),
			});
		db.rateLimits[key] = [...recent, Date.now()];
		const s: Suggestion = {
			id: uuid(),
			project_id: p.id,
			wallet_address: wallet,
			type,
			title,
			body: text,
			link: link || null,
			status: "pending_moderation",
			report_count: 0,
			created_at: iso(Date.now()),
			moderated_by: null,
			moderated_at: null,
			moderation_reason: null,
		};
		db.suggestions.push(s);
		return s;
	});
	return ok(created, "Suggestion sent for moderation", 201);
});

/** The wallet's own suggestions with their moderation status (shown only to that wallet). */
route("GET", "/suggestions/mine", "public", ({ query }) => {
	const wallet = String(query.get("wallet") ?? "");
	if (!STELLAR_ADDRESS.test(wallet)) return ok([]);
	const db = read();
	return ok(
		db.suggestions
			.filter((s) => s.wallet_address === wallet)
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((s) => {
				const p = db.projects.find((x) => x.id === s.project_id);
				return {
					...publicShape(s),
					status: s.status,
					moderation_reason: s.moderation_reason,
					project: { slug: p?.slug ?? "", title: p?.title ?? "" },
				};
			}),
	);
});

route("POST", "/reports", "public", ({ body }) => {
	const reporter = String(body.reporter ?? "").trim();
	const entity_type = body.entity_type === "project" ? "project" : "suggestion";
	const entity_id = String(body.entity_id ?? "");
	const reason = clean(body.reason);
	if (!reporter) throw new HttpError(422, "Connect a wallet to report.");
	if (reason.length < 5 || reason.length > 500)
		throw new HttpError(422, "Tell us briefly what’s wrong (5–500 characters).", { field: "reason" });
	update((db) => {
		if (db.reports.some((r) => r.reporter_wallet_or_user === reporter && r.entity_id === entity_id && r.status === "open"))
			return;
		const r: Report = {
			id: uuid(),
			reporter_wallet_or_user: reporter,
			entity_type,
			entity_id,
			reason,
			status: "open",
			created_at: iso(Date.now()),
		};
		db.reports.push(r);
		if (entity_type === "suggestion") {
			const s = db.suggestions.find((x) => x.id === entity_id);
			if (s) s.report_count += 1;
		}
	});
	return ok({}, "Thanks. A moderator will take a look.", 201);
});
