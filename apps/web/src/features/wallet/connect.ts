"use client";

import { getControls } from "@repo/mock-api/controls";
import { USE_MOCK_API } from "@/lib/api/source";
import { useWallet } from "@/features/wallet/store";
import type { WalletId } from "@/features/wallet/kit";

/**
 * One entry point for connecting a wallet, real or simulated. Real wallets go through Stellar Wallets Kit
 * (`kit.ts`, loaded on first use). In mock mode a "Demo wallet" also exists: no extension needed, and its outcome
 * is chosen in the Demo panel (success, rejected, not installed, wrong network, slow), so every state of the
 * connect dialog can be seen.
 */

export type AnyWalletId = WalletId | "demo";

export const DEMO_WALLET = { id: "demo", name: "Demo wallet", kind: "Simulated · mock mode only" } as const;

/** A real-looking Testnet address, stable per browser (so its notification history persists). */
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
	await wait(scenario === "slow" ? 6000 : 1400);
	if (scenario === "rejected") throw new DemoWalletError("You declined the connection request.", "rejected");
	if (scenario === "not_installed") throw new DemoWalletError("Demo wallet isn’t installed in this browser.", "not_installed");
	if (scenario === "wrong_network") throw new DemoWalletError("Switch Demo wallet to Testnet, then try again.", "wrong_network");
	const address = demoAddress();
	useWallet.getState().setConnected(address, "demo");
	return address;
}

export async function connectAnyWallet(id: AnyWalletId, options?: { onAppMissed?: () => void }) {
	if (id === "demo") {
		if (!USE_MOCK_API) throw new Error("The demo wallet only exists in mock mode.");
		return connectDemo();
	}
	const { connectWallet } = await import("@/features/wallet/kit");
	return connectWallet(id, options);
}

export async function disconnectAnyWallet() {
	const id = useWallet.getState().walletId;
	if (id === "demo" || !id) {
		useWallet.getState().clear();
		return;
	}
	const { disconnectWallet } = await import("@/features/wallet/kit");
	await disconnectWallet();
}
