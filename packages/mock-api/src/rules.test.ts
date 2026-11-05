import { beforeEach, describe, expect, it } from "vitest";
import { InvalidTransitionError, ReasonRequiredError } from "./model-rules";
import { read, resetMockDb } from "./db";
import { HttpError, TOKEN_PREFIX, dispatch } from "./router";
import { DEMO_ADMIN_EMAIL, DEMO_BUILDER_EMAIL } from "./seed";
import "./handlers";

/**
 * The PRD's "must never break" rules (docs/PLAN.md), proven against the mock backend the UI talks to:
 * role protection, owner checks, public visibility, confirmed-only totals, idempotent submits, moderation,
 * rate limits and the review state machine.
 */

type Res = { status_code: number; data: never };
const call = async (
	method: string,
	path: string,
	opts: { body?: Record<string, unknown>; token?: string; query?: Record<string, string> } = {},
) =>
	(await dispatch(
		method,
		path,
		new URLSearchParams(opts.query),
		opts.body ?? {},
		opts.token ? `Bearer ${opts.token}` : undefined,
	)) as Res;

async function status(p: Promise<unknown>) {
	try {
		await p;
		return 200;
	} catch (e) {
		if (e instanceof HttpError) return e.status;
		if (e instanceof InvalidTransitionError) return 409;
		if (e instanceof ReasonRequiredError) return 422;
		throw e;
	}
}

const tokenFor = (email: string) => `${TOKEN_PREFIX}${read().users.find((u) => u.email === email)!.id}.test`;
const WALLET = `G${"A".repeat(55)}`;
const OTHER_WALLET = `G${"B".repeat(55)}`;

beforeEach(() => resetMockDb());

describe("role protection (PRD §18 rule 2)", () => {
	it("refuses a builder token on admin endpoints", async () => {
		expect(await status(call("GET", "/admin/projects", { token: tokenFor(DEMO_BUILDER_EMAIL) }))).toBe(403);
		expect(await status(call("GET", "/admin/overview", { token: tokenFor(DEMO_BUILDER_EMAIL) }))).toBe(403);
	});

	it("refuses anonymous requests to builder and admin endpoints", async () => {
		expect(await status(call("GET", "/builder/projects"))).toBe(401);
		expect(await status(call("GET", "/admin/projects"))).toBe(401);
	});

	it("gives a builder 403 on another builder's project", async () => {
		const db = read();
		const demo = db.users.find((u) => u.email === DEMO_BUILDER_EMAIL)!;
		const someoneElses = db.projects.find((p) => p.owner_user_id !== demo.id)!;
		expect(await status(call("GET", `/builder/projects/${someoneElses.id}`, { token: tokenFor(DEMO_BUILDER_EMAIL) }))).toBe(403);
	});
});

describe("public visibility (FR-REV-05)", () => {
	it("lists only approved + published projects, without owner emails", async () => {
		const res = await call("GET", "/projects", { query: { limit: "50" } });
		const items = (res.data as { items: Record<string, unknown>[] }).items;
		const db = read();
		const slugs = db.projects.filter((p) => p.status === "approved" && p.visibility === "published").map((p) => p.slug);
		expect(items.map((p) => p.slug).sort()).toEqual(slugs.sort());
		for (const p of items) {
			expect(p).not.toHaveProperty("owner_user_id");
			expect(p).not.toHaveProperty("status");
			expect(p.contact_email).toBeNull();
		}
	});

	it("404s an unapproved project's slug", async () => {
		const pending = read().projects.find((p) => p.status === "under_review")!;
		expect(await status(call("GET", `/projects/${pending.slug}`))).toBe(404);
	});
});

