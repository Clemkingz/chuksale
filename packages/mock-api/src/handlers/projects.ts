import type { Project } from "../model";
import { compare } from "@repo/domain/money";
import { isPubliclyVisible } from "../model-rules";
import { read } from "../db";
import { HttpError, ok, route } from "../router";
import { paginate } from "../util";
import { confirmedFor, publicProject } from "./shared";

/**
 * Public discovery (PRD §6.3): list with search/filters/sort, featured, detail, contributions, updates, categories.
 * EVERY handler filters with isPubliclyVisible() (FR-REV-05): unapproved or unpublished projects 404.
 */

const visible = () => {
	const db = read();
	return { db, projects: db.projects.filter(isPubliclyVisible) };
};

function bySlug(slug: string) {
	const { db, projects } = visible();
	const p = projects.find((x) => x.slug === slug);
	if (!p) throw new HttpError(404, "This project isn’t available.");
	return { db, p };
}

route("GET", "/categories", "public", () => ok(read().categories.filter((c) => c.is_active)));

route("GET", "/projects", "public", ({ query }) => {
	const { db, projects } = visible();
	const q = (query.get("q") ?? "").trim().toLowerCase();
	const category = query.get("category");
	const stage = query.get("stage");
	const funding = query.get("funding"); // open | funded
	const sort = query.get("sort") ?? "newest";
	let list = projects.map((p) => publicProject(db, p));
	if (q)
		list = list.filter((p) =>
			`${p.title} ${p.summary} ${p.owner.display_name} ${p.category?.name ?? ""}`.toLowerCase().includes(q),
		);
	if (category) list = list.filter((p) => p.category?.slug === category);
	if (stage) list = list.filter((p) => p.stage === stage);
	if (funding === "funded") list = list.filter((p) => p.target_amount && compare(p.raised_amount, p.target_amount) >= 0);
	if (funding === "open")
		list = list.filter((p) => p.fundraising && (!p.target_amount || compare(p.raised_amount, p.target_amount) < 0));
	list.sort((a, b) =>
		sort === "most_funded"
			? compare(b.raised_amount, a.raised_amount)
			: sort === "featured"
				? Number(b.featured) - Number(a.featured) || (b.approved_at ?? "").localeCompare(a.approved_at ?? "")
				: (b.approved_at ?? "").localeCompare(a.approved_at ?? ""),
	);
	const page = paginate(list, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 9));
	return ok({
		items: page.items,
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
	});
});

route("GET", "/projects/featured", "public", () => {
	const { db, projects } = visible();
	const newest = (list: typeof projects) => [...list].sort((a, b) => (b.approved_at ?? "").localeCompare(a.approved_at ?? ""));
	// Featured first, then the newest live projects, so the home row is always full (3 or 6 cards).
	const all = [...newest(projects.filter((p) => p.featured)), ...newest(projects.filter((p) => !p.featured))];
	const pick = all.slice(0, all.length >= 6 ? 6 : Math.min(3, all.length));
	return ok(pick.map((p) => publicProject(db, p)));
});

/** Home stats: live projects, distinct contributor wallets, confirmed XLM. */
route("GET", "/stats", "public", () => {
	const { db, projects } = visible();
	const confirmed = projects.flatMap((p) => confirmedFor(db, p.id));
	return ok({
		projects: projects.length,
		contributors: new Set(confirmed.map((c) => c.sender_address)).size,
		contributions: confirmed.length,
		builders: new Set(projects.map((p: Project) => p.owner_user_id)).size,
	});
});

route("GET", "/projects/:slug", "public", ({ params }) => {
	const { db, p } = bySlug(params.slug!);
	return ok(publicProject(db, p));
});

/** Confirmed only, newest first (FR-CON-03). Sender addresses are public on-chain; the UI shortens them. */
route("GET", "/projects/:slug/contributions", "public", ({ params, query }) => {
	const { db, p } = bySlug(params.slug!);
	const list = confirmedFor(db, p.id).sort((a, b) =>
		(b.confirmed_at ?? b.created_at).localeCompare(a.confirmed_at ?? a.created_at),
	);
	const page = paginate(list, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 8));
	return ok({
		items: page.items.map((c) => ({
			id: c.id,
			sender_address: c.sender_address,
			amount: c.amount,
			asset_id: c.asset_id,
			tx_hash: c.tx_hash,
			confirmed_at: c.confirmed_at ?? c.created_at,
		})),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
	});
});

route("GET", "/projects/:slug/updates", "public", ({ params }) => {
	const { db, p } = bySlug(params.slug!);
	return ok(
		db.updates
			.filter((u) => u.project_id === p.id && u.visibility === "public")
			.sort((a, b) => b.created_at.localeCompare(a.created_at)),
	);
});
