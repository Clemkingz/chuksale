"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 1400;
const format = (n: number) => n.toLocaleString("en-US");

/**
 * A number that counts up from 0 the first time it scrolls into view. The server renders the final value (so it's
 * right without JS and for crawlers); the count writes to the DOM directly, no re-renders. Off for reduced motion.
 */
export function CountUp({ value }: { value: number }) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		el.textContent = format(0);

		let frame = 0;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				const start = performance.now();
				const tick = (now: number) => {
					const t = Math.min(1, (now - start) / DURATION_MS);
					const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart: fast start, gentle landing
					el.textContent = format(Math.round(value * eased));
					if (t < 1) frame = requestAnimationFrame(tick);
				};
				frame = requestAnimationFrame(tick);
			},
			{ threshold: 0.6 },
		);
		observer.observe(el);
		return () => {
			observer.disconnect();
			cancelAnimationFrame(frame);
			el.textContent = format(value);
		};
	}, [value]);

	return (
		<span ref={ref} className="tabular-nums">
			{format(value)}
		</span>
	);
}
