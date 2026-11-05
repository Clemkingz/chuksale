import type { ProjectStatus } from "@repo/domain/types";
import { PROJECT_STATUS_LABEL } from "@repo/domain/labels";
import { cn } from "@repo/ui/lib/utils";

/** Approval status of a project. Copy from @repo/domain/labels; colour by meaning (PRD §13). */
const TONE: Record<ProjectStatus, string> = {
	draft: "bg-white/8 text-white/70 ring-white/15",
	submitted: "bg-info-400/10 text-info-200 ring-info-400/25",
	under_review: "bg-info-400/10 text-info-200 ring-info-400/25",
	changes_requested: "bg-warning-400/10 text-warning-200 ring-warning-400/25",
	approved: "bg-success-400/10 text-success-200 ring-success-400/25",
	rejected: "bg-error-400/10 text-error-200 ring-error-400/25",
	archived: "bg-white/5 text-white/50 ring-white/10",
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs whitespace-nowrap ring-1 ring-inset",
				TONE[status],
				className,
			)}
		>
			<span aria-hidden className="size-1.5 rounded-full bg-current" />
			{PROJECT_STATUS_LABEL[status]}
		</span>
	);
}
