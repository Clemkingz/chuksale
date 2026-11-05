import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";
import { withBasePath } from "@/lib/site";

/** The Chucksales wordmark (design export, 192×50). */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
	return (
		<Link href={href} aria-label="Chucksales home" className={cn("inline-flex shrink-0", className)}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={withBasePath("/images/logo.svg")}
				alt="Chucksales"
				width={192}
				height={50}
				className="h-auto w-[132px] md:w-[164px]"
			/>
		</Link>
	);
}
