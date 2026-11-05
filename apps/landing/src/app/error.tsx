"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";

/** Something on the page threw: say so, and offer a retry (Next 16 passes `retry`). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="custom-container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
			<h1 className="h2-app">Something went wrong</h1>
			<p className="max-w-[420px] text-neutral-900">
				This page hit a problem. Try again, or come back in a moment.
				{error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
			</p>
			<div className="mt-4 flex flex-wrap justify-center gap-3">
				<Button onClick={retry} className="w-[180px]">
					Try again
				</Button>
				<Button asChild variant="outline" className="w-[180px]">
					<Link href="/">Go home</Link>
				</Button>
			</div>
		</div>
	);
}
