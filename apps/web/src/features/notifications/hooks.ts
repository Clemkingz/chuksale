"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { AppNotification, Page, WalletNotification } from "@repo/domain/types";
import { builderApi, unwrap, walletApi } from "@/lib/api/client";
import { notify } from "@/lib/use-toast";
import { useSignedIn } from "@/features/builder-auth/session";
import { useWallet } from "@/features/wallet/store";

/**
 * Two inboxes with the same shape (backend "Notifications"):
 * - `builder`: the signed-in builder's account (`/notifications`, account token): review decisions, contributions.
 * - `wallet`: the connected contributor wallet (`/wallet/notifications`, wallet token): payment outcomes,
 *   suggestion moderation, updates on projects it backed.
 * Unread counts poll every minute and when the tab regains focus; a rise shows a toast.
 */

export type Inbox = "builder" | "wallet";
export type InboxItem = AppNotification | WalletNotification;
export type NotificationFilter = "all" | "unread";

const PAGE_SIZE = 10;
const POLL_MS = 60_000;

const BASE: Record<Inbox, string> = { builder: "/notifications", wallet: "/wallet/notifications" };
const client = (inbox: Inbox) => (inbox === "builder" ? builderApi : walletApi);

const keys = {
	all: (inbox: Inbox) => ["notifications", inbox] as const,
	list: (inbox: Inbox) => ["notifications", inbox, "list"] as const,
	unread: (inbox: Inbox) => ["notifications", inbox, "unread"] as const,
};

/** Which inboxes this visitor has right now: builder when signed in, wallet when a wallet is connected. */
export function useInboxes() {
	const signedIn = useSignedIn();
	const wallet = useWallet((s) => s.address);
	return { builder: !!signedIn, wallet: !!wallet, ready: signedIn !== null };
}

function useEnabled(inbox: Inbox) {
	const inboxes = useInboxes();
	return inboxes[inbox];
}

export function useNotifications(inbox: Inbox, filter: NotificationFilter, limit = PAGE_SIZE) {
	const enabled = useEnabled(inbox);
	return useInfiniteQuery({
		queryKey: [...keys.list(inbox), filter, limit],
		enabled,
		initialPageParam: 0,
		queryFn: async ({ pageParam }) =>
			unwrap<Page<InboxItem>>(
				await client(inbox).get(BASE[inbox], {
					params: { limit, offset: pageParam, ...(filter === "unread" ? { unread: true } : {}) },
				}),
			),
		getNextPageParam: (last, _all, offset) => (last.paginationMeta.nextPage ? offset + limit : undefined),
	});
}

/** Unread badge count; toasts when it goes up while the app is open. */
export function useUnreadCount(inbox: Inbox) {
	const enabled = useEnabled(inbox);
	const query = useQuery({
		queryKey: keys.unread(inbox),
		enabled,
		refetchInterval: POLL_MS,
		refetchOnWindowFocus: true,
		queryFn: async () => unwrap<{ count: number }>(await client(inbox).get(`${BASE[inbox]}/unread-count`)).count,
	});

	const previous = useRef<number | null>(null);
	const qc = useQueryClient();
	useEffect(() => {
		if (query.data === undefined) return;
		const before = previous.current;
		previous.current = query.data;
		if (before !== null && query.data > before) {
			notify.info("You have a new notification", "Open notifications to see it.");
			void qc.invalidateQueries({ queryKey: keys.list(inbox) });
		}
	}, [query.data, qc, inbox]);

	return { ...query, data: enabled ? query.data : 0 };
}

/** Both inboxes together, for the header bell. */
export function useTotalUnread() {
	const builder = useUnreadCount("builder").data ?? 0;
	const wallet = useUnreadCount("wallet").data ?? 0;
	return builder + wallet;
}

/** Marks one as read, optimistically (the dot and badge update before the request lands). */
export function useMarkRead(inbox: Inbox) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => unwrap<InboxItem>(await client(inbox).post(`${BASE[inbox]}/${id}/read`)),
		onMutate: async (id) => {
			await qc.cancelQueries({ queryKey: keys.all(inbox) });
			qc.setQueriesData<InfiniteData<Page<InboxItem>>>({ queryKey: keys.list(inbox) }, (data) =>
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
			qc.setQueryData<number>(keys.unread(inbox), (n) => (n ? n - 1 : n));
		},
		onSettled: () => qc.invalidateQueries({ queryKey: keys.all(inbox) }),
	});
}

export function useMarkAllRead(inbox: Inbox) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => unwrap<{ updated: number }>(await client(inbox).post(`${BASE[inbox]}/read-all`)),
		onSuccess: () => notify.success("You’re all caught up"),
		onError: (error) => notify.fromError(error, "Couldn’t mark notifications as read."),
		onSettled: () => qc.invalidateQueries({ queryKey: keys.all(inbox) }),
	});
}
