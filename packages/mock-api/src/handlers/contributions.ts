import type { ContributionDetail, ContributionIntent, WalletContributions } from "@repo/domain/types";
import { countsTowardTotal } from "@repo/domain/contribution-status";
import { compare, isValidAmount, subtract, sum } from "@repo/domain/money";
import { acceptsContributions } from "@repo/domain/project-status";
import { read, update, type MockContribution, type MockDb } from "../db";
import { HttpError, ok, route } from "../router";
import { DAY, hex, iso, paginate, uuid } from "../util";
import { ASSETS } from "./shared";

/**
 * /contributions/*: create intent (FR-CON-01), attach tx hash, read status. Contract: docs/API.md.
 *
 * Verification (FR-CON-02): the mock stands in for the backend worker. For a real Testnet tx it fetches the
 * transaction from Horizon and checks success, sender, destination, asset, amount and memo == intent.reference
 * before marking it confirmed. Unique on tx_hash, so a refresh never double-counts (FR-CON-05).
 * Demo-wallet payments are simulated: they settle to the outcome chosen in the Demo panel.
 */

const HORIZON = "https://horizon-testnet.stellar.org";
const INTENT_TTL_MS = 15 * 60 * 1000;
const MIN_AMOUNT = "1"; // D12
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const SETTLE_MS = { confirmed: 3500, failed: 3500, delayed: 25_000 } as const;
const SIM_FAILURE = "Stellar rejected the transaction (op_underfunded). Nothing was sent.";

function reference() {
	const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	return `CSP-${Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join("")}`;
}

function detail(db: MockDb, c: MockContribution): ContributionDetail {
	const intent = db.intents.find((i) => i.id === c.intent_id);
	const p = db.projects.find((x) => x.id === c.project_id);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { simulated, verify_attempts, reconcile_flag, ...rest } = c;
	return {
		...rest,
		reference: intent?.reference ?? "—",
		project: { id: c.project_id, slug: p?.slug ?? "", title: p?.title ?? "Removed project", logo_url: p?.logo_url ?? null },
		asset: ASSETS[c.asset_id] ?? ASSETS.xlm!,
		simulated: !!simulated,
	};
}

/** Runs before every mock request (adapter.ts): expires stale intents and settles simulated payments. */
export function settleContributions() {
	const db = read();
	const now = Date.now();
	const stale = db.intents.some(
		(i) => (i.status === "created" || i.status === "awaiting_wallet") && new Date(i.expires_at).getTime() < now,
	);
	const due = db.contributions.some((c) => c.status === "pending" && c.simulated && c.simulated.settle_at <= now);
	if (!stale && !due) return;
	update((d) => {
		for (const i of d.intents)
			if ((i.status === "created" || i.status === "awaiting_wallet") && new Date(i.expires_at).getTime() < now)
				i.status = "expired";
		for (const c of d.contributions) {
			if (c.status !== "pending" || !c.simulated || c.simulated.settle_at > now) continue;
			const failed = c.simulated.scenario === "failed";
			c.status = failed ? "failed" : "confirmed";
			c.failure_reason = failed ? SIM_FAILURE : null;
			c.confirmed_at = failed ? null : iso(now);
			c.ledger_or_event_ref = failed ? null : String(51_000_000 + Math.floor(Math.random() * 900_000));
			const intent = d.intents.find((i) => i.id === c.intent_id);
			if (intent) intent.status = c.status;
		}
	});
}

// ------------------------------------------------------------------ real Testnet verification

type HorizonOp = {
	type: string;
	from?: string;
	to?: string;
	amount?: string;
	asset_type?: string;
	asset_code?: string;
	asset_issuer?: string;
	source_account?: string;
};

