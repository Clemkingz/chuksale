import { beforeEach, describe, expect, it } from "vitest";
import type { AuthTokens, Page, Project, PublicProject, PublicProjectCard } from "@repo/domain/types";
import { read, resetMockDb } from "./db";
import { HttpError, dispatch } from "./router";
import { DEMO_ADMIN_EMAIL, DEMO_BUILDER_EMAIL } from "./seed";
import "./handlers";

/**
 * The live API's rules, proven against the mock the apps use in mock mode: roles, public visibility, submit
 * validation, the review actions, single-use refresh tokens, wallet sign-in, confirmed-only totals and moderation.
 */

type Env<T> = { statusCode: number; data: T };
const call = async <T = unknown>(
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
	)) as Env<T>;

async function status(p: Promise<unknown>) {
	try {
		await p;
		return 200;
	} catch (e) {
		if (e instanceof HttpError) return e.status;
		throw e;
	}
}

async function errorOf(p: Promise<unknown>) {
	try {
		await p;
	} catch (e) {
		if (e instanceof HttpError) return e;
	}
	throw new Error("expected an error");
}

const login = async (email: string) =>
	(await call<AuthTokens>("POST", "/auth/login", { body: { email, password: "Password1" } })).data;

async function connectWallet(address: string) {
	const ch = (await call<{ transaction: string }>("POST", "/wallet-auth/challenge", { body: { address } })).data;
	return (
		await call<{ walletToken: string }>("POST", "/wallet-auth/verify", { body: { transaction: `demo-signed:${ch.transaction}` } })
	).data.walletToken;
}

const WALLET = `G${"B".repeat(55)}`;

beforeEach(() => resetMockDb());

describe("auth", () => {
	it("routes on role and keeps refresh tokens single use", async () => {
		const t = await login(DEMO_BUILDER_EMAIL);
		expect(t.role).toBe("builder");
		expect((await login(DEMO_ADMIN_EMAIL)).role).toBe("admin");
		const next = (await call<AuthTokens>("POST", "/auth/refresh", { body: { refreshToken: t.refreshToken } })).data;
		expect(next.refreshToken).not.toBe(t.refreshToken);
		expect(await status(call("POST", "/auth/refresh", { body: { refreshToken: t.refreshToken } }))).toBe(401);
	});

	it("says 401 for a wrong password and 403 for an unverified email", async () => {
		expect(await status(call("POST", "/auth/login", { body: { email: DEMO_BUILDER_EMAIL, password: "nope12345" } }))).toBe(401);
		await call("POST", "/auth/register", { body: { name: "New Builder", email: "new@demo.local", password: "longenough" } });
		const e = await errorOf(call("POST", "/auth/login", { body: { email: "new@demo.local", password: "longenough" } }));
		expect([e.status, e.message]).toEqual([403, "Email not verified"]);
	});

	it("returns validation details one line per problem", async () => {
		const e = await errorOf(call("POST", "/auth/register", { body: { email: "bad" } }));
		expect(e.status).toBe(400);
		expect(e.details).toContain("email must be an email");
	});
});

describe("roles", () => {
	it("gives builders 403 on admin routes and admins 403 on builder routes", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const a = await login(DEMO_ADMIN_EMAIL);
		expect(await status(call("GET", "/admin/projects", { token: b.accessToken }))).toBe(403);
		expect(await status(call("GET", "/builder/projects", { token: a.accessToken }))).toBe(403);
		expect(await status(call("GET", "/builder/projects"))).toBe(401);
	});

	it("hides another builder's project (404)", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const db = read();
		const demo = db.users.find((u) => u.email === DEMO_BUILDER_EMAIL)!;
		const other = db.projects.find((p) => p.ownerId !== demo.id)!;
		expect(await status(call("GET", `/builder/projects/${other.id}`, { token: b.accessToken }))).toBe(404);
	});
});

