"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, ticking every minute (one shared timer). Returns 0 during server rendering and hydration so
 * markup matches; callers show nothing time-based until it's set.
 */

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!timer) {
		now = Date.now();
		timer = setInterval(() => {
			now = Date.now();
			listeners.forEach((l) => l());
		}, 60_000);
	}
	return () => {
		listeners.delete(listener);
		if (!listeners.size && timer) {
			clearInterval(timer);
			timer = null;
		}
	};
}

export function useNow() {
	return useSyncExternalStore(
		subscribe,
		() => now || Date.now(),
		() => 0,
	);
}