async function verifyOnHorizon(c: MockContribution, intent: ContributionIntent) {
	let tx: { successful: boolean; memo?: string; memo_type?: string; ledger?: number; source_account?: string };
	try {
		const res = await fetch(`${HORIZON}/transactions/${c.tx_hash}`);
		if (res.status === 404) return { pending: true as const };
		if (!res.ok) return { pending: true as const };
		tx = await res.json();
	} catch {
		return { pending: true as const }; // Horizon unreachable: try again on the next poll
	}
	if (!tx.successful) return { failed: "The transaction failed on Stellar. Nothing was sent." };
	if (tx.memo_type !== "text" || tx.memo !== intent.reference)
		return { failed: "The payment’s memo didn’t match the contribution reference." };
	let ops: HorizonOp[] = [];
	try {
		const res = await fetch(`${HORIZON}/transactions/${c.tx_hash}/operations?limit=20`);
		ops = ((await res.json()) as { _embedded?: { records?: HorizonOp[] } })._embedded?.records ?? [];
	} catch {
		return { pending: true as const };
	}
	const asset = ASSETS[intent.asset_id]!;
	const pay = ops.find(
		(o) =>
			o.type === "payment" &&
			o.to === intent.destination_address &&
			(asset.issuer === null ? o.asset_type === "native" : o.asset_code === asset.code && o.asset_issuer === asset.issuer),
	);
	if (!pay) return { failed: "No payment to the project’s address in the right asset was found in this transaction." };
	if (compare(pay.amount ?? "0", intent.amount) !== 0)
		return { failed: `The amount sent (${pay.amount}) didn’t match the contribution (${intent.amount}).` };
	if ((pay.from ?? tx.source_account) !== intent.wallet_address)
		return { failed: "The payment came from a different wallet than the one that started it." };
	return { confirmed: String(tx.ledger ?? "") };
}

/** Verifies one pending real payment (at most every 4 s per contribution). */
async function verify(id: string) {
	const db = read();
	const c = db.contributions.find((x) => x.id === id);
	if (!c || c.status !== "pending" || c.simulated) return;
	const intent = db.intents.find((i) => i.id === c.intent_id);
	if (!intent) return;
	const outcome = await verifyOnHorizon(c, intent);
	if ("pending" in outcome) return;
	update((d) => {
		const x = d.contributions.find((y) => y.id === id)!;
		const i = d.intents.find((y) => y.id === x.intent_id);
		x.verify_attempts = (x.verify_attempts ?? 0) + 1;
		if ("confirmed" in outcome) {
			x.status = "confirmed";
			x.confirmed_at = iso(Date.now());
			x.ledger_or_event_ref = outcome.confirmed || null;
			x.reconcile_flag = null;
		} else {
			x.status = "failed";
			x.failure_reason = outcome.failed;
			x.reconcile_flag = outcome.failed;
		}
		if (i) i.status = x.status;
	});
}

// ------------------------------------------------------------------ intents

route("POST", "/contributions/intents", "public", ({ body }) => {
	const slug = String(body.project_slug ?? "");
	const wallet = String(body.wallet_address ?? "").trim();
	const assetId = String(body.asset_id ?? "");
	const amount = String(body.amount ?? "").trim();
	if (!STELLAR_ADDRESS.test(wallet)) throw new HttpError(422, "Connect a Stellar wallet first.", { field: "wallet_address" });
	const asset = ASSETS[assetId];
	if (!asset) throw new HttpError(422, "Choose XLM or USDC.", { field: "asset_id" });
	if (!isValidAmount(amount)) throw new HttpError(422, "Enter an amount with up to 7 decimal places.", { field: "amount" });
	if (compare(amount, MIN_AMOUNT) < 0)
		throw new HttpError(422, `The minimum is ${MIN_AMOUNT} ${asset.code}.`, { field: "amount" });

	const intent = update((db) => {
		const p = db.projects.find((x) => x.slug === slug);
		if (!p || !acceptsContributions(p)) throw new HttpError(409, "This project isn’t accepting contributions right now.");
		const i: ContributionIntent = {
			id: uuid(),
			project_id: p.id,
			wallet_address: wallet,
			asset_id: asset.id,
			amount,
			reference: reference(),
			destination_address: p.destination_address!,
			status: "created",
			expires_at: iso(Date.now() + INTENT_TTL_MS),
			created_at: iso(Date.now()),
		};
		db.intents.push(i);
		return i;
	});
	return ok({ ...intent, asset }, "Contribution started", 201);
});

/**
 * Attaches the signed transaction's hash (or, for the Demo wallet, a simulated one). Idempotent on tx_hash:
 * submitting the same hash twice returns the same contribution, counted once (FR-CON-05).
 */