describe("public visibility", () => {
	it("lists only approved and published projects", async () => {
		const page = (await call<Page<PublicProjectCard>>("GET", "/projects", { query: { limit: "100" } })).data;
		const db = read();
		const live = db.projects.filter((p) => p.status === "approved" && p.published).map((p) => p.slug);
		expect(page.result.map((p) => p.slug).sort()).toEqual(live.sort());
		expect(page.paginationMeta.totalCount).toBe(live.length);
	});

	it("404s a project in review and never shows owner emails", async () => {
		const pending = read().projects.find((p) => p.status === "submitted")!;
		expect(await status(call("GET", `/projects/${pending.slug ?? "x"}`))).toBe(404);
		const live = read().projects.find((p) => p.status === "approved")!;
		const page = (await call<PublicProject>("GET", `/projects/${live.slug}`)).data;
		expect(JSON.stringify(page)).not.toContain("@demo.local");
	});

	it("refuses limits over 100", async () => {
		expect(await status(call("GET", "/projects", { query: { limit: "500" } }))).toBe(400);
	});
});

describe("builder projects", () => {
	it("creates a draft and lists what's missing on submit, in form order", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const p = (
			await call<Project>("POST", "/builder/projects", { token: b.accessToken, body: { type: "new_idea", title: "Market Pay" } })
		).data;
		expect(p.status).toBe("draft");
		expect(p.permissions).toEqual({ canEdit: true, canSubmit: true, canDelete: true });
		const e = await errorOf(call("POST", `/builder/projects/${p.id}/submit`, { token: b.accessToken }));
		expect(e.status).toBe(400);
		expect(e.details?.[0]).toMatch(/^summary/);
		expect(e.details).toContain("teamMembers must list at least one person");
	});

	it("rejects unknown fields and locks a submitted project", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const p = (
			await call<Project>("POST", "/builder/projects", { token: b.accessToken, body: { type: "new_idea", title: "Thing" } })
		).data;
		expect(await status(call("PATCH", `/builder/projects/${p.id}`, { token: b.accessToken, body: { logo: "x" } }))).toBe(400);
		const inReview = read().projects.find(
			(x) => x.status === "under_review" && read().users.find((u) => u.id === x.ownerId)?.email === DEMO_BUILDER_EMAIL,
		)!;
		expect(
			await status(call("PATCH", `/builder/projects/${inReview.id}`, { token: b.accessToken, body: { title: "New title" } })),
		).toBe(409);
	});
});

describe("review actions", () => {
	it("needs a reason to reject, and answers 409 to an action that doesn't fit", async () => {
		const a = await login(DEMO_ADMIN_EMAIL);
		const submitted = read().projects.find((p) => p.status === "submitted")!;
		expect(
			await status(call("POST", `/admin/projects/${submitted.id}/actions`, { token: a.accessToken, body: { action: "reject" } })),
		).toBe(400);
		const rejected = read().projects.find((p) => p.status === "rejected")!;
		expect(
			await status(call("POST", `/admin/projects/${rejected.id}/actions`, { token: a.accessToken, body: { action: "approve" } })),
		).toBe(409);
	});

	it("approving publishes with a slug, notifies the builder and writes the audit log", async () => {
		const a = await login(DEMO_ADMIN_EMAIL);
		const p = read().projects.find((x) => x.status === "submitted")!;
		const before = read().audit.length;
		await call("POST", `/admin/projects/${p.id}/actions`, { token: a.accessToken, body: { action: "approve" } });
		const after = read().projects.find((x) => x.id === p.id)!;
		expect([after.status, after.published, !!after.slug]).toEqual(["approved", true, true]);
		expect(read().audit.length).toBe(before + 1);
		expect(
			read().notifications.some((n) => n.userId === p.ownerId && n.type === "project_approved" && n.projectId === p.id),
		).toBe(true);
		expect(await status(call("GET", `/projects/${after.slug}`))).toBe(200);
	});
});

