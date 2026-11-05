"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { useUnreadCount } from "@/features/notifications/hooks";

/** Design: bell in a #333 circle. The badge pops in when the count changes. */
export function NotificationBell({ className }: { className?: string }) {
	const { data: count = 0 } = useUnreadCount();
	return (
		<Link
			href={routes.notifications}
			aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
			className={cn(
				"relative flex size-11 items-center justify-center rounded-full bg-[#333333] text-white transition-colors hover:bg-[#3d3d3d] focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none md:size-[50px]",
				className,
			)}
		>
			<Bell className="size-5 md:size-6" strokeWidth={1.8} />
			{count > 0 && (
				<span
					key={count}
					className="animate-pop absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-bold ring-2 ring-surface-900"
				>
					{count > 9 ? "9+" : count}
				</span>
			)}
		</Link>
	);
}
