import { compare, isValidAmount, sum } from "@repo/domain/money";
import { getControls } from "../controls";
import { read, update } from "../db";
import type { ContributionRec, MockDb } from "../records";
import { HttpError, NoContent, invalid, ok, route } from "../router";
import { hex, uuid } from "../util";
import {
	NETWORK,
	adminContributionDto,
	assetById,
	audit,
	contributionDto,
	event,
	isAddress,
	isPublic,
	notifyUser,
	now,
	page,
	shortAddress,
	targetReached,
} from "../common";

/**
 * Wallet sign-in (SEP-10) and contributions (backend guide). Mock rules: only the Demo wallet can sign (its
 * signature is the marker "demo-signed:<xdr>"); a submitted payment settles a moment later to the outcome chosen in
 * the Demo panel. Totals only ever count confirmed contributions.
 */

const WALLET_HOURS = 12;

route("POST", "/wallet-auth/challenge", "public", ({ body }) => {
	if (!isAddress(body.address)) throw invalid(["address must be a Stellar public key"]);
	return update((db) => {
		const nonce = uuid();
		const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
		db.challenges.push({ nonce, address: body.address as string, expiresAt });
		return ok(
			{ transaction: `mock-challenge:${nonce}`, networkPassphrase: NETWORK.networkPassphrase, homeDomain: "chucksales.mock", expiresAt },
			"Challenge issued",
		);
	});
});

route("POST", "/wallet-auth/verify", "public", ({ body }) =>
	update((db) => {
		const tx = typeof body.transaction === "string" ? body.transaction : "";
		const m = /^demo-signed:mock-challenge:(.+)$/.exec(tx);
		const ch = m ? db.challenges.find((c) => c.nonce === m[1]) : undefined;
		if (!m) throw new HttpError(401, "The wallet did not sign this challenge with its own key");
		if (!ch) throw new HttpError(401, "This challenge was already used or never issued");
		db.challenges = db.challenges.filter((c) => c !== ch);
		if (Date.parse(ch.expiresAt) < Date.now()) throw new HttpError(401, "The challenge expired. Start again");
		const expiresAt = new Date(Date.now() + WALLET_HOURS * 3_600_000).toISOString();
		const walletToken = `mock.wt.${uuid()}`;
		db.walletSessions.push({ token: walletToken, address: ch.address, expiresAt });
		event(db, "wallet_connected", { wallet: ch.address });
		return ok(
			{
				walletToken,
				tokenType: "Bearer",
				expiresIn: WALLET_HOURS * 3600,
				address: ch.address,
				shortAddress: shortAddress(ch.address),
				networkPassphrase: NETWORK.networkPassphrase,
				expiresAt,
			},
			"Wallet connected",
		);
	}),
);

route("GET", "/wallet-auth/session", "wallet", ({ wallet }) => {
	const s = read().walletSessions.find((w) => w.address === wallet)!;
	return ok({ address: wallet, shortAddress: shortAddress(wallet!), networkPassphrase: NETWORK.networkPassphrase, expiresAt: s.expiresAt }, "Wallet session");
});

route("POST", "/wallet-auth/logout", "wallet", ({ wallet }) => {
	update((db) => {
		db.walletSessions = db.walletSessions.filter((w) => w.address !== wallet);
	});
	return new NoContent();
});

// ---------------------------------------------------------------- contributions

const prepared = (db: MockDb, c: ContributionRec) => ({
	...contributionDto(db, c),
	transaction: `mock-tx:${c.id}`,
	networkPassphrase: NETWORK.networkPassphrase,
	network: NETWORK.network,
});

