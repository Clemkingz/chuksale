"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { AppNotification, Page } from "@repo/domain/types";
import { builderApi, unwrap } from "@/lib/api/client";
import { notify } from "@/lib/use-toast";
import { useSignedIn } from "@/features/builder-auth/session";

/**
 * The builder's in-app inbox (backend guide, "Notifications"). Wallets have no inbox. The unread count polls every
 * minute and when the tab regains focus; a rise shows a toast.
 */

export type NotificationFilter = "all" | "unread";

const PAGE_SIZE = 10;
const POLL_MS = 60_000;

const keys = {
	all: ["notifications"] as const,
	list: (filter: NotificationFilter) => ["notifications", "list", filter] as const,
	unread: ["notifications", "unread"] as const,
};

export function useNotifications(filter: NotificationFilter, limit = PAGE_SIZE) {
	const signedIn = useSignedIn();
	return useInfiniteQuery({
		queryKey: [...keys.list(filter), limit],
		enabled: !!signedIn,
		initialPageParam: 0,
		queryFn: async ({ pageParam }) =>
			unwrap<Page<AppNotification>>(
				await builderApi.get("/notifications", {
					params: { limit, offset: pageParam, ...(filter === "unread" ? { unread: true } : {}) },
				}),
			),
		getNextPageParam: (last, _all, offset) => (last.paginationMeta.nextPage ? offset + limit : undefined),
	});
}

/** Unread badge count; toasts when it goes up while the app is open. */
export function useUnreadCount() {
	const signedIn = useSignedIn();
	const query = useQuery({
		queryKey: keys.unread,
		enabled: !!signedIn,
		refetchInterval: POLL_MS,
		refetchOnWindowFocus: true,
		queryFn: async () => unwrap<{ count: number }>(await builderApi.get("/notifications/unread-count")).count,
	});

	const previous = useRef<number | null>(null);
	const qc = useQueryClient();
	useEffect(() => {
		if (query.data === undefined) return;
		const before = previous.current;
		previous.current = query.data;
		if (before !== null && query.data > before) {
			notify.info("You have a new notification", "Open notifications to see it.");
			void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
		}
	}, [query.data, qc]);

	return query;
}

/** Marks one as read, optimistically (the dot and badge update before the request lands). */
export function useMarkRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => unwrap<AppNotification>(await builderApi.post(`/notifications/${id}/read`)),
		onMutate: async (id) => {
			await qc.cancelQueries({ queryKey: keys.all });
			qc.setQueriesData<InfiniteData<Page<AppNotification>>>({ queryKey: ["notifications", "list"] }, (data) =>
				data
					? {
							...data,
							pages: data.pages.map((p) => ({
								...p,
								result: p.result.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
							})),
						}
					: data,
			);
			qc.setQueryData<number>(keys.unread, (n) => (n ? n - 1 : n));
		},
		onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
	});
}

export function useMarkAllRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => unwrap<{ updated: number }>(await builderApi.post("/notifications/read-all")),
		onSuccess: () => notify.success("You’re all caught up"),
		onError: (error) => notify.fromError(error, "Couldn’t mark notifications as read."),
		onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
	});
}
