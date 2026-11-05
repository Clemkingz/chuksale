"use client";

import type { AcceptedAsset, ContributionIntent } from "@repo/domain/types";
import { compare } from "@repo/domain/money";
import { HORIZON_URL, NETWORK_PASSPHRASE } from "@/lib/stellar/config";

/**
 * Builds and submits a contribution on Stellar Testnet (adapted from stellance-v3 `payer-wallet/pay.ts`).
 * Funds flow D1 (docs/DECISIONS.md): a direct payment from the contributor's wallet to the project's
 * destination address, carrying the intent's reference as a text memo. Nothing here marks it confirmed:
 * the verifier (mock backend now, real worker later) checks Horizon first (FR-CON-02).
 */

export class ContributionError extends Error {
	constructor(
		message: string,
		/** The payment may already be on the network: never offer to pay again; show "check status". */
		readonly outcomeUnknown = false,
	) {
		super(message);
	}
}

const sdk = () => import("@stellar/stellar-sdk");

/** Builds the payment as an unsigned transaction (base64 XDR) after checking account, trustline and balance. */
export async function buildContributionTx(intent: ContributionIntent, asset: AcceptedAsset, sender: string) {
	const { Asset, BASE_FEE, Horizon, Memo, Operation, TransactionBuilder } = await sdk();
	const server = new Horizon.Server(HORIZON_URL);
	const native = asset.issuer === null;
	const stellarAsset = native ? Asset.native() : new Asset(asset.code, asset.issuer!);

	let account: Awaited<ReturnType<typeof server.loadAccount>>;
	try {
		account = await server.loadAccount(sender);
	} catch (error) {
		if ((error as { response?: { status?: number } })?.response?.status === 404)
			throw new ContributionError(
				"This wallet isn’t active on Stellar Testnet yet. Fund it with test XLM (Friendbot), then try again.",
			);
		throw new ContributionError("Stellar Testnet couldn’t be reached. Check your connection and try again.");
	}

	const line = account.balances.find((b) =>
		native ? b.asset_type === "native" : "asset_code" in b && b.asset_code === asset.code && b.asset_issuer === asset.issuer,
	);
	if (!line)
		throw new ContributionError(
			`This wallet doesn’t hold ${asset.code} (Testnet) yet. Add the asset in your wallet, then try again.`,
		);
	if (compare(line.balance, intent.amount) < 0)
		throw new ContributionError(
			`Not enough ${asset.code}: this wallet has ${line.balance}, the contribution is ${intent.amount}.`,
		);

	const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
		.addOperation(Operation.payment({ destination: intent.destination_address, asset: stellarAsset, amount: intent.amount }))
		.addMemo(Memo.text(intent.reference))
		.setTimeout(300)
		.build();
	return { xdr: tx.toXDR(), fee: tx.fee };
}

/** Submits the signed transaction; resolves with its hash. A lost response is "check status", never auto-retried. */
export async function submitContributionTx(signedXdr: string) {
	const { Horizon, TransactionBuilder } = await sdk();
	const server = new Horizon.Server(HORIZON_URL);
	const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
	try {
		const result = await server.submitTransaction(tx);
		return result.hash;
	} catch (error) {
		const codes = (
			error as { response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } } }
		)?.response?.data?.extras?.result_codes;
		if (codes) {
			const op = codes.operations?.[0];
			if (op === "op_underfunded") throw new ContributionError("Not enough funds in this wallet.");
			if (op === "op_no_trust" || op === "op_src_no_trust")
				throw new ContributionError("This wallet doesn’t hold the asset yet.");
			if (op === "op_no_destination")
				throw new ContributionError("The project’s wallet isn’t active on Testnet. Nothing was sent.");
			if (codes.transaction === "tx_bad_seq")
				throw new ContributionError("The wallet’s account changed while signing. Please try again.");
			if (codes.transaction === "tx_too_late") throw new ContributionError("The signing window expired. Please try again.");
			throw new ContributionError(`Stellar rejected the transaction (${op ?? codes.transaction}). Nothing was sent.`);
		}
		throw new ContributionError("We couldn’t confirm the transaction was sent. Check its status before trying again.", true);
	}
}