/** Mock balances (same rule as /stellar/accounts): XLM 9,999.99999; USDC 500 if trusted (address not ending in a vowel). */
function balance(db: MockDb, address: string, assetId: string) {
	const usdcTrusted = !/[AEIOU]$/.test(address);
	const asset = assetById(assetId)!;
	if (!asset.native && !usdcTrusted) return null;
	const start = asset.native ? "9999.9999900" : "500.0000000";
	const spent = sum(db.contributions.filter((c) => c.contributorAddress === address && c.assetId === assetId && c.status === "confirmed").map((c) => c.amount));
	return subtract(start, spent);
}

function subtract(a: string, b: string) {
	const toS = (v: string) => {
		const [w, f = ""] = v.split(".");
		return BigInt(w!) * 10_000_000n + BigInt(f.padEnd(7, "0").slice(0, 7));
	};
	const d = toS(a) - toS(b);
	const v = d < 0n ? 0n : d;
	return `${v / 10_000_000n}.${(v % 10_000_000n).toString().padStart(7, "0")}`;
}

route("POST", "/projects/:slug/contributions", "wallet", ({ params, body, wallet }) => {
	const amount = typeof body.amount === "string" ? body.amount.trim() : "";
	const problems: string[] = [];
	if (!assetById(body.assetId as string)) problems.push("assetId must be XLM or USDC:<issuer>");
	if (!isValidAmount(amount)) problems.push("amount must be a decimal above 0 with up to 7 decimals");
	if (problems.length) throw invalid(problems);
	return update((db) => {
		const p = db.projects.find((x) => x.slug === params.slug && isPublic(db, x));
		if (!p) throw new HttpError(404, "Project not found");
		if (!p.fundraisingEnabled || !p.payoutAddress) throw new HttpError(409, "This project isn’t accepting contributions");
		const assetId = body.assetId as string;
		const asset = assetById(assetId)!;
		if (!p.acceptedAssetIds.includes(assetId)) throw new HttpError(400, `This project doesn’t accept ${asset.code}`);
		const held = balance(db, wallet!, assetId);
		if (held === null) throw new HttpError(400, `Add ${asset.code} to your wallet first (no trustline)`);
		if (compare(held, amount) < 0) throw new HttpError(400, `Not enough ${asset.code}: the wallet holds ${held}`);
		const t = now();
		const c: ContributionRec = {
			id: uuid(),
			projectId: p.id,
			status: "awaiting_signature",
			contributorAddress: wallet!,
			assetId,
			amount,
			destination: p.payoutAddress,
			memo: `CS-${hex(6).toUpperCase()}`,
			fee: "0.0000100",
			txHash: hex(64),
			expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
			submittedAt: null,
			confirmedAt: null,
			ledger: null,
			failureReason: null,
			resultCodes: null,
			createdAt: t,
			updatedAt: t,
		};
		db.contributions.push(c);
		event(db, "contribution_started", { projectId: p.id, wallet: wallet! });
		return ok(prepared(db, c), "Contribution prepared", 201);
	});
});

function own(db: MockDb, id: string, wallet: string) {
	const c = db.contributions.find((x) => x.id === id && x.contributorAddress === wallet);
	if (!c) throw new HttpError(404, "Contribution not found");
	return c;
}

route("POST", "/contributions/:id/submit", "wallet", ({ params, body, wallet }) =>
	update((db) => {
		const c = own(db, params.id!, wallet!);
		// Submitting again returns its outcome; it never double counts.
		if (c.status !== "awaiting_signature") return ok(contributionDto(db, c), "Contribution status");
		if (Date.parse(c.expiresAt) < Date.now()) {
			expire(c);
			return ok(contributionDto(db, c), "Contribution expired");
		}
		if (body.transaction !== `demo-signed:mock-tx:${c.id}`) throw new HttpError(400, "The signed transaction does not match this contribution");
		const outcome = getControls().paymentScenario;
		c.status = "pending";
		c.submittedAt = now();
		c.updatedAt = now();
		c.settle = { outcome: outcome === "failed" ? "failed" : "confirmed", at: Date.now() + (outcome === "delayed" ? 20_000 : 2500) };
		event(db, "contribution_submitted", { projectId: c.projectId, wallet: wallet! });
		return ok(contributionDto(db, c), "Contribution submitted");
	}),
);