route("POST", "/contributions/intents/:id/submit", "public", ({ params, body }) => {
	const simulated = body.simulated === true;
	const scenario = (["confirmed", "failed", "delayed"] as const).find((s) => s === body.scenario) ?? "confirmed";
	const hash = simulated ? hex(64) : String(body.tx_hash ?? "").toLowerCase();
	if (!simulated && !/^[0-9a-f]{64}$/.test(hash)) throw new HttpError(422, "That doesn’t look like a Stellar transaction hash.");

	const result = update((db) => {
		const existing = db.contributions.find((c) => c.tx_hash === hash);
		if (existing) return detail(db, existing);
		const intent = db.intents.find((i) => i.id === params.id);
		if (!intent) throw new HttpError(404, "Contribution not found.");
		if (intent.status === "cancelled") throw new HttpError(409, "This contribution was cancelled. Start a new one.");
		if (intent.status === "expired" && !simulated)
			// A real payment may still have gone through: record it anyway so it can be verified.
			intent.status = "pending";
		const now = Date.now();
		const c: MockContribution = {
			id: uuid(),
			project_id: intent.project_id,
			intent_id: intent.id,
			tx_hash: hash,
			network: "testnet",
			sender_address: intent.wallet_address,
			destination_or_contract: intent.destination_address,
			asset_id: intent.asset_id,
			amount: intent.amount,
			ledger_or_event_ref: null,
			status: "pending",
			failure_reason: null,
			created_at: iso(now),
			confirmed_at: null,
			...(simulated ? { simulated: { scenario, settle_at: now + SETTLE_MS[scenario] } } : {}),
		};
		intent.status = "pending";
		db.contributions.push(c);
		return detail(db, c);
	});
	return ok(result, "Sent. Waiting for confirmation on Stellar", 201);
});

route("POST", "/contributions/intents/:id/cancel", "public", ({ params }) =>
	ok(
		update((db) => {
			const i = db.intents.find((x) => x.id === params.id);
			if (!i) throw new HttpError(404, "Contribution not found.");
			if (i.status === "created" || i.status === "awaiting_wallet") i.status = "cancelled";
			return i;
		}),
	),
);

/** The status page polls this every 4 s until the contribution is final. */
route("GET", "/contributions/:id", "public", async ({ params }) => {
	await verify(params.id!);
	const db = read();
	const c = db.contributions.find((x) => x.id === params.id);
	if (!c) throw new HttpError(404, "We couldn’t find that contribution.");
	return ok(detail(db, c));
});

// ------------------------------------------------------------------ a wallet's history (contributor page)

/** Mock: a first-time Demo wallet gets a short history, so the contributor page has something to show. */
function seedDemoHistory(wallet: string) {
	update((db) => {
		if (db.seededContributionWallets.includes(wallet)) return;
		db.seededContributionWallets.push(wallet);
		const live = db.projects.filter((p) => acceptsContributions(p));
		const plan: { days: number; amount: string; status: "confirmed" | "failed"; asset?: string }[] = [
			{ days: 118, amount: "150", status: "confirmed" },
			{ days: 74, amount: "40", status: "confirmed" },
			{ days: 31, amount: "250", status: "confirmed" },
			{ days: 12, amount: "25", status: "failed" },
			{ days: 4, amount: "75", status: "confirmed" },
			{ days: 1.2, amount: "20", status: "confirmed", asset: "usdc" },
		];
		plan.forEach((s, n) => {
			const p = live[n % live.length];
			if (!p) return;
			const at = Date.now() - s.days * DAY;
			const intent: ContributionIntent = {
				id: uuid(),
				project_id: p.id,
				wallet_address: wallet,
				asset_id: s.asset ?? "xlm",
				amount: `${s.amount}.0000000`,
				reference: reference(),
				destination_address: p.destination_address!,
				status: s.status,
				expires_at: iso(at + INTENT_TTL_MS),
				created_at: iso(at),
			};
			db.intents.push(intent);
			db.contributions.push({
				id: uuid(),
				project_id: p.id,
				intent_id: intent.id,
				tx_hash: hex(64),
				network: "testnet",
				sender_address: wallet,
				destination_or_contract: intent.destination_address,
				asset_id: intent.asset_id,
				amount: intent.amount,
				ledger_or_event_ref: s.status === "confirmed" ? String(50_000_000 + Math.floor(Math.random() * 900_000)) : null,
				status: s.status,
				failure_reason: s.status === "failed" ? SIM_FAILURE : null,
				created_at: iso(at),
				confirmed_at: s.status === "confirmed" ? iso(at + 6000) : null,
				simulated: { scenario: s.status, settle_at: at },
			});
		});
	});
}

