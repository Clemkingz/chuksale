"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * A number that counts up from zero when it first appears (stat cards). The real value is rendered
 * first, so it's correct without JavaScript and with reduced motion; only the text is animated.
 */
export function AnimatedNumber({
	value,
	format = (n) => String(Math.round(n)),
}: {
	value: number;
	format?: (n: number) => string;
}) {
	const ref = useRef<HTMLSpanElement>(null);
	const formatRef = useRef(format);

	useEffect(() => {
		formatRef.current = format;
	});

	// Before paint, so the final value never flashes ahead of the count.
	useLayoutEffect(() => {
		const node = ref.current;
		if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) return;
		const from = Number(node.dataset.shown ?? 0);
		const start = performance.now();
		const duration = 700;
		node.textContent = formatRef.current(from);
		let frame = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - (1 - t) ** 3;
			node.textContent = formatRef.current(from + (value - from) * eased);
			if (t < 1) frame = requestAnimationFrame(tick);
			else node.dataset.shown = String(value);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [value]);

	return (
		<span ref={ref} className="tabular-nums">
			{format(value)}
		</span>
	);
}
