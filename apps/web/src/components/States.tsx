import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

/** Empty and error states (PRD §13: clear empty state for every list; errors always offer a way forward). */

export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon?: ReactNode;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"animate-rise flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center",
				className,
			)}
		>
			<span className="flex size-14 items-center justify-center rounded-full bg-primary-500/10 text-primary-400">
				{icon ?? <Inbox className="size-6" aria-hidden />}
			</span>
			<h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
			{description && <p className="mt-2 max-w-[380px] text-sm leading-6 text-white/60">{description}</p>}
			{action && <div className="mt-6">{action}</div>}
		</div>
	);
}

export function ErrorState({
	title = "Something went wrong",
	message,
	onRetry,
	retrying,
	className,
}: {
	title?: string;
	message: string;
	onRetry?: () => void;
	retrying?: boolean;
	className?: string;
}) {
	return (
		<div
			role="alert"
			className={cn(
				"animate-rise flex flex-col items-center rounded-2xl border border-error-400/25 bg-error-400/5 px-6 py-12 text-center",
				className,
			)}
		>
			<span className="flex size-14 items-center justify-center rounded-full bg-error-400/10 text-error-300">
				<AlertTriangle className="size-6" aria-hidden />
			</span>
			<h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
			<p className="mt-2 max-w-[380px] text-sm leading-6 text-white/65">{message}</p>
			{onRetry && (
				<Button
					variant="outline"
					size="md"
					className="mt-6 min-w-[140px]"
					onClick={onRetry}
					isLoading={retrying}
					loadingLabel="Retrying"
				>
					Try again
				</Button>
			)}
		</div>
	);
}
