"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminAccount, AdminNotificationPrefs, Paginated } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";
import { useAdminSession } from "@/features/auth/session";

/** The signed-in admin's account (top bar + Account settings, designs "admin page 6–8"). */

const KEY = ["admin", "account"] as const;

export function useAdminAccount() {
	return useQuery({
		queryKey: KEY,
		queryFn: async () => unwrap<AdminAccount>(await api.get("/admin/account")),
		staleTime: 60_000,
	});
}

export type AccountPatch = Partial<
	Pick<AdminAccount, "first_name" | "last_name" | "phone" | "bio" | "country" | "city" | "postal_code" | "avatar_url">
>;

export function useUpdateAccount() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (patch: AccountPatch) => unwrap<AdminAccount>(await api.patch("/admin/account", patch)),
		onSuccess: (account) => {
			qc.setQueryData(KEY, account);
			useAdminSession.setState({ name: `${account.first_name} ${account.last_name}`.trim() });
		},
	});
}

export function useChangePassword() {
	return useMutation({
		mutationFn: async (input: { current_password: string; new_password: string }) =>
			unwrap<object>(await api.post("/admin/account/password", input)),
	});
}

export function useUpdateNotificationPrefs() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (patch: Partial<AdminNotificationPrefs>) =>
			unwrap<AdminNotificationPrefs>(await api.patch("/admin/account/notifications", patch)),
		// Optimistic: the switch moves at once and snaps back if the save fails.
		onMutate: async (patch) => {
			await qc.cancelQueries({ queryKey: KEY });
			const before = qc.getQueryData<AdminAccount>(KEY);
			if (before) qc.setQueryData(KEY, { ...before, notifications: { ...before.notifications, ...patch } });
			return { before };
		},
		onError: (_e, _p, ctx) => ctx?.before && qc.setQueryData(KEY, ctx.before),
	});
}

export function useDeleteAccount() {
	return useMutation({
		mutationFn: async (password: string) => unwrap<object>(await api.delete("/admin/account", { data: { password } })),
	});
}

export type AdminFeedItem = { id: string; kind: string; title: string; body: string; href: string | null; created_at: string };

/** Account settings → Notification: what needs the admin's attention, newest first. */
export function useAdminNotifications(page: number) {
	return useQuery({
		queryKey: ["admin", "notifications", page],
		queryFn: async () => unwrap<Paginated<AdminFeedItem>>(await api.get("/admin/notifications", { params: { page, limit: 6 } })),
		placeholderData: keepPreviousData,
	});
}
