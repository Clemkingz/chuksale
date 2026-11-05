"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AnyWalletId as WalletId } from "@/features/wallet/connect";

interface WalletState {
	/** Public address (G…) of the contributor's connected wallet. Never a secret. */
	address: string | null;
	walletId: WalletId | null;
	/** Short-lived wallet session (PRD §6.5 step 7): cleared after it expires. */
	expiresAt: number | null;
	setConnected: (address: string, walletId: WalletId) => void;
	clear: () => void;
}

/** Wallet sessions last 12 h; a phone wallet may reload the tab, so it survives reloads. */
const SESSION_MS = 12 * 60 * 60 * 1000;

/** The connected contributor wallet. Separate from builder/admin auth (PRD §18 rule 6). */
export const useWallet = create<WalletState>()(
	persist(
		(set) => ({
			address: null,
			walletId: null,
			expiresAt: null,
			setConnected: (address, walletId) => set({ address, walletId, expiresAt: Date.now() + SESSION_MS }),
			clear: () => set({ address: null, walletId: null, expiresAt: null }),
		}),
		{
			name: "csp-wallet",
			storage: createJSONStorage(() => localStorage),
			onRehydrateStorage: () => (state) => {
				if (state?.expiresAt && state.expiresAt < Date.now()) state.clear();
			},
		},
	),
);
