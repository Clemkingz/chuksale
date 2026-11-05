import Link from "next/link";
import { Button } from "@repo/ui/button";

/** 404. TODO(Phase 1): restyle from the reference design. */
export default function NotFound() {
	return (
		<div className="custom-container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
			<h1 className="text-[64px] font-bold text-primary-500 lg:text-[128px]">404</h1>
			<p className="max-w-[460px] text-neutral-900">This page doesn&apos;t exist, or isn&apos;t public.</p>
			<Button asChild className="mt-4 w-[180px]">
				<Link href="/">Go home</Link>
			</Button>
		</div>
	);
}