describe("contributions", () => {
	it("needs a wallet session, prepares, and never counts a pending payment", async () => {
		const live = read().projects.find(
			(p) => p.status === "approved" && p.fundraisingEnabled && p.acceptedAssetIds.includes("XLM"),
		)!;
		expect(await status(call("POST", `/projects/${live.slug}/contributions`, { body: { assetId: "XLM", amount: "5" } }))).toBe(
			401,
		);
		const wt = await connectWallet(WALLET);
		const prep = (
			await call<{ id: string; status: string; transaction: string }>("POST", `/projects/${live.slug}/contributions`, {
				token: wt,
				body: { assetId: "XLM", amount: "5" },
			})
		).data;
		expect(prep.status).toBe("awaiting_signature");
		const raisedBefore = (await call<PublicProject>("GET", `/projects/${live.slug}`)).data.funding!.raised.find(
			(r) => r.asset.id === "XLM",
		)!.amount;
		const sub = (
			await call<{ status: string }>("POST", `/contributions/${prep.id}/submit`, {
				token: wt,
				body: { transaction: `demo-signed:${prep.transaction}` },
			})
		).data;
		expect(sub.status).toBe("pending");
		const raisedAfter = (await call<PublicProject>("GET", `/projects/${live.slug}`)).data.funding!.raised.find(
			(r) => r.asset.id === "XLM",
		)!.amount;
		expect(raisedAfter).toBe(raisedBefore);
	});

	it("refuses an asset the project doesn't accept and a wrong signed transaction", async () => {
		const xlmOnly = read().projects.find(
			(p) => p.status === "approved" && p.acceptedAssetIds.length === 1 && p.acceptedAssetIds[0] === "XLM",
		)!;
		const wt = await connectWallet(WALLET);
		const usdc = read()
			.projects.find((p) => p.acceptedAssetIds.some((a) => a.startsWith("USDC")))!
			.acceptedAssetIds.find((a) => a.startsWith("USDC"))!;
		expect(
			await status(call("POST", `/projects/${xlmOnly.slug}/contributions`, { token: wt, body: { assetId: usdc, amount: "5" } })),
		).toBe(400);
		const prep = (
			await call<{ id: string }>("POST", `/projects/${xlmOnly.slug}/contributions`, {
				token: wt,
				body: { assetId: "XLM", amount: "5" },
			})
		).data;
		expect(
			await status(call("POST", `/contributions/${prep.id}/submit`, { token: wt, body: { transaction: "something-else" } })),
		).toBe(400);
	});
});

describe("suggestions and moderation", () => {
	it("keeps new suggestions private until approved, and refuses a duplicate report", async () => {
		const live = read().projects.find((p) => p.status === "approved")!;
		const wt = await connectWallet(WALLET);
		const s = (
			await call<{ id: string; status: string }>("POST", `/projects/${live.slug}/suggestions`, {
				token: wt,
				body: { type: "other", title: "A useful idea", body: "A suggestion long enough to pass the rule." },
			})
		).data;
		expect(s.status).toBe("pending");
		const list = async () => (await call<Page<{ id: string }>>("GET", `/projects/${live.slug}/suggestions`)).data.result;
		expect((await list()).some((x) => x.id === s.id)).toBe(false);
		const a = await login(DEMO_ADMIN_EMAIL);
		expect(
			await status(call("POST", `/admin/suggestions/${s.id}/actions`, { token: a.accessToken, body: { action: "hide" } })),
		).toBe(400);
		await call("POST", `/admin/suggestions/${s.id}/actions`, { token: a.accessToken, body: { action: "approve" } });
		expect((await list()).some((x) => x.id === s.id)).toBe(true);

		const other = await connectWallet(`G${"C".repeat(55)}`);
		await call("POST", `/suggestions/${s.id}/reports`, { token: other, body: { reason: "spam" } });
		expect(await status(call("POST", `/suggestions/${s.id}/reports`, { token: other, body: { reason: "spam" } }))).toBe(409);
	});

	it("stores markup as plain text", async () => {
		const live = read().projects.find((p) => p.status === "approved")!;
		const wt = await connectWallet(WALLET);
		const s = (
			await call<{ title: string }>("POST", `/projects/${live.slug}/suggestions`, {
				token: wt,
				body: { type: "other", title: "<img src=x onerror=alert(1)>", body: "<script>alert('x')</script> long enough body text" },
			})
		).data;
		expect(s.title).toBe("<img src=x onerror=alert(1)>");
	});
});

