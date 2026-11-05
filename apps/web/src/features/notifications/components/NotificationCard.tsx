"use client";

import Link from "next/link";
import { BadgeCheck, Bell, CircleX, FolderPlus, MessageSquareText, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import type { Notification, NotificationType } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { timeAgo } from "@/lib/time";

/** Icon per type, in the design's white avatar circle; failures and rejections read red. */
const ICON: Record<NotificationType, { Icon: LucideIcon; tone?: "bad" }> = {
	project_published: { Icon: Sparkles },
	submission_received: { Icon: FolderPlus },
	project_approved: { Icon: BadgeCheck },
	project_rejected: { Icon: CircleX, tone: "bad" },
	changes_requested: { Icon: MessageSquareText },
	funding_milestone: { Icon: TrendingUp },
	contribution_confirmed: { Icon: BadgeCheck },
	contribution_failed: { Icon: CircleX, tone: "bad" },
	suggestion_published: { Icon: MessageSquareText },
	suggestion_rejected: { Icon: CircleX, tone: "bad" },
};

/**
 * Design: #212121 card, white avatar circle, bold title, then "Contribute ▪ 2h ago". The whole card is the link to
 * the action; opening it marks it read. Unread cards carry a periwinkle dot and a slightly lighter surface.
 */
export function NotificationCard({
	notification,
	index,
	onOpen,
}: {
	notification: Notification;
	index: number;
	onOpen: () => void;
}) {
	const { Icon, tone } = ICON[notification.type] ?? { Icon: Bell };
	const unread = !notification.read_at;
	const body = (
		<>
			<span
				className={cn(
					"flex size-11 shrink-0 items-center justify-center rounded-full bg-white sm:size-[50px]",
					tone === "bad" ? "text-error-400" : "text-primary-500",
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
					{notification.title}
				</span>
				{notification.body && (
					// The admin's reason (rejections, change requests). Plain text, never HTML.
					<span
						className={cn(
							"mt-2 block rounded-lg border-l-2 px-3 py-2 text-sm leading-6 break-words text-white/85",
							tone === "bad" ? "border-error-300 bg-error-400/[0.08]" : "border-warning-300 bg-warning-400/[0.07]",
						)}
					>
						<span className="sr-only">Reason: </span>“{notification.body}”
					</span>
				)}
				<span className="mt-2 flex items-center gap-2.5 text-sm text-white/85 sm:mt-3 sm:text-base">
					{notification.action && <span className="text-white group-hover:text-primary-300">{notification.action.label}</span>}
					{notification.action && <span className="size-1.5 bg-white" aria-hidden />}
					<time dateTime={notification.created_at} className="text-white/70">
						{timeAgo(notification.created_at)}
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

	return notification.action ? (
		<Link href={notification.action.href} onClick={onOpen} className={className} style={style}>
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
