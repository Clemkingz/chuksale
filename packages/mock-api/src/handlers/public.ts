import { sum } from "@repo/domain/money";
import { read, update } from "../db";
import { HttpError, invalid, ok, route } from "../router";
import { ASSETS, NETWORK, boolParam, cardDto, event, isAddress, isPublic, page, publicProjectDto, shortAddress } from "../common";

/** Public routes: network, account lookup, categories, discovery, the project page and its public lists. */

route("GET", "/stellar/network", "public", () => ok(NETWORK, "Stellar network"));

/**
 * Account lookup. Mock: every valid address "exists" with simulated balances (XLM always; USDC trusted unless the
 * address ends in a vowel, so both states can be seen). Spending in the mock lowers nothing: balances are fixed.
 */
route("GET", "/stellar/accounts/:address", "public", ({ params }) => {
	if (!isAddress(params.address)) throw invalid(["address must be a Stellar public key (G…)"]);
	const a = params.address!;
	const usdcTrusted = !/[AEIOU]$/.test(a);
	const spent = (assetId: string) =>
		sum(
			read()
				.contributions.filter((c) => c.contributorAddress === a && c.assetId === assetId && c.status === "confirmed")
				.map((c) => c.amount),
		);
	return ok(
		{
			address: a,
			shortAddress: shortAddress(a),
			exists: true,
			explorerUrl: `${NETWORK.explorerUrl}/account/${a}`,
			assets: ASSETS.map((x) => ({
				...x,
				trusted: x.native || usdcTrusted,
				balance: x.native
					? subtractFixed("9999.9999900", spent(x.id))
					: usdcTrusted
						? subtractFixed("500.0000000", spent(x.id))
						: null,
			})),
		},
		"Stellar account",
	);
});

function subtractFixed(a: string, b: string) {
	const toS = (v: string) => {
		const [w, f = ""] = v.split(".");
		return BigInt(w!) * 10_000_000n + BigInt(f.padEnd(7, "0").slice(0, 7));
	};
	const d = toS(a) - toS(b);
	const v = d < 0n ? 0n : d;
	return `${v / 10_000_000n}.${(v % 10_000_000n).toString().padStart(7, "0")}`;
}

route("GET", "/categories", "public", () => {
	const db = read();
	return ok(
		db.categories
			.filter((c) => c.isActive)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((c) => ({
				id: c.id,
				name: c.name,
				slug: c.slug,
				publishedProjectCount: db.projects.filter((p) => p.categoryId === c.id && isPublic(db, p)).length,
			})),
		"Categories retrieved",
	);
});

route("GET", "/projects", "public", ({ query }) => {
	const db = read();
	const q = (query.get("q") ?? "").trim().toLowerCase();
	const sort = query.get("sort") ?? "featured";
	if (!["featured", "newest", "title"].includes(sort)) throw invalid(["sort must be one of: featured, newest, title"]);
	let list = db.projects.filter((p) => isPublic(db, p)).map((p) => cardDto(db, p));
	if (q)
		list = list.filter((p) =>
			`${p.title} ${p.summary} ${p.builder.displayName ?? ""} ${p.builder.organizationName ?? ""}`.toLowerCase().includes(q),
		);
	if (query.get("category")) list = list.filter((p) => p.category.slug === query.get("category"));
	if (query.get("stage")) list = list.filter((p) => p.stage === query.get("stage"));
	if (query.get("type")) list = list.filter((p) => p.type === query.get("type"));
	if (boolParam(query, "featured") !== undefined) list = list.filter((p) => p.featured === boolParam(query, "featured"));
	if (boolParam(query, "fundraising") === true) list = list.filter((p) => p.fundraisingEnabled);
	if (query.get("asset")) list = list.filter((p) => p.funding?.acceptedAssets.some((a) => a.id === query.get("asset")));
	list.sort((a, b) =>
		sort === "title"
			? a.title.localeCompare(b.title)
			: sort === "newest"
				? b.publishedAt.localeCompare(a.publishedAt)
				: Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt),
	);
	return ok(page(list, query), "Projects retrieved");
});

/** The project page. Counts a view each time (like the API). */
route("GET", "/projects/:slug", "public", ({ params }) =>
	update((db) => {
		const p = db.projects.find((x) => x.slug === params.slug && isPublic(db, x));
		if (!p) throw new HttpError(404, "Project not found");
		event(db, "project_viewed", { projectId: p.id });
		return ok(publicProjectDto(db, p), "Project retrieved");
	}),
);

route("GET", "/projects/:slug/contributions", "public", ({ params, query }) => {
	const db = read();
	const p = db.projects.find((x) => x.slug === params.slug && isPublic(db, x));
	if (!p) throw new HttpError(404, "Project not found");
	const list = db.contributions
		.filter((c) => c.projectId === p.id && c.status === "confirmed")
		.sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""))
		.map((c) => ({
			id: c.id,
			contributor: shortAddress(c.contributorAddress),
			asset: ASSETS.find((a) => a.id === c.assetId)!,
			amount: c.amount,
			txHash: c.txHash,
			explorerUrl: `${NETWORK.explorerUrl}/tx/${c.txHash}`,
			confirmedAt: c.confirmedAt!,
		}));
	return ok(page(list, query), "Contributions retrieved");
});

route("GET", "/projects/:slug/suggestions", "public", ({ params, query }) => {
	const db = read();
	const p = db.projects.find((x) => x.slug === params.slug && isPublic(db, x));
	if (!p) throw new HttpError(404, "Project not found");
	const type = query.get("type");
	const list = db.suggestions
		.filter((s) => s.projectId === p.id && s.status === "published" && (!type || s.type === type))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.map((s) => ({
			id: s.id,
			type: s.type,
			title: s.title,
			body: s.body,
			link: s.link,
			author: shortAddress(s.walletAddress),
			createdAt: s.createdAt,
		}));
	return ok(page(list, query), "Suggestions retrieved");
});
