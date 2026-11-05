"use client";

import { useSyncExternalStore } from "react";
import { useWallet } from "@/features/wallet/store";
import { useWalletDialog } from "@/features/wallet/dialog-store";

const subscribe = (cb: () => void) => useWallet.persist.onFinishHydration(cb);
const hydrated = () => useWallet.persist.hasHydrated();

/** The connected wallet, safe for SSR (null until the persisted store has loaded). */
export function useConnectedWallet() {
	const ready = useSyncExternalStore(subscribe, hydrated, () => false);
	const { address, walletId } = useWallet();
	return { ready, address: ready ? address : null, walletId: ready ? walletId : null };
}

/** Runs `action` with the wallet address, asking to connect first if needed. */
export function useRequireWallet() {
	const show = useWalletDialog((s) => s.show);
	return (action: (address: string) => void, reason?: string) => {
		const address = useWallet.getState().address;
		if (address) action(address);
		else show(reason, action);
	};
}
