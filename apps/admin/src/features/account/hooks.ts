"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppNotification, Me, Page } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";
import { meKey } from "@/features/auth/hooks";
import { signOut } from "@/features/auth/session";

/** The signed-in admin's account: name (admins can change only that), password, sessions, inbox. */

export function useUpdateName() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (name: string) => unwrap<Me>(await api.patch("/auth/me", { name })),
		onSuccess: (me) => qc.setQueryData(meKey, me),
	});
}

/** Profile picture (`PUT /auth/me/avatar`, part `avatar`; JPEG/PNG/WebP up to 5 MB). `null` removes it. */
export function useAdminAvatar() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (file: File | null) => {
			if (!file) return unwrap<Me>(await api.delete("/auth/me/avatar"));
			const form = new FormData();
			form.append("avatar", file);
			return unwrap<Me>(await api.put("/auth/me/avatar", form));
		},
		onSuccess: (me) => qc.setQueryData(meKey, me),
	});
}

/** A wrong current password is a 400 (never a refresh). Other sessions end; this one stays. */
export function useChangePassword() {
	return useMutation({
		mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
			await api.post("/auth/change-password", input);
		},
	});
}

export function useSignOutEverywhere() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			await api.post("/auth/logout-all");
			await signOut();
		},
		onSettled: () => qc.clear(),
	});
}

export const INBOX_PAGE = 8;

/** The admin's in-app inbox (e.g. "review requested" when a builder submits). */
export function useInbox(page: number) {
	return useQuery({
		queryKey: ["admin", "inbox", page],
		queryFn: async () =>
			unwrap<Page<AppNotification>>(
				await api.get("/notifications", { params: { limit: INBOX_PAGE, offset: (page - 1) * INBOX_PAGE } }),
			),
		placeholderData: keepPreviousData,
	});
}

export function useInboxUnread() {
	return useQuery({
		queryKey: ["admin", "inbox", "unread"],
		queryFn: async () => unwrap<{ count: number }>(await api.get("/notifications/unread-count")).count,
		refetchInterval: 60_000,
		refetchOnWindowFocus: true,
	});
}

export function useMarkRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => unwrap<AppNotification>(await api.post(`/notifications/${id}/read`)),
		onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "inbox"] }),
	});
}

export function useMarkAllRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => unwrap<{ updated: number }>(await api.post("/notifications/read-all")),
		onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "inbox"] }),
	});
}
