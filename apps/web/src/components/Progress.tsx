import { cn } from "@repo/ui/lib/utils";

/** Funding progress (confirmed only). Over 100% stays full and turns green; the number can exceed 100 (D3). */
export function Progress({ percent, className, label }: { percent: number | null; className?: string; label?: string }) {
	if (percent === null) return null;
	const width = Math.min(Math.max(percent, 0), 100);
	return (
		<div
			role="progressbar"
			aria-valuenow={Math.min(percent, 100)}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label ?? `${percent}% of target`}
			className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}
		>
			<div
				className={cn(
					"h-full rounded-full transition-[width] duration-700 ease-(--ease-settle)",
					percent >= 100 ? "bg-success-300" : "bg-primary-500",
				)}
				style={{ width: `${width}%` }}
			/>
		</div>
	);
}
