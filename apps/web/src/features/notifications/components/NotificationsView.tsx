"use client";

import { useState } from "react";
import Link from "next/link";
import { BellOff, Wallet } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState } from "@/components/States";
import { useWalletDialog } from "@/features/wallet/dialog-store";
import { NotificationCard, NotificationCardSkeleton } from "@/features/notifications/components/NotificationCard";
import {
	useInboxIdentity,
	useMarkAllRead,
	useMarkRead,
	useNotifications,
	type NotificationFilter,
} from "@/features/notifications/hooks";

const FILTERS: { id: NotificationFilter; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
	{ id: "projects", label: "Projects" },
	{ id: "contributions", label: "Contributions" },
	{ id: "suggestions", label: "Suggestions" },
];

const EMPTY_COPY: Record<NotificationFilter, string> = {
	all: "When projects open, your contributions confirm or builders review your suggestions, you’ll see it here.",
	unread: "You’re all caught up. New updates will show up here.",
	projects: "No project updates yet.",
	contributions: "No contribution updates yet. Confirmed and failed contributions show up here.",
	suggestions: "No suggestion updates yet.",
	account: "No account updates yet.",
};

/** Design: "Notifications" heading, an "All" chip (outlined when active), then a stack of cards. */
export function NotificationsView() {
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const identity = useInboxIdentity();
	const query = useNotifications(filter);
	const markRead = useMarkRead();
	const markAll = useMarkAllRead();
	const showWallet = useWalletDialog((s) => s.show);

	const first = query.data?.pages[0];
	const items = query.data?.pages.flatMap((p) => p.items) ?? [];
	const unread = first?.unread_count ?? 0;

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

			{identity.ready && !identity.wallet && (
				<div className="animate-rise mt-6 flex flex-col gap-3 rounded-xl border border-primary-500/30 bg-primary-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="flex items-start gap-3 text-sm leading-6 text-white/85">
						<Wallet className="mt-0.5 size-5 shrink-0 text-primary-400" aria-hidden />
						<span>
							Connect a wallet to see updates on your contributions and suggestions.
							{!identity.signedIn && (
								<>
									{" "}
									Builders can{" "}
									<Link href={routes.signIn} className="text-primary-300 underline-offset-4 hover:underline">
										sign in
									</Link>{" "}
									for project updates.
								</>
							)}
						</span>
					</p>
					<Button
						size="sm"
						className="shrink-0"
						onClick={() => showWallet("Connect your wallet to see notifications about your contributions and suggestions.")}
					>
						Connect wallet
					</Button>
				</div>
			)}

			<div className="mt-6 flex flex-col gap-3 md:mt-8 md:gap-6" aria-live="polite" aria-busy={query.isPending}>
				{query.isPending ? (
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
						<NotificationCard key={n.id} notification={n} index={i} onOpen={() => !n.read_at && markRead.mutate(n.id)} />
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