function expire(c: ContributionRec) {
	c.status = "expired";
	c.failureReason = "It wasn’t signed within 10 minutes. No funds moved.";
	c.updatedAt = now();
}

function settle(db: MockDb, c: ContributionRec) {
	if (!c.settle) return;
	const outcome = c.settle.outcome;
	delete c.settle;
	c.updatedAt = now();
	if (outcome === "failed") {
		c.status = "failed";
		c.failureReason = "Not enough XLM in the wallet for this amount and the network fee";
		c.resultCodes = ["tx_failed", "op_underfunded"];
		event(db, "contribution_failed", { projectId: c.projectId });
		return;
	}
	const p = db.projects.find((x) => x.id === c.projectId)!;
	const before = targetReached(db, p);
	const first = !db.contributions.some((x) => x.projectId === p.id && x.status === "confirmed");
	c.status = "confirmed";
	c.confirmedAt = now();
	c.ledger = 1_200_000 + Math.floor(Math.random() * 90_000);
	c.resultCodes = ["tx_success"];
	event(db, "contribution_confirmed", { projectId: p.id });
	const asset = assetById(c.assetId)!;
	if (first) notifyUser(db, p.ownerId, "first_contribution", `${p.title} received its first contribution`, `${c.amount} ${asset.code} was confirmed on Stellar.`, p.id);
	if (!before && targetReached(db, p)) notifyUser(db, p.ownerId, "funding_target_reached", `${p.title} reached its target`, `Confirmed contributions reached ${p.targetAmount} ${assetById(p.targetAssetId)?.code}.`, p.id);
}

/** Called before every mock request: settles due Demo payments and expires unsigned ones. */
export function settleContributions() {
	const db = read();
	const due = db.contributions.some(
		(c) => (c.settle && c.settle.at <= Date.now()) || (c.status === "awaiting_signature" && Date.parse(c.expiresAt) < Date.now()),
	);
	if (!due) return;
	update((d) => {
		for (const c of d.contributions) {
			if (c.settle && c.settle.at <= Date.now()) settle(d, c);
			else if (c.status === "awaiting_signature" && Date.parse(c.expiresAt) < Date.now()) expire(c);
		}
	});
}

route("GET", "/contributions/mine", "wallet", ({ wallet, query }) => {
	const db = read();
	const list = db.contributions
		.filter((c) => c.contributorAddress === wallet)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.map((c) => contributionDto(db, c));
	return ok(page(list, query), "Contributions retrieved");
});

route("GET", "/contributions/:id", "wallet", ({ params, wallet }) => {
	const db = read();
	return ok(contributionDto(db, own(db, params.id!, wallet!)), "Contribution retrieved");
});

route("GET", "/admin/contributions", "admin", ({ query }) => {
	const db = read();
	let list = [...db.contributions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	if (query.get("status")) list = list.filter((c) => c.status === query.get("status"));
	if (query.get("projectId")) list = list.filter((c) => c.projectId === query.get("projectId"));
	if (query.get("address")) list = list.filter((c) => c.contributorAddress === query.get("address"));
	return ok(page(list.map((c) => adminContributionDto(db, c)), query), "Contributions retrieved");
});

route("POST", "/admin/contributions/:id/reconcile", "admin", ({ params, user }) =>
	update((db) => {
		const c = db.contributions.find((x) => x.id === params.id);
		if (!c) throw new HttpError(404, "Contribution not found");
		if (c.settle) settle(db, c);
		else if (c.status === "awaiting_signature" && Date.parse(c.expiresAt) < Date.now()) expire(c);
		audit(db, user!.id, "contribution.reconcile", { type: "contribution", id: c.id }, { after: { status: c.status } });
		return ok(adminContributionDto(db, c), "Contribution re-checked");
	}),
);
