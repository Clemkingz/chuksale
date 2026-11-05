"use client";

import { useState } from "react";
import Link from "next/link";
import { BellOff, LogIn } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState } from "@/components/States";
import { useSignedIn } from "@/features/builder-auth/session";
import { NotificationCard, NotificationCardSkeleton } from "@/features/notifications/components/NotificationCard";
import {
	useMarkAllRead,
	useUnreadCount,
	useMarkRead,
	useNotifications,
	type NotificationFilter,
} from "@/features/notifications/hooks";

const FILTERS: { id: NotificationFilter; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
];

const EMPTY_COPY: Record<NotificationFilter, string> = {
	all: "Review decisions on your projects and first contributions show up here.",
	unread: "You’re all caught up. New updates will show up here.",
};

/** Design: "Notifications" heading, an "All" chip (outlined when active), then a stack of cards. */
export function NotificationsView() {
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const signedIn = useSignedIn();
	const query = useNotifications(filter);
	const markRead = useMarkRead();
	const markAll = useMarkAllRead();
	const { data: unread = 0 } = useUnreadCount();
	const items = query.data?.pages.flatMap((p) => p.result) ?? [];

	return (
		<section className="app-container animate-page max-w-[1030px] py-12 md:py-[90px]">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<h1 className="font-display text-[32px] font-bold md:text-[44px]">Notifications</h1>
				{unread > 0 && (
					<Button
						variant="link"
						size="sm"
						className="px-0"
						onClick={() => markAll.mutate()}
						isLoading={markAll.isPending}
						loadingLabel="Marking all as read"
					>
						Mark all as read ({unread})
					</Button>
				)}
			</div>

			<div
				role="tablist"
				aria-label="Filter notifications"
				className="hide-scroll -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_82%,transparent)] md:mt-8 md:[mask-image:none]"
			>
				{FILTERS.map((f) => {
					const active = filter === f.id;
					return (
						<button
							key={f.id}
							role="tab"
							aria-selected={active}
							onClick={() => setFilter(f.id)}
							className={cn(
								"h-10 shrink-0 rounded-lg border px-4 text-base font-bold transition-colors md:h-11",
								active ? "border-primary-500 text-white" : "border-transparent text-white/60 hover:text-white",
							)}
						>
							{f.label}
							{f.id === "unread" && unread > 0 && (
								<span className="ml-2 rounded-full bg-primary-500 px-1.5 py-0.5 text-xs font-medium text-white">{unread}</span>
							)}
						</button>
					);
				})}
			</div>

			{signedIn === false && (
				<div className="animate-rise mt-6 flex flex-col gap-3 rounded-xl border border-primary-500/30 bg-primary-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="flex items-start gap-3 text-sm leading-6 text-white/85">
						<LogIn className="mt-0.5 size-5 shrink-0 text-primary-400" aria-hidden />
						Notifications are for builders: review decisions and first contributions on your projects.
					</p>
					<Button asChild size="sm" className="w-auto shrink-0 px-5">
						<Link href={`${routes.signIn}?next=${encodeURIComponent(routes.notifications)}`}>Builder sign in</Link>
					</Button>
				</div>
			)}

			<div className="mt-6 flex flex-col gap-3 md:mt-8 md:gap-6" aria-live="polite" aria-busy={query.isPending}>
				{signedIn === false ? null : query.isPending ? (
					Array.from({ length: 4 }, (_, i) => <NotificationCardSkeleton key={i} />)
				) : query.isError ? (
					<ErrorState
						title="Couldn’t load notifications"
						message={errorMessage(query.error)}
						onRetry={() => query.refetch()}
						retrying={query.isRefetching}
					/>
				) : items.length === 0 ? (
					<EmptyState
						icon={<BellOff className="size-6" aria-hidden />}
						title="No notifications"
						description={EMPTY_COPY[filter]}
					/>
				) : (
					items.map((n, i) => (
						<NotificationCard key={n.id} notification={n} index={i} onOpen={() => !n.readAt && markRead.mutate(n.id)} />
					))
				)}
			</div>

			{query.hasNextPage && (
				<div className="mt-8 flex justify-center">
					<Button
						variant="outline"
						size="md"
						className="min-w-[160px]"
						onClick={() => query.fetchNextPage()}
						isLoading={query.isFetchingNextPage}
						loadingLabel="Loading more"
					>
						Load more
					</Button>
				</div>
			)}
		</section>
	);
}