describe("contributions (FR-CON-*)", () => {
	async function start(amount = "10") {
		const slug = read().projects.find((p) => p.status === "approved" && p.destination_address)!.slug;
		const res = await call("POST", "/contributions/intents", {
			body: { project_slug: slug, wallet_address: WALLET, asset_id: "xlm", amount },
		});
		return { slug, intent: res.data as { id: string; reference: string } };
	}

	it("rejects amounts under the minimum or with more than 7 decimals", async () => {
		const slug = read().projects.find((p) => p.status === "approved")!.slug;
		const bad = (amount: string) =>
			call("POST", "/contributions/intents", { body: { project_slug: slug, wallet_address: WALLET, asset_id: "xlm", amount } });
		expect(await status(bad("0.5"))).toBe(422);
		expect(await status(bad("1.12345678"))).toBe(422);
		expect(await status(bad("abc"))).toBe(422);
	});

	it("counts the same transaction hash once (idempotent submit)", async () => {
		const { intent } = await start();
		const hash = "a".repeat(64);
		const first = (await call("POST", `/contributions/intents/${intent.id}/submit`, { body: { tx_hash: hash } })).data as {
			id: string;
		};
		const second = (await call("POST", `/contributions/intents/${intent.id}/submit`, { body: { tx_hash: hash } })).data as {
			id: string;
		};
		expect(second.id).toBe(first.id);
		expect(read().contributions.filter((c) => c.tx_hash === hash)).toHaveLength(1);
	});

	it("never counts a pending contribution toward the raised total", async () => {
		const { slug, intent } = await start("500");
		const before = ((await call("GET", `/projects/${slug}`)).data as { raised_amount: string }).raised_amount;
		await call("POST", `/contributions/intents/${intent.id}/submit`, { body: { tx_hash: "b".repeat(64) } });
		const after = ((await call("GET", `/projects/${slug}`)).data as { raised_amount: string }).raised_amount;
		expect(after).toBe(before);
	});

	it("refuses contributions to a project that isn't live", async () => {
		const pending = read().projects.find((p) => p.status === "submitted")!;
		const res = call("POST", "/contributions/intents", {
			body: { project_slug: pending.slug, wallet_address: WALLET, asset_id: "xlm", amount: "5" },
		});
		expect(await status(res)).toBe(409);
	});
});

describe("suggestions + moderation (D8, FR-SUG-*)", () => {
	const slug = () => read().projects.find((p) => p.status === "approved")!.slug;
	const suggest = (wallet: string, n: number) =>
		call("POST", `/projects/${slug()}/suggestions`, {
			body: {
				wallet_address: wallet,
				type: "other",
				title: `Idea number ${n}`,
				body: "A suggestion long enough to pass the length rule.",
			},
		});

	it("keeps new suggestions out of the public list until published", async () => {
		const created = (await suggest(WALLET, 1)).data as { id: string; status: string };
		expect(created.status).toBe("pending_moderation");
		const list = (await call("GET", `/projects/${slug()}/suggestions`)).data as { items: { id: string }[] };
		expect(list.items.some((s) => s.id === created.id)).toBe(false);

		await call("POST", `/admin/suggestions/${created.id}/moderate`, {
			body: { action: "publish" },
			token: tokenFor(DEMO_ADMIN_EMAIL),
		});
		const after = (await call("GET", `/projects/${slug()}/suggestions`)).data as { items: { id: string }[] };
		expect(after.items.some((s) => s.id === created.id)).toBe(true);
	});

	it("allows 3 suggestions per wallet per hour, then 429", async () => {
		for (let n = 1; n <= 3; n++) expect(await status(suggest(OTHER_WALLET, n))).toBe(200);
		expect(await status(suggest(OTHER_WALLET, 4))).toBe(429);
	});

	it("stores markup as plain text (the UI never renders it as HTML)", async () => {
		const res = await call("POST", `/projects/${slug()}/suggestions`, {
			body: {
				wallet_address: WALLET,
				type: "other",
				title: "<img src=x onerror=alert(1)>",
				body: "<script>alert('x')</script> long enough body text",
			},
		});
		expect((res.data as { title: string }).title).toBe("<img src=x onerror=alert(1)>");
	});
});

describe("review state machine (PRD §18 rule 3)", () => {
	const admin = () => tokenFor(DEMO_ADMIN_EMAIL);

	it("requires a reason to reject or request changes", async () => {
		const p = read().projects.find((x) => x.status === "submitted")!;
		expect(await status(call("POST", `/admin/projects/${p.id}/decision`, { body: { decision: "reject" }, token: admin() }))).toBe(
			422,
		);
	});

	it("rejects transitions the state machine doesn't allow", async () => {
		const p = read().projects.find((x) => x.status === "rejected")!;
		expect(
			await status(call("POST", `/admin/projects/${p.id}/decision`, { body: { decision: "approve" }, token: admin() })),
		).toBe(409);
	});

	it("approving publishes the project and writes an audit entry", async () => {
		const p = read().projects.find((x) => x.status === "under_review")!;
		const before = read().audit.length;
		await call("POST", `/admin/projects/${p.id}/decision`, { body: { decision: "approve" }, token: admin() });
		const after = read().projects.find((x) => x.id === p.id)!;
		expect(after.status).toBe("approved");
		expect(after.visibility).toBe("published");
		expect(read().audit.length).toBe(before + 1);
		expect(await status(call("GET", `/projects/${p.slug}`))).toBe(200);
	});
});
