"use client";

import { getControls } from "@repo/mock-api/controls";
import type { WalletChallenge, WalletToken } from "@repo/domain/types";
import { walletTokenStore } from "@repo/api/tokens";
import { api, unwrap, walletApi } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/source";
import { getNetwork } from "@/lib/stellar/network";
import { useWallet } from "@/features/wallet/store";
import type { WalletId } from "@/features/wallet/kit";

/**
 * Connecting a contributor wallet (backend guide, "Wallet sign-in"): read the address from the wallet, check its
 * network, then prove ownership by signing a one-time SEP-10 challenge (a transaction that can never be submitted
 * and moves no funds). The API answers with a 12 h wallet token. Real wallets go through Stellar Wallets Kit
 * (`kit.ts`, loaded on first use). In mock mode a "Demo wallet" also exists, with outcomes from the Demo panel.
 */

export type AnyWalletId = WalletId | "demo";

export type ConnectStage = "connect" | "sign" | "verify";

export const DEMO_WALLET = { id: "demo", name: "Demo wallet", kind: "Simulated · mock mode only" } as const;

/** A real-looking Testnet address, stable per browser. */
function demoAddress() {
	const KEY = "csp-demo-wallet-address";
	try {
		const saved = localStorage.getItem(KEY);
		if (saved) return saved;
	} catch {
		// fall through
	}
	const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	const address = "G" + Array.from({ length: 55 }, () => A[Math.floor(Math.random() * 32)]).join("");
	try {
		localStorage.setItem(KEY, address);
	} catch {
		// private mode: a new address each time is fine
	}
	return address;
}

export class DemoWalletError extends Error {
	constructor(
		message: string,
		readonly kind: "rejected" | "not_installed" | "wrong_network",
	) {
		super(message);
	}
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connectDemo() {
	const scenario = getControls().walletScenario;
	await wait(scenario === "slow" ? 6000 : 1100);
	if (scenario === "rejected") throw new DemoWalletError("You declined the connection request.", "rejected");
	if (scenario === "not_installed") throw new DemoWalletError("Demo wallet isn’t installed in this browser.", "not_installed");
	if (scenario === "wrong_network") throw new DemoWalletError("Switch Demo wallet to Testnet, then try again.", "wrong_network");
	return demoAddress();
}

/** Has the wallet sign a transaction (base64 XDR) for `networkPassphrase`; resolves with the signed XDR. */
export async function signAny(walletId: AnyWalletId, xdr: string, address: string, networkPassphrase: string) {
	if (walletId === "demo") {
		if (!USE_MOCK_API) throw new Error("The demo wallet only exists in mock mode.");
		await wait(900);
		// The mock API recognises this marker as "signed by the demo wallet".
		return `demo-signed:${xdr}`;
	}
	const { signWithWallet } = await import("@/features/wallet/kit");
	return signWithWallet(walletId, xdr, address, networkPassphrase);
}

export async function connectAnyWallet(
	id: AnyWalletId,
	options: { onAppMissed?: () => void; onStage?: (stage: ConnectStage) => void } = {},
) {
	if (id === "demo" && !USE_MOCK_API) throw new Error("The demo wallet only exists in mock mode.");
	const network = await getNetwork();
	options.onStage?.("connect");
	const address =
		id === "demo"
			? await connectDemo()
			: await (
					await import("@/features/wallet/kit")
				).connectWallet(id, {
					onAppMissed: options.onAppMissed,
					networkPassphrase: network.networkPassphrase,
				});

	options.onStage?.("sign");
	const challenge = unwrap<WalletChallenge>(await api.post("/wallet-auth/challenge", { address }));
	if (challenge.networkPassphrase !== network.networkPassphrase)
		throw new Error("Switch your wallet to Testnet, then try again.");
	const signed = await signAny(id, challenge.transaction, address, challenge.networkPassphrase);

	options.onStage?.("verify");
	const token = unwrap<WalletToken>(await api.post("/wallet-auth/verify", { transaction: signed }));
	const session = walletTokenStore.save(token);
	useWallet.getState().setSession(session, id);
	return token.address;
}

/** Disconnects: ends the wallet session on the API (204), forgets the token, and lets the wallet go. */
export async function disconnectAnyWallet() {
	const id = useWallet.getState().walletId;
	await walletApi.post("/wallet-auth/logout").catch(() => undefined);
	useWallet.getState().clear();
	if (id && id !== "demo") {
		const { disconnectWallet } = await import("@/features/wallet/kit");
		await disconnectWallet();
	}
}

/** After a reload: confirm the stored wallet token is still good (`GET /wallet-auth/session`). */
export async function checkWalletSession() {
	if (!walletTokenStore.get()) return;
	try {
		await walletApi.get("/wallet-auth/session");
	} catch {
		// A 401 already ended the session (walletApi); network errors keep it for now.
	}
}
