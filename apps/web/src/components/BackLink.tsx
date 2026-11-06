import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

/**
 * "← Back to …" at the top of a page: always the page's parent (a real link, so it works after a reload or from a
 * shared URL, unlike history.back()). One look across the app.
 */
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
	return (
		<Link
			href={href}
			className={cn(
				"group inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-white/60 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none",
				className,
			)}
		>
			<ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
			{label}
		</Link>
	);
}
