"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** The admin's session: its own key, separate from the builder session in apps/web. */
interface AdminSession {
	token: string | null;
	email: string | null;
	name: string | null;
	expiresAt: number | null;
	signIn: (session: { token: string; email: string; name: string; expiresAt: number }) => void;
	signOut: () => void;
}

export const useAdminSession = create<AdminSession>()(
	persist(
		(set) => ({
			token: null,
			email: null,
			name: null,
			expiresAt: null,
			signIn: (session) => set(session),
			signOut: () => set({ token: null, email: null, name: null, expiresAt: null }),
		}),
		{ name: "csp-admin-session" },
	),
);

export const isExpired = (expiresAt: number | null) => !expiresAt || expiresAt <= Date.now();
