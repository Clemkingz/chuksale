"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@repo/ui/button";

/** A page threw. Say so plainly, offer a retry (Next 16 passes `retry`) and a way home. Never shows stack traces. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="app-container flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
			<div className="animate-pop flex size-16 items-center justify-center rounded-full bg-error-400/10 text-error-300">
				<svg
					viewBox="0 0 24 24"
					className="size-8"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden
				>
					<path d="M12 8v5" />
					<path d="M12 16.5h.01" />
					<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
				</svg>
			</div>
			<h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">Something went wrong</h1>
			<p className="mt-3 max-w-[440px] text-white/65">
				This page hit a problem. Nothing was sent from your wallet. Try again, or head back to projects.
			</p>
			{error.digest && <p className="mt-2 text-xs text-white/40">Reference: {error.digest}</p>}
			<div className="mt-8 flex w-full max-w-[400px] flex-col gap-3 sm:flex-row">
				<Button onClick={retry} className="sm:flex-1">
					<RotateCw className="size-4" /> Try again
				</Button>
				<Button asChild variant="outline" className="sm:flex-1">
					<Link href="/projects">Explore projects</Link>
				</Button>
			</div>
		</div>
	);
}
