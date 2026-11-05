"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { walletTokenStore, type StoredWalletSession } from "@repo/api/tokens";
import type { AnyWalletId as WalletId } from "@/features/wallet/connect";

interface WalletState {
	/** Public address (G…) of the contributor's signed-in wallet. Never a secret. */
	address: string | null;
	walletId: WalletId | null;
	/** When the wallet session (12 h, SEP-10) ends; then a new challenge must be signed. */
	expiresAt: string | null;
	setSession: (session: StoredWalletSession, walletId: WalletId) => void;
	clear: () => void;
	/** The API refused the wallet token (expired or revoked). */
	endSession: () => void;
}

/**
 * The connected contributor wallet: connected AND signed in with the API (wallet token in `walletTokenStore`).
 * Separate from builder/admin auth: neither token works for the other.
 */
export const useWallet = create<WalletState>()(
	persist(
		(set, get) => ({
			address: null,
			walletId: null,
			expiresAt: null,
			setSession: (s, walletId) => set({ address: s.address, walletId, expiresAt: s.expiresAt }),
			clear: () => {
				walletTokenStore.clear();
				set({ address: null, walletId: null, expiresAt: null });
			},
			endSession: () => {
				if (!get().address) return;
				walletTokenStore.clear();
				set({ address: null, walletId: null, expiresAt: null });
				void import("@/lib/use-toast").then(({ notify }) =>
					notify.info("Your wallet session ended", "Connect your wallet again to continue."),
				);
			},
		}),
		{
			name: "csp-wallet",
			storage: createJSONStorage(() => localStorage),
			onRehydrateStorage: () => (state) => {
				// No valid wallet token for this address (expired, or signed out in another tab): not connected.
				const token = walletTokenStore.get();
				if (state?.address && (!token || token.address !== state.address)) state.clear();
			},
		},
	),
);
