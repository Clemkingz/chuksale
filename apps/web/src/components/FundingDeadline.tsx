"use client";

import { CalendarClock, Hourglass } from "lucide-react";
import type { PublicFunding } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { deadlineDate, timeLeft } from "@/lib/time";
import { useNow } from "@/lib/use-now";

/**
 * The funding deadline from `funding.endsAt` / `funding.ended`: "12 days left" (amber when under three days), or
 * "Funding ended". Nothing when the project has no deadline. `variant="detail"` adds the date.
 */
export function FundingDeadline({
	funding,
	variant = "chip",
	className,
}: {
	funding: Pick<PublicFunding, "endsAt" | "ended"> | null | undefined;
	variant?: "chip" | "detail";
	className?: string;
}) {
	const now = useNow();
	if (!funding?.endsAt) return null;
	if (!now && !funding.ended) return null;
	const left = funding.ended ? { ended: true, soon: true, label: "Funding ended" } : timeLeft(funding.endsAt, now);
	const Icon = left.ended ? CalendarClock : Hourglass;

	if (variant === "detail")
		return (
			<p
				className={cn(
					"flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm",
					left.ended
						? "bg-white/[0.05] text-white/75"
						: left.soon
							? "bg-warning-400/10 text-warning-100"
							: "bg-white/[0.04] text-white/80",
					className,
				)}
			>
				<Icon className="size-4 shrink-0" aria-hidden />
				<span>
					<span className="font-medium">{left.label}</span>
					<span className="text-white/55">
						{" "}
						· {left.ended ? "Ended" : "Ends"} {deadlineDate(funding.endsAt)}
					</span>
				</span>
			</p>
		);

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs backdrop-blur",
				left.ended ? "bg-black/50 text-white/80" : left.soon ? "bg-warning-400/25 text-warning-100" : "bg-black/40 text-white",
				className,
			)}
		>
			<Icon className="size-3" aria-hidden /> {left.label}
		</span>
	);
}
