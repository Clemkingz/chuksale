import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import type { ContributionStatus } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";

/** Contribution status: icon + label + colour (never colour alone). Pending never looks like funded. */
export const STATUS_TONE: Record<ContributionStatus, string> = {
	created: "text-white/70",
	awaiting_wallet: "text-white/70",
	pending: "text-warning-200",
	confirmed: "text-success-200",
	failed: "text-error-200",
	expired: "text-white/55",
	cancelled: "text-white/55",
};

export function ContributionStatusPill({ status, className }: { status: ContributionStatus; className?: string }) {
	const Icon =
		status === "confirmed"
			? CheckCircle2
			: status === "pending" || status === "created" || status === "awaiting_wallet"
				? Clock
				: XCircle;
	return (
		<span className={cn("inline-flex items-center gap-1.5 text-sm whitespace-nowrap", STATUS_TONE[status], className)}>
			<Icon className="size-4 shrink-0" aria-hidden />
			{CONTRIBUTION_STATUS_LABEL[status]}
		</span>
	);
}
