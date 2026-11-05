"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

/** Design: "Page 1 of 5" with ‹ › arrows (dashboard, project lists, histories). */
export function Pager({
	page,
	pages,
	onPage,
	className,
}: {
	page: number;
	pages: number;
	onPage: (p: number) => void;
	className?: string;
}) {
	if (pages <= 1) return null;
	return (
		<nav
			aria-label="Pagination"
			className={cn("mt-8 flex items-center justify-center gap-6 text-base md:mt-10 md:text-lg", className)}
		>
			<p aria-live="polite">
				Page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{pages}</span>
			</p>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onPage(page - 1)}
					disabled={page <= 1}
					aria-label="Previous page"
					className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
				>
					<ChevronLeft className="size-5" />
				</button>
				<button
					type="button"
					onClick={() => onPage(page + 1)}
					disabled={page >= pages}
					aria-label="Next page"
					className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
				>
					<ChevronRight className="size-5" />
				</button>
			</div>
		</nav>
	);
}
