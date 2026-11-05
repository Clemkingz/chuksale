"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthTokens, Me, OtpIssued, RegisterResult, UpdateMeInput } from "@repo/domain/types";
import { builderApi, unwrap } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/source";
import { notify } from "@/lib/use-toast";
import { signOut, startSession, useSignedIn } from "@/features/builder-auth/session";
import type { SignInValues, SignUpValues } from "@/features/builder-auth/schema";

/** Builder auth (backend guide, "Authentication"). Mutations never retry (ReactQueryProvider). */

export const meKey = ["me"] as const;

/** Mock mode stands in for the inbox (staging sends no email either: codes come from the backend owner). */
function showDemoCode(email: string) {
	if (USE_MOCK_API) notify.demoInbox(email);
}

export function useSignUp() {
	return useMutation({
		mutationFn: async (v: SignUpValues) =>
			unwrap<RegisterResult>(
				await builderApi.post("/auth/register", {
					name: v.name.trim(),
					email: v.email.trim(),
					password: v.password,
					...(v.organizationName?.trim() ? { organizationName: v.organizationName.trim() } : {}),
				}),
			),
		onSuccess: (data) => showDemoCode(data.email),
	});
}

export function useSignIn() {
	return useMutation({
		mutationFn: async (v: SignInValues) => {
			const tokens = unwrap<AuthTokens>(await builderApi.post("/auth/login", { email: v.email.trim(), password: v.password }));
			// An admin signing in here: end that session at once; admins use the admin console.
			if (tokens.role === "admin") await builderApi.post("/auth/logout", { refreshToken: tokens.refreshToken }).catch(() => undefined);
			return tokens;
		},
	});
}

export function useVerifyEmail() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { email: string; otp: string }) =>
			startSession(unwrap<AuthTokens>(await builderApi.post("/auth/verify-email", input))),
		onSuccess: () => qc.invalidateQueries({ queryKey: meKey }),
	});
}

export function useResetPassword() {
	return useMutation({
		mutationFn: async (input: { email: string; otp: string; newPassword: string }) => {
			await builderApi.post("/auth/reset-password", input);
		},
	});
}

export function useResendOtp() {
	return useMutation({
		mutationFn: async (email: string) => ({ email, ...unwrap<OtpIssued>(await builderApi.post("/auth/resend-otp", { email })) }),
		onSuccess: (data) => {
			showDemoCode(data.email);
			notify.success("A new code is on its way", `Check ${data.email}.`);
		},
		onError: (error) => notify.fromError(error, "Couldn’t send a new code."),
	});
}

export function useForgotPassword() {
	return useMutation({
		mutationFn: async (email: string) => ({ email, ...unwrap<OtpIssued>(await builderApi.post("/auth/forgot-password", { email })) }),
		onSuccess: (data) => showDemoCode(data.email),
	});
}

/** The signed-in builder (`GET /auth/me`). */
export function useMe() {
	const signedIn = useSignedIn();
	return useQuery({
		queryKey: meKey,
		queryFn: async () => unwrap<Me>(await builderApi.get("/auth/me")),
		enabled: !!signedIn,
		staleTime: 5 * 60_000,
	});
}

export function useUpdateMe() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: UpdateMeInput) => unwrap<Me>(await builderApi.patch("/auth/me", input)),
		onSuccess: (me) => qc.setQueryData(meKey, me),
	});
}

export function useChangePassword() {
	return useMutation({
		mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
			await builderApi.post("/auth/change-password", input);
		},
	});
}

export function useSignOut() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: signOut,
		onSettled: () => {
			qc.removeQueries({ queryKey: meKey });
			qc.removeQueries({ queryKey: ["builder"] });
			qc.removeQueries({ queryKey: ["notifications"] });
		},
	});
}

export function useSignOutEverywhere() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			await builderApi.post("/auth/logout-all");
			await signOut();
		},
		onSettled: () => {
			qc.removeQueries({ queryKey: meKey });
			qc.removeQueries({ queryKey: ["builder"] });
			qc.removeQueries({ queryKey: ["notifications"] });
		},
	});
}

export { startSession, showDemoCode };
