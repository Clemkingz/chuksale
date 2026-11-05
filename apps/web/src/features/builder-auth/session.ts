"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The builder's session (email + password auth, decision D6). Mock tokens look like `mock.<userId>.<rand>`.
 * Contributors never get one: their identity is the wallet (features/wallet).
 */
interface BuilderSession {
	token: string | null;
	userId: string | null;
	email: string | null;
	displayName: string | null;
	expiresAt: number | null;
	signIn: (session: { token: string; userId: string; email: string; displayName: string; expiresAt: number }) => void;
	signOut: () => void;
}

export const useBuilderSession = create<BuilderSession>()(
	persist(
		(set) => ({
			token: null,
			userId: null,
			email: null,
			displayName: null,
			expiresAt: null,
			signIn: (session) => set(session),
			signOut: () => set({ token: null, userId: null, email: null, displayName: null, expiresAt: null }),
		}),
		{ name: "csp-builder-session" },
	),
);

export const isExpired = (expiresAt: number | null) => !expiresAt || expiresAt <= Date.now();