describe("funding deadlines, updates and wallet inbox", () => {
	it("refuses contributions once funding has ended and says so on the project", async () => {
		const ended = read().projects.find(
			(p) => p.fundingEndsAt && Date.parse(p.fundingEndsAt) < Date.now() && p.status === "approved",
		)!;
		const page = (await call<PublicProject>("GET", `/projects/${ended.slug}`)).data;
		expect(page.funding?.ended).toBe(true);
		const wt = await connectWallet(WALLET);
		expect(
			await status(call("POST", `/projects/${ended.slug}/contributions`, { token: wt, body: { assetId: "XLM", amount: "5" } })),
		).toBe(409);
	});

	it("publishes updates at once, notifies backers, and hides removed ones", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const solar = read().projects.find((p) => p.title === "Solar Schools Initiative")!;
		const backer = read().contributions.find((c) => c.projectId === solar.id && c.status === "confirmed")!.contributorAddress;
		expect(
			await status(
				call("POST", `/builder/projects/${solar.id}/updates`, { token: b.accessToken, body: { title: "Hi", body: "short" } }),
			),
		).toBe(400);
		const u = (
			await call<{ id: string }>("POST", `/builder/projects/${solar.id}/updates`, {
				token: b.accessToken,
				body: { title: "Ten more classrooms lit", body: "Ten more kits went in this week across two districts." },
			})
		).data;
		const list = async () =>
			(await call<Page<{ id: string }>>("GET", `/projects/${solar.slug}/updates`)).data.result.map((x) => x.id);
		expect(await list()).toContain(u.id);
		expect(read().walletNotifications.some((n) => n.address === backer && n.type === "project_update")).toBe(true);

		const a = await login(DEMO_ADMIN_EMAIL);
		await call("POST", `/admin/project-updates/${u.id}/remove`, {
			token: a.accessToken,
			body: { reason: "Off topic for an update." },
		});
		expect(await list()).not.toContain(u.id);
		expect(
			await status(
				call("PATCH", `/builder/projects/${solar.id}/updates/${u.id}`, { token: b.accessToken, body: { title: "Edited title" } }),
			),
		).toBe(409);
	});

	it("only lets a builder post updates on an approved project", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const draft = read().projects.find((p) => p.status === "draft")!;
		expect(
			await status(
				call("POST", `/builder/projects/${draft.id}/updates`, {
					token: b.accessToken,
					body: { title: "A new update", body: "Something long enough to pass the rule." },
				}),
			),
		).toBe(409);
	});

	it("links a builder wallet with a live wallet token, one builder per wallet", async () => {
		const b = await login(DEMO_BUILDER_EMAIL);
		const wt = await connectWallet(WALLET);
		const me = (
			await call<{ profile: { walletAddress: string } }>("PUT", "/auth/me/wallet", {
				token: b.accessToken,
				body: { walletToken: wt },
			})
		).data;
		expect(me.profile.walletAddress).toBe(WALLET);
		expect(await status(call("PUT", "/auth/me/wallet", { token: b.accessToken, body: { walletToken: "nope" } }))).toBe(401);
	});

	it("tells the wallet when its suggestion is published", async () => {
		const live = read().projects.find((p) => p.status === "approved")!;
		const wt = await connectWallet(WALLET);
		const s = (
			await call<{ id: string }>("POST", `/projects/${live.slug}/suggestions`, {
				token: wt,
				body: { type: "other", title: "A useful idea", body: "A suggestion long enough to pass the rule." },
			})
		).data;
		const a = await login(DEMO_ADMIN_EMAIL);
		await call("POST", `/admin/suggestions/${s.id}/actions`, { token: a.accessToken, body: { action: "approve" } });
		const count = (await call<{ count: number }>("GET", "/wallet/notifications/unread-count", { token: wt })).data.count;
		expect(count).toBe(1);
	});
});
