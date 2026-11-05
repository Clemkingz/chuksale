"use client";

import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/source";
import { notify } from "@/lib/notify";
import { useAdminSession } from "@/features/auth/session";

/** Admin sign-in (D7): password → 6-digit code → session. Contract: docs/API.md § Auth (admin). */

type Challenge = { mfa_required: true; challenge_id: string; debug_code?: string };
type Session = { access_token: string; expires_at: number; user: { email: string; display_name: string } };

export function useAdminLogin() {
	return useMutation({
		mutationFn: async (input: { email: string; password: string }) =>
			unwrap<Challenge>(await api.post("/admin/auth/login", input)),
		onSuccess: (data) => {
			if (USE_MOCK_API && data.debug_code) notify.demoInbox(data.debug_code);
		},
	});
}

export function useAdminMfa() {
	const signIn = useAdminSession((s) => s.signIn);
	return useMutation({
		mutationFn: async (input: { challenge_id: string; code: string }) =>
			unwrap<Session>(await api.post("/admin/auth/mfa", input)),
		onSuccess: (s) => signIn({ token: s.access_token, email: s.user.email, name: s.user.display_name, expiresAt: s.expires_at }),
	});
}

/** Mock (test mode) only: one click, straight in as the demo admin. */
export function useDemoAdminSignIn() {
	const signIn = useAdminSession((s) => s.signIn);
	return useMutation({
		mutationFn: async () => unwrap<Session>(await api.post("/mock/admin/session")),
		onSuccess: (s) => signIn({ token: s.access_token, email: s.user.email, name: s.user.display_name, expiresAt: s.expires_at }),
	});
}
