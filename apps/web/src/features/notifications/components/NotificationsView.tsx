"use client";

import { useState } from "react";
import Link from "next/link";
import { BellOff, LogIn, UserRound, Wallet } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { BackLink } from "@/components/BackLink";
import { EmptyState, ErrorState } from "@/components/States";
import { NotificationCard, NotificationCardSkeleton } from "@/features/notifications/components/NotificationCard";
import {
	useInboxes,
	useMarkAllRead,
	useMarkRead,
	useNotifications,
	useUnreadCount,
	type Inbox,
	type NotificationFilter,
} from "@/features/notifications/hooks";
import { useRequireWallet } from "@/features/wallet/hooks";

const FILTERS: { id: NotificationFilter; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
];

const EMPTY_COPY: Record<Inbox, Record<NotificationFilter, string>> = {
	builder: {
		all: "Review decisions on your projects and contributions they receive show up here.",
		unread: "You’re all caught up. New updates will show up here.",
	},
	wallet: {
		all: "Payment confirmations, moderation of your suggestions and updates from projects you backed show up here.",
		unread: "You’re all caught up. New updates will show up here.",
	},
};

const INBOX_LABEL: Record<Inbox, string> = { builder: "Builder account", wallet: "My wallet" };

/**
 * Design: "Notifications" heading, filter chips, then a stack of cards. Two inboxes: the builder account and the
 * connected wallet; with both, a switch picks one.
 */
export function NotificationsView() {
	const inboxes = useInboxes();
	const available = (["builder", "wallet"] as Inbox[]).filter((i) => inboxes[i]);
	const [chosen, setChosen] = useState<Inbox | null>(null);
	const inbox: Inbox = chosen && inboxes[chosen] ? chosen : (available[0] ?? "builder");
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const query = useNotifications(inbox, filter);
	const markRead = useMarkRead(inbox);
	const markAll = useMarkAllRead(inbox);
	const { data: unread = 0 } = useUnreadCount(inbox);
	const builderUnread = useUnreadCount("builder").data ?? 0;
	const walletUnread = useUnreadCount("wallet").data ?? 0;
	const openWallet = useRequireWallet();
	const items = query.data?.pages.flatMap((p) => p.result) ?? [];
	const none = inboxes.ready && available.length === 0;

	return (
		<section className="app-container animate-page max-w-[1030px] py-10 md:py-[72px]">
			<BackLink
				href={inbox === "builder" && inboxes.builder ? routes.dashboard : routes.home}
				label={inbox === "builder" && inboxes.builder ? "Dashboard" : "Home"}
			/>
			<div className="mt-3 flex flex-wrap items-end justify-between gap-4">
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

			{available.length > 1 && (
				<div role="tablist" aria-label="Inbox" className="mt-6 inline-flex rounded-xl bg-white/[0.05] p-1">
					{available.map((i) => (
						<button
							key={i}
							type="button"
							role="tab"
							aria-selected={inbox === i}
							onClick={() => setChosen(i)}
							className={cn(
								"flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
								inbox === i ? "bg-primary-500 text-white" : "text-white/65 hover:text-white",
							)}
						>
							{i === "builder" ? <UserRound className="size-4" aria-hidden /> : <Wallet className="size-4" aria-hidden />}
							{INBOX_LABEL[i]}
							{(i === "builder" ? builderUnread : walletUnread) > 0 && (
								<span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">
									{i === "builder" ? builderUnread : walletUnread}
								</span>
							)}
						</button>
					))}
				</div>
			)}

			{!none && (
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
			)}

			{none && (
				<div className="animate-rise mt-8 grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#131318] p-5">
						<p className="flex items-start gap-3 text-sm leading-6 text-white/85">
							<Wallet className="mt-0.5 size-5 shrink-0 text-primary-400" aria-hidden />
							Contributors: connect your wallet to see payment confirmations, moderation of your suggestions and updates from
							projects you support.
						</p>
						<Button className="mt-auto w-auto self-start px-5" onClick={() => openWallet(() => undefined)}>
							Connect wallet
						</Button>
					</div>
					<div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#131318] p-5">
						<p className="flex items-start gap-3 text-sm leading-6 text-white/85">
							<LogIn className="mt-0.5 size-5 shrink-0 text-primary-400" aria-hidden />
							Builders: sign in for review decisions and contributions on your projects.
						</p>
						<Button asChild variant="outline" className="mt-auto w-auto self-start px-5">
							<Link href={`${routes.signIn}?next=${encodeURIComponent(routes.notifications)}`}>Builder sign in</Link>
						</Button>
					</div>
				</div>
			)}

			<div className="mt-6 flex flex-col gap-3 md:mt-8 md:gap-6" aria-live="polite" aria-busy={query.isPending}>
				{none || !inboxes.ready ? null : query.isPending ? (
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
						description={EMPTY_COPY[inbox][filter]}
					/>
				) : (
					items.map((n, i) => (
						<NotificationCard
							key={n.id}
							notification={n}
							inbox={inbox}
							index={i}
							onOpen={() => !n.readAt && markRead.mutate(n.id)}
						/>
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
