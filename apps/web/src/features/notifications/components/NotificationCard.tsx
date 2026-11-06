"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { timeAgo } from "@/lib/time";
import type { Inbox, InboxItem } from "@/features/notifications/hooks";
import { NOTIFICATION_META, isDecision, notificationHref } from "@/features/notifications/meta";

/**
 * Design: #212121 card, white avatar circle, bold title, then "See why ▪ 2h ago". The whole card links to the project;
 * opening it marks it read. Unread cards carry a periwinkle dot and a slightly lighter surface.
 */
export function NotificationCard({
	notification: n,
	inbox,
	index,
	onOpen,
}: {
	notification: InboxItem;
	inbox: Inbox;
	index: number;
	onOpen: () => void;
}) {
	const meta = NOTIFICATION_META[n.type] ?? { Icon: Bell, action: "Open" };
	const { Icon, tone } = meta;
	const unread = !n.readAt;
	const href = notificationHref(n, inbox);
	const quoted = isDecision(n);
	const body = (
		<>
			<span
				className={cn(
					"flex size-11 shrink-0 items-center justify-center rounded-full bg-white sm:size-[50px]",
					tone === "bad" ? "text-error-400" : tone === "warn" ? "text-warning-500" : "text-primary-500",
				)}
				aria-hidden
			>
				<Icon className="size-5 sm:size-6" />
			</span>
			<span className="min-w-0 flex-1">
				<span
					className={cn(
						"block text-[15px] leading-snug sm:text-lg",
						unread ? "font-bold text-white" : "font-medium text-white/80",
					)}
				>
					{n.title}
				</span>
				{n.body &&
					(quoted ? (
						// The reviewer's note. Plain text, never HTML; keeps line breaks.
						<span
							className={cn(
								"mt-2 block rounded-lg border-l-2 px-3 py-2 text-sm leading-6 break-words whitespace-pre-line text-white/85",
								tone === "bad" ? "border-error-300 bg-error-400/[0.08]" : "border-warning-300 bg-warning-400/[0.07]",
							)}
						>
							<span className="sr-only">Note: </span>
							{n.body}
						</span>
					) : (
						<span className="mt-1.5 block text-sm leading-6 break-words whitespace-pre-line text-white/70">{n.body}</span>
					))}
				<span className="mt-2 flex items-center gap-2.5 text-sm text-white/85 sm:mt-3 sm:text-base">
					{href && <span className="text-white group-hover:text-primary-300">{meta.action}</span>}
					{href && <span className="size-1.5 bg-white" aria-hidden />}
					<time dateTime={n.createdAt} className="text-white/70">
						{timeAgo(n.createdAt)}
					</time>
				</span>
			</span>
			{unread && (
				<span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary-500 shadow-[0_0_0_4px_rgb(104_140_236/0.2)]">
					<span className="sr-only">Unread</span>
				</span>
			)}
		</>
	);
	const className = cn(
		"group animate-rise flex items-start gap-4 rounded-xl p-4 transition-colors sm:gap-6 sm:px-5 sm:py-5",
		unread ? "bg-[#262626] hover:bg-[#2c2c2c]" : "bg-[#212121] hover:bg-[#262626]",
		"focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none",
	);
	const style = { "--i": Math.min(index, 8) } as React.CSSProperties;

	return href ? (
		<Link href={href} onClick={onOpen} className={className} style={style}>
			{body}
		</Link>
	) : (
		<button type="button" onClick={onOpen} className={cn(className, "w-full text-left")} style={style}>
			{body}
		</button>
	);
}

export function NotificationCardSkeleton() {
	return (
		<div className="flex items-start gap-4 rounded-xl bg-[#212121] p-4 sm:gap-6 sm:px-5 sm:py-5" aria-hidden>
			<span className="skeleton-shimmer size-11 shrink-0 rounded-full sm:size-[50px]" />
			<span className="flex-1 space-y-3 pt-1">
				<span className="skeleton-shimmer block h-4 w-4/5 rounded" />
				<span className="skeleton-shimmer block h-3 w-1/3 rounded" />
			</span>
		</div>
	);
}
