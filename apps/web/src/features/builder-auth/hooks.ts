"use client";

import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/source";
import { notify } from "@/lib/use-toast";
import { useBuilderSession } from "@/features/builder-auth/session";
import type { SignInValues, SignUpValues } from "@/features/builder-auth/schema";

/** Builder auth calls (docs/API.md § Auth). Mutations never retry (ReactQueryProvider). */

export type OtpPurpose = "verify_email" | "reset_password";

interface SessionDto {
	access_token: string;
	expires_at: number;
	user: { id: string; email: string; role: string; display_name: string };
}

interface OtpSent {
	email?: string;
	resend_in?: number;
	/** Mock only: the code the API "emailed". */
	debug_code?: string;
}

/** Mock mode stands in for the inbox. */
function showDemoCode(data: OtpSent | undefined, email: string) {
	if (USE_MOCK_API && data?.debug_code) notify.demoInbox(data.debug_code, email);
}

function startSession(dto: SessionDto) {
	useBuilderSession.getState().signIn({
		token: dto.access_token,
		userId: dto.user.id,
		email: dto.user.email,
		displayName: dto.user.display_name,
		expiresAt: dto.expires_at,
	});
	return dto;
}

export function useSignUp() {
	return useMutation({
		mutationFn: async (values: SignUpValues) =>
			unwrap<OtpSent & { email: string }>(
				await api.post("/auth/signup", { full_name: values.full_name, email: values.email, password: values.password }),
			),
		onSuccess: (data) => showDemoCode(data, data.email),
	});
}

export function useSignIn() {
	return useMutation({
		mutationFn: async (values: SignInValues) => startSession(unwrap<SessionDto>(await api.post("/auth/login", values))),
	});
}

export function useGoogleSignIn() {
	return useMutation({
		mutationFn: async () => {
			// TODO(live): Google Identity Services → id_token. The mock accepts any token as the demo builder.
			if (!USE_MOCK_API) throw new Error("Google sign-in isn’t set up yet. Use your email and password.");
			return startSession(unwrap<SessionDto>(await api.post("/auth/social", { id_token: "mock-google-id-token" })));
		},
	});
}

export function useVerifyOtp(purpose: OtpPurpose) {
	return useMutation({
		mutationFn: async (input: { email: string; code: string; password?: string }) => {
			if (purpose === "verify_email") return startSession(unwrap<SessionDto>(await api.post("/auth/verify-email", input)));
			await api.post("/auth/reset-password", input);
			return null;
		},
	});
}

export function useResendOtp(purpose: OtpPurpose) {
	return useMutation({
		mutationFn: async (email: string) => ({ email, ...unwrap<OtpSent>(await api.post("/auth/resend-otp", { email, purpose })) }),
		onSuccess: (data) => {
			showDemoCode(data, data.email);
			notify.success("A new code is on its way", `Check ${data.email}.`);
		},
		onError: (error) => notify.fromError(error, "Couldn’t send a new code."),
	});
}

export function useForgotPassword() {
	return useMutation({
		mutationFn: async (email: string) => ({ email, ...unwrap<OtpSent>(await api.post("/auth/forgot-password", { email })) }),
		onSuccess: (data) => showDemoCode(data, data.email),
	});
}

export { showDemoCode };