route("GET", "/contributions", "public", async ({ query }) => {
	const wallet = String(query.get("wallet") ?? "").trim();
	if (!STELLAR_ADDRESS.test(wallet)) throw new HttpError(422, "Connect a wallet to see its contributions.");
	if (query.get("demo") === "1") seedDemoHistory(wallet);
	// Check up to 3 pending real payments, so the list doesn't lag behind Stellar.
	const pending = read()
		.contributions.filter((c) => c.sender_address === wallet && c.status === "pending" && !c.simulated)
		.slice(0, 3);
	await Promise.all(pending.map((c) => verify(c.id)));

	const db = read();
	const mine = db.contributions
		.filter((c) => c.sender_address === wallet)
		.sort((a, b) => b.created_at.localeCompare(a.created_at));
	const confirmed = mine.filter((c) => countsTowardTotal(c.status));
	const status = query.get("status");
	const asset = query.get("asset");
	const filtered = mine.filter(
		(c) =>
			(!status ||
				status === "all" ||
				(status === "pending"
					? c.status === "pending"
					: status === "failed"
						? c.status === "failed" || c.status === "expired" || c.status === "cancelled"
						: c.status === status)) &&
			(!asset || c.asset_id === asset),
	);
	const page = paginate(filtered, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 8));

	const total_sent: Record<string, string> = {};
	for (const id of Object.keys(ASSETS)) {
		const list = confirmed.filter((c) => c.asset_id === id);
		if (list.length) total_sent[ASSETS[id]!.code] = sum(list.map((c) => c.amount));
	}
	const now = new Date();
	const monthly = Array.from({ length: 6 }, (_, k) => {
		const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
		const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
		const inMonth = confirmed.filter((c) => {
			const t = new Date(c.confirmed_at ?? c.created_at).getTime();
			return c.asset_id === "xlm" && t >= d.getTime() && t < next.getTime();
		});
		return {
			month: d.toISOString().slice(0, 7),
			label: d.toLocaleDateString("en-US", { month: "short" }),
			amount: sum(inMonth.map((c) => c.amount)),
		};
	});
	const byProject = new Map<string, { amount: string[]; count: number }>();
	for (const c of confirmed.filter((x) => x.asset_id === "xlm")) {
		const e = byProject.get(c.project_id) ?? { amount: [], count: 0 };
		e.amount.push(c.amount);
		e.count++;
		byProject.set(c.project_id, e);
	}
	const data: WalletContributions = {
		items: page.items.map((c) => detail(db, c)),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		summary: {
			total_sent,
			confirmed_count: confirmed.length,
			pending_count: mine.filter((c) => c.status === "pending").length,
			failed_count: mine.filter((c) => c.status === "failed").length,
			projects_supported: new Set(confirmed.map((c) => c.project_id)).size,
			first_at: mine.at(-1)?.created_at ?? null,
			last_at: mine[0]?.created_at ?? null,
			monthly,
			by_project: [...byProject.entries()]
				.map(([id, e]) => {
					const p = db.projects.find((x) => x.id === id);
					return {
						project: { id, slug: p?.slug ?? "", title: p?.title ?? "Removed project", logo_url: p?.logo_url ?? null },
						amount: sum(e.amount),
						count: e.count,
					};
				})
				.sort((a, b) => compare(b.amount, a.amount)),
		},
	};
	return ok(data);
});

/** Mock only: the Demo wallet's simulated balances (10,000 XLM + 500 USDC, minus what it has sent). */
route("GET", "/mock/demo-balance", "public", ({ query }) => {
	const wallet = String(query.get("wallet") ?? "");
	const sent = read().contributions.filter(
		(c) => c.sender_address === wallet && (c.status === "confirmed" || c.status === "pending"),
	);
	const left = (id: string, start: string) => {
		const spent = sum(sent.filter((c) => c.asset_id === id).map((c) => c.amount));
		return subtract(start, spent);
	};
	return ok({
		balances: [
			{ asset: ASSETS.xlm, balance: left("xlm", "10000"), reserve: "1.5" },
			{ asset: ASSETS.usdc, balance: left("usdc", "500"), reserve: null },
		],
		simulated: true,
	});
});
