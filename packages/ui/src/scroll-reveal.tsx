"use client";

import { useEffect } from "react";

/**
 * Scroll animations for every app (mounted once in each root layout). Markup opts in with attributes; the
 * styles live in globals.css ("Scroll reveal"):
 *
 * - `data-reveal="up|down|left|right|zoom|fade"` (+ `style={{ "--d": n }}` to stagger by n × 90 ms): hidden until it
 *   scrolls into view, then animates in once. Content already on screen at load reveals straight away.
 * - `data-progress`: gets `--progress` (0→1) while it passes through the viewport (timelines, progress rules).
 * - `data-parallax="0.25"`: drifts at that fraction of the scroll (hero backgrounds). Keep it to one or two per page.
 *
 * New elements (client-side navigation, lists that load later) are picked up by a MutationObserver, so pages
 * don't have to do anything but add the attributes. Reduced motion: everything is shown as is.
 */

/** Pre-paint: hide `[data-reveal]` before first paint (no flash). If the JS never runs, show everything after 3 s. */
export const SCROLL_REVEAL_INIT = `(()=>{var d=document.documentElement;d.classList.add("reveal-ready");setTimeout(function(){if(!d.classList.contains("reveal-live"))d.classList.remove("reveal-ready")},3000)})()`;

/** Put in <head> of the root layout: `<ScrollRevealScript />`. */
export function ScrollRevealScript() {
	return <script dangerouslySetInnerHTML={{ __html: SCROLL_REVEAL_INIT }} />;
}

const SELECTOR = "[data-reveal]:not([data-revealed]), [data-progress], [data-parallax]";

export function ScrollReveal() {
	useEffect(() => {
		const root = document.documentElement;
		root.classList.add("reveal-ready", "reveal-live");
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// Marking an element before React has hydrated it is a hydration mismatch (an attribute the server didn't
		// render). React tags hydrated nodes with a `__reactFiber$…` key, so wait for that (giving up after 4 s).
		const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
		const waiting = new Map<Element, number>();
		let retry = 0;
		const markRevealed = (el: Element) => {
			if (hydrated(el) || (waiting.get(el) ?? Date.now()) + 4000 < Date.now()) {
				waiting.delete(el);
				el.setAttribute("data-revealed", "");
				return;
			}
			if (!waiting.has(el)) waiting.set(el, Date.now());
			if (!retry)
				retry = window.setTimeout(() => {
					retry = 0;
					waiting.forEach((_, w) => markRevealed(w));
				}, 60);
		};

		const reveal = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					markRevealed(entry.target);
					reveal.unobserve(entry.target);
				}
			},
			// Trigger a little before it's fully in, so it's settling as it arrives.
			{ rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
		);

		const progressEls = new Set<HTMLElement>();
		const parallaxEls = new Set<HTMLElement>();

		const track = (el: HTMLElement) => {
			if (el.hasAttribute("data-reveal") && !el.hasAttribute("data-revealed")) {
				if (reduced) markRevealed(el);
				else reveal.observe(el);
			}
			if (el.hasAttribute("data-progress")) {
				progressEls.add(el);
				if (reduced)
					requestAnimationFrame(function set() {
						if (hydrated(el)) el.style.setProperty("--progress", "1");
						else requestAnimationFrame(set);
					});
			}
			if (el.hasAttribute("data-parallax") && !reduced) parallaxEls.add(el);
		};
		const scan = (node: ParentNode) => {
			if (node instanceof HTMLElement && node.matches(SELECTOR)) track(node);
			node.querySelectorAll<HTMLElement>(SELECTOR).forEach(track);
		};

		let frame = 0;
		const update = () => {
			frame = 0;
			const vh = window.innerHeight;
			if (!reduced) {
				progressEls.forEach((el) => {
					if (!el.isConnected) return void progressEls.delete(el);
					if (!hydrated(el)) return void schedule(); // try again next frame
					const rect = el.getBoundingClientRect();
					// 0 when its top reaches 65% of the viewport, 1 when its bottom does.
					const p = (vh * 0.65 - rect.top) / rect.height;
					el.style.setProperty("--progress", String(Math.min(1, Math.max(0, p))));
				});
			}
			const y = window.scrollY;
			parallaxEls.forEach((el) => {
				if (!el.isConnected) return void parallaxEls.delete(el);
				if (!hydrated(el)) return void schedule();
				if (y > vh * 1.5) return; // scrolled well past: no work
				el.style.transform = `translate3d(0, ${(y * Number(el.dataset.parallax || 0)).toFixed(1)}px, 0)`;
			});
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		const mutations = new MutationObserver((records) => {
			for (const record of records) {
				record.addedNodes.forEach((node) => {
					if (node instanceof HTMLElement) scan(node);
				});
			}
			schedule();
		});

		scan(document.body);
		update();
		mutations.observe(document.body, { childList: true, subtree: true });
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule, { passive: true });
		return () => {
			reveal.disconnect();
			mutations.disconnect();
			clearTimeout(retry);
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
		};
	}, []);

	return null;
}
