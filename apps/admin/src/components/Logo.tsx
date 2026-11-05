import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";

/** Chucksales wordmark (design export), linking to the console home. */
export function Logo({ className }: { className?: string }) {
	return (
		<Link href="/" aria-label="Chucksales admin home" className={cn("inline-flex shrink-0", className)}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src="/images/logo.svg" alt="Chucksales" width={192} height={50} className="h-auto w-[150px] md:w-[172px]" />
		</Link>
	);
}
