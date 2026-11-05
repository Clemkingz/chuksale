"use client";

import { useEffect, useState } from "react";

/**
 * Design column "Time left" (01:45:30). Ticks every second under a day; days + hours above that. No end date
 * (not live yet, or no window set) shows a dash. D20: the end date is a PENDING product decision.
 */
function format(ms: number) {
	const s = Math.floor(ms / 1000);
	const d = Math.floor(s / 86_400);
	const h = Math.floor((s % 86_400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const pad = (n: number) => String(n).padStart(2, "0");
	if (d >= 1) return `${d}d ${pad(h)}h ${pad(m)}m`;
	return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

export function TimeLeft({ endsAt }: { endsAt: string | null }) {
	const [now, setNow] = useState<number | null>(null);
	const end = endsAt ? new Date(endsAt).getTime() : null;
	const left = end !== null && now !== null ? end - now : null;
	const urgent = left !== null && left > 0 && left < 86_400_000;

	useEffect(() => {
		if (end === null) return;
		const tick = () => setNow(Date.now());
		const first = setTimeout(tick, 0); // after mount: server and client render the same placeholder
		const id = setInterval(tick, urgent ? 1000 : 30_000);
		return () => {
			clearTimeout(first);
			clearInterval(id);
		};
	}, [end, urgent]);

	if (end === null) return <span className="text-white/40">—</span>;
	if (left === null) return <span className="text-white/40">…</span>;
	if (left <= 0) return <span className="text-white/55">Ended</span>;
	return (
		<time
			dateTime={endsAt!}
			title={new Date(end).toLocaleString()}
			className={urgent ? "text-warning-200 tabular-nums" : "tabular-nums"}
		>
			{format(left)}
		</time>
	);
}
