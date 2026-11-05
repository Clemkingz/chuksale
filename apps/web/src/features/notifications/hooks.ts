"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { Notification, NotificationCategory, Paginated } from "@repo/domain/types";
import { builderApi, unwrap } from "@/lib/api/client";
import { notify } from "@/lib/use-toast";
import { useBuilderSession } from "@/features/builder-auth/session";
import { useConnectedWallet } from "@/features/wallet/hooks";

/**
 * Notifications for whoever is reading: the signed-in builder (token, via builderApi) and/or the connected wallet
 * (`?wallet=`). Contract: docs/API.md § Notifications. The unread count polls every 20 s; a rise shows a toast.
 */

export type NotificationFilter = "all" | "unread" | NotificationCategory;

type Page = Paginated<Notification> & { unread_count: number; personalised: boolean };

const PAGE_SIZE = 10;
const POLL_MS = 20_000;

export function useInboxIdentity() {
	const { ready, address } = useConnectedWallet();
	const token = useBuilderSession((s) => s.token);
	const userId = useBuilderSession((s) => s.userId);
	return { ready, wallet: address, signedIn: !!token, key: `${userId ?? "-"}:${address ?? "-"}` };
}

const keys = {
	all: ["notifications"] as const,
	list: (identity: string, filter: NotificationFilter) => ["notifications", "list", identity, filter] as const,
	unread: (identity: string) => ["notifications", "unread", identity] as const,
};

export function useNotifications(filter: NotificationFilter) {
	const { ready, wallet, key } = useInboxIdentity();
	return useInfiniteQuery({
		queryKey: keys.list(key, filter),
		enabled: ready,
		initialPageParam: 1,
		queryFn: async ({ pageParam }) =>
			unwrap<Page>(
				await builderApi.get("/notifications", {
					params: {
						wallet: wallet ?? undefined,
						page: pageParam,
						limit: PAGE_SIZE,
						status: filter === "unread" ? "unread" : undefined,
						category: filter !== "all" && filter !== "unread" ? filter : undefined,
					},
				}),
			),
		getNextPageParam: (last) => (last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined),
	});
}

/** Unread badge count; toasts when it goes up while the app is open. */
export function useUnreadCount() {
	const { ready, wallet, key } = useInboxIdentity();
	const query = useQuery({
		queryKey: keys.unread(key),
		enabled: ready,
		refetchInterval: POLL_MS,
		queryFn: async () =>
			unwrap<{ unread_count: number }>(
				await builderApi.get("/notifications/unread-count", { params: { wallet: wallet ?? undefined } }),
			).unread_count,
	});

	const previous = useRef<{ key: string; count: number } | null>(null);
	const qc = useQueryClient();
	useEffect(() => {
		if (query.data === undefined) return;
		const before = previous.current;
		previous.current = { key, count: query.data };
		if (before && before.key === key && query.data > before.count) {
			notify.info("You have a new notification", "Open notifications to see it.");
			void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
		}
	}, [query.data, key, qc]);

	return query;
}

/** Marks one as read, optimistically (the dot and badge update before the request lands). */
export function useMarkRead() {
	const qc = useQueryClient();
	const { wallet, key } = useInboxIdentity();
	return useMutation({
		mutationFn: async (id: string) => builderApi.post(`/notifications/${id}/read`, { wallet }),
		onMutate: async (id) => {
			await qc.cancelQueries({ queryKey: keys.all });
			qc.setQueriesData<InfiniteData<Page>>({ queryKey: ["notifications", "list", key] }, (data) =>
				data
					? {
							...data,
							pages: data.pages.map((p) => ({
								...p,
								items: p.items.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)),
							})),
						}
					: data,
			);
			qc.setQueryData<number>(keys.unread(key), (n) => (n ? n - 1 : n));
		},
		onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
	});
}

export function useMarkAllRead() {
	const qc = useQueryClient();
	const { wallet } = useInboxIdentity();
	return useMutation({
		mutationFn: async () => unwrap<{ updated: number }>(await builderApi.post("/notifications/read-all", { wallet })),
		onSuccess: () => notify.success("You’re all caught up"),
		onError: (error) => notify.fromError(error, "Couldn’t mark notifications as read."),
		onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
	});
}
