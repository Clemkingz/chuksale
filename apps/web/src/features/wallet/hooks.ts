"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useWallet } from "@/features/wallet/store";
import { useWalletDialog } from "@/features/wallet/dialog-store";
import { checkWalletSession } from "@/features/wallet/connect";

const subscribe = (cb: () => void) => useWallet.persist.onFinishHydration(cb);
const hydrated = () => useWallet.persist.hasHydrated();

let sessionChecked = false;

/** The connected (signed-in) wallet, safe for SSR (null until the persisted store has loaded). */
export function useConnectedWallet() {
	const ready = useSyncExternalStore(subscribe, hydrated, () => false);
	const { address, walletId } = useWallet();
	// Once per page load: confirm the stored wallet token with the API (GET /wallet-auth/session).
	useEffect(() => {
		if (!ready || !address || sessionChecked) return;
		sessionChecked = true;
		void checkWalletSession();
	}, [ready, address]);
	return { ready, address: ready ? address : null, walletId: ready ? walletId : null };
}

/** Runs `action` with the wallet address, asking to connect (and sign in) first if needed. */
export function useRequireWallet() {
	const show = useWalletDialog((s) => s.show);
	return (action: (address: string) => void, reason?: string) => {
		const address = useWallet.getState().address;
		if (address) action(address);
		else show(reason, action);
	};
}
