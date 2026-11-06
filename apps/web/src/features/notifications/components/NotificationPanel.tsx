"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { timeAgo } from "@/lib/time";
import { NOTIFICATION_META, isDecision, notificationHref } from "@/features/notifications/meta";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "@/features/notifications/hooks";

/**
 * The builder bar's notification bar: the bell opens a panel with the latest notifications. Rejections and change
 * requests show the admin's reason right there (plain text), and open the project's status page.
 */
export function NotificationPanel() {
	const [open, setOpen] = useState(false);
	const { data: count = 0 } = useUnreadCount("builder");
	const list = useNotifications("builder", "all", 6);
	const markRead = useMarkRead("builder");
	const markAll = useMarkAllRead("builder");
	const items = list.data?.pages[0]?.result ?? [];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
				className="relative flex size-11 items-center justify-center rounded-full bg-[#333333] text-white transition-colors hover:bg-[#3d3d3d] focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none data-[state=open]:bg-[#3d3d3d]"
			>
				<Bell className="size-5" strokeWidth={1.8} />
				{count > 0 && (
					<span
						key={count}
						className="animate-pop absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-bold ring-2 ring-surface-900"
					>
						{count > 9 ? "9+" : count}
					</span>
				)}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={10}
				className="w-[min(400px,calc(100vw-1.5rem))] rounded-2xl border-white/10 bg-[#131318] p-0 text-white shadow-2xl shadow-black/50"
			>
				<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
					<p className="font-display text-lg font-bold">Notifications</p>
					{count > 0 && (
						<button
							type="button"
							onClick={() => markAll.mutate()}
							className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-primary-300 hover:bg-white/5"
						>
							<CheckCheck className="size-3.5" /> Mark all read
						</button>
					)}
				</div>
				<div className="max-h-[min(460px,70vh)] overflow-y-auto">
					{list.isPending ? (
						<div className="flex flex-col gap-2 p-3" aria-hidden>
							{[0, 1, 2].map((k) => (
								<span key={k} className="skeleton-shimmer block h-16 rounded-xl" />
							))}
						</div>
					) : list.isError ? (
						<p className="px-4 py-6 text-sm text-error-200">{errorMessage(list.error)}</p>
					) : items.length === 0 ? (
						<p className="px-4 py-10 text-center text-sm text-white/55">No notifications yet.</p>
					) : (
						<ul className="divide-y divide-white/5">
							{items.map((n) => {
								const bad = NOTIFICATION_META[n.type]?.tone === "bad";
								const href = notificationHref(n, "builder");
								const content = (
									<>
										<span
											className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary-500")}
											aria-hidden
										/>
										<span className="min-w-0 flex-1">
											<span className={cn("block text-sm leading-snug", n.readAt ? "text-white/75" : "font-medium text-white")}>
												{n.title}
											</span>
											{n.body && (
												<span
													className={cn(
														"mt-1.5 line-clamp-3 block text-[13px] leading-5 break-words whitespace-pre-line text-white/80",
														isDecision(n) && "rounded-md border-l-2 px-2.5 py-1.5",
														isDecision(n) &&
															(bad ? "border-error-300 bg-error-400/[0.08]" : "border-warning-300 bg-warning-400/[0.07]"),
													)}
												>
													{n.body}
												</span>
											)}
											<span className="mt-1.5 block text-xs text-white/45">
												{href ? `${NOTIFICATION_META[n.type]?.action ?? "Open"} · ` : ""}
												{timeAgo(n.createdAt)}
											</span>
										</span>
									</>
								);
								const onOpen = () => {
									if (!n.readAt) markRead.mutate(n.id);
									setOpen(false);
								};
								return (
									<li key={n.id}>
										{href ? (
											<Link href={href} onClick={onOpen} className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]">
												{content}
											</Link>
										) : (
											<button
												type="button"
												onClick={onOpen}
												className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
											>
												{content}
											</button>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</div>
				<Link
					href={routes.notifications}
					onClick={() => setOpen(false)}
					className="block border-t border-white/10 px-4 py-3 text-center text-sm text-primary-300 hover:bg-white/[0.03]"
				>
					See all notifications
				</Link>
			</PopoverContent>
		</Popover>
	);
}
