"use client";

import { create } from "zustand";

/**
 * The Connect Wallet dialog is mounted once (root layout) and opened from anywhere. `requireWallet(next)` opens it
 * only when no wallet is connected and runs `next` once one is: the PRD asks for a wallet at the moment of an
 * action (contribute, suggest), not before (§6.4).
 */
interface WalletDialogState {
	open: boolean;
	reason: string | null;
	pending: ((address: string) => void) | null;
	show: (reason?: string, next?: (address: string) => void) => void;
	close: () => void;
	/** Called by the dialog after a successful connect. */
	resolve: (address: string) => void;
}

export const useWalletDialog = create<WalletDialogState>()((set, get) => ({
	open: false,
	reason: null,
	pending: null,
	show: (reason, next) => set({ open: true, reason: reason ?? null, pending: next ?? null }),
	close: () => set({ open: false, reason: null, pending: null }),
	resolve: (address) => {
		const next = get().pending;
		set({ open: false, reason: null, pending: null });
		next?.(address);
	},
}));
