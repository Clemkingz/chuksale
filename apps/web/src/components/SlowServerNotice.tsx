"use client";

import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

/**
 * The staging API sleeps when idle and can take up to a minute to wake. When anything has been loading for more
 * than 4 seconds, say so instead of leaving an unexplained spinner. Disappears as soon as loading finishes.
 */
export function SlowServerNotice() {
	const fetching = useIsFetching() > 0;
	const [slow, setSlow] = useState(false);

	useEffect(() => {
		if (!fetching) {
			const reset = setTimeout(() => setSlow(false), 0);
			return () => clearTimeout(reset);
		}
		const t = setTimeout(() => setSlow(true), 4000);
		return () => clearTimeout(t);
	}, [fetching]);

	if (!slow || !fetching) return null;
	return (
		<div
			role="status"
			aria-live="polite"
			className="animate-rise fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[#16161F]/95 px-4 py-2.5 text-sm text-white/85 shadow-2xl shadow-black/40 backdrop-blur"
		>
			<Loader2 className="size-4 shrink-0 animate-spin text-primary-300" aria-hidden />
			<span>Waking up the server. This can take up to a minute the first time.</span>
		</div>
	);
}
