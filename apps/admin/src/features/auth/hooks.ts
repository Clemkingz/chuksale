"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthTokens, Me } from "@repo/domain/types";
import { accountTokens, api, unwrap } from "@/lib/api/client";
import { signOut, useAdminSignedIn } from "@/features/auth/session";

/**
 * Admin sign-in (backend guide, "Sign in"): the same login route as builders; only `role: "admin"` gets in. No
 * MFA on the API. New admins set their password with the emailed setup code (the reset flow).
 */

export class NotAnAdminError extends Error {
	constructor() {
		super("That’s a builder account. Builders sign in on the Chucksales app, not the admin console.");
	}
}

export function useAdminLogin() {
	return useMutation({
		mutationFn: async (input: { email: string; password: string }) => {
			const tokens = unwrap<AuthTokens>(await api.post("/auth/login", { email: input.email.trim(), password: input.password }));
			if (tokens.role !== "admin") {
				// End that builder session at once: this console never keeps it.
				await api.post("/auth/logout", { refreshToken: tokens.refreshToken }).catch(() => undefined);
				throw new NotAnAdminError();
			}
			accountTokens.save(tokens);
			return tokens;
		},
	});
}

/** Mock (test mode) only: one click, straight in as the demo admin. */
export function useDemoAdminSignIn() {
	return useMutation({
		mutationFn: async () => {
			const tokens = unwrap<AuthTokens>(await api.post("/mock/admin/session"));
			accountTokens.save(tokens);
			return tokens;
		},
	});
}

export function useForgotPassword() {
	return useMutation({
		mutationFn: async (email: string) => {
			await api.post("/auth/forgot-password", { email: email.trim() });
		},
	});
}

export function useResetPassword() {
	return useMutation({
		mutationFn: async (input: { email: string; otp: string; newPassword: string }) => {
			await api.post("/auth/reset-password", input);
		},
	});
}

export const meKey = ["me"] as const;

export function useMe() {
	const signedIn = useAdminSignedIn();
	return useQuery({
		queryKey: meKey,
		enabled: !!signedIn,
		queryFn: async () => unwrap<Me>(await api.get("/auth/me")),
		staleTime: 5 * 60_000,
	});
}

export function useSignOut() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: signOut,
		onSettled: () => qc.clear(),
	});
}
