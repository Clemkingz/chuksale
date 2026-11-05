import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";

/** The Chucksales wordmark (design export, 192×50). Plain <img>: it's an SVG wrapping a raster mark. */
export function Logo({ className }: { className?: string }) {
	return (
		<Link href="/" aria-label="Chucksales home" className={cn("inline-flex shrink-0", className)}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src="/images/logo.svg" alt="Chucksales" width={192} height={50} className="h-auto w-[140px] md:w-[164px]" />
		</Link>
	);
}
