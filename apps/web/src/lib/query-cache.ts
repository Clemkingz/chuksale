"use client";

import { useSyncExternalStore } from "react";
import { dehydrate, hashKey, type DehydratedState, type QueryClient } from "@tanstack/react-query";
import { API_SOURCE } from "@/lib/api/source";

/**
 * Remembers PUBLIC data between visits (projects, categories, the network), so a reload or a return visit paints
 * at once and refreshes quietly in the background (the staging API takes ~0.5–1 s a request, far more when it has
 * been asleep). Account and wallet data are never written: they stay in memory only.
 *
 * Saved entries older than 30 minutes are dropped: image links in them are signed for about an hour.
 */

const KEY = `chucksales.web.cache.${API_SOURCE}.v1`;
const MAX_AGE_MS = 30 * 60_000;
const PUBLIC_ROOTS = new Set(["projects", "categories"]);

const isPublic = (key: readonly unknown[]) =>
	PUBLIC_ROOTS.has(String(key[0])) || (key[0] === "stellar" && key[1] === "network");

function storage() {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

let saved: Map<string, unknown> | null = null;

/** The saved public data, read once per page load: query hash → data. Empty on the server. */
function savedData() {
	if (saved) return saved;
	saved = new Map();
	const raw = storage()?.getItem(KEY);
	if (!raw) return saved;
	try {
		const doc = JSON.parse(raw) as { at: number; state: DehydratedState };
		if (Date.now() - doc.at > MAX_AGE_MS) storage()?.removeItem(KEY);
		else for (const q of doc.state.queries) saved.set(q.queryHash, q.state.data);
	} catch {
		storage()?.removeItem(KEY);
	}
	return saved;
}

const noop = () => () => {};

/**
 * Saved data for a public query, to use as `placeholderData`: it paints at once while the fresh request runs, and
 * the response replaces it. `undefined` while this component hydrates, so the first render matches the server HTML.
 */
export function useSaved<T>(queryKey: readonly unknown[]): T | undefined {
	const hydrated = useSyncExternalStore(
		noop,
		() => true,
		() => false,
	);
	return hydrated ? (savedData().get(hashKey(queryKey)) as T | undefined) : undefined;
}

/** Saves public data whenever it changes (at most once a second). Returns the unsubscribe. */
export function persistQueryCache(client: QueryClient) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	const save = () => {
		timer = null;
		const state = dehydrate(client, {
			shouldDehydrateQuery: (q) => q.state.status === "success" && isPublic(q.queryKey),
		});
		try {
			storage()?.setItem(KEY, JSON.stringify({ at: Date.now(), state }));
		} catch {
			// Quota or private mode: the app works without it.
		}
	};
	const unsubscribe = client.getQueryCache().subscribe((e) => {
		if (e.type === "updated" && e.action.type === "success" && isPublic(e.query.queryKey) && !timer) timer = setTimeout(save, 1000);
	});
	return () => {
		unsubscribe();
		if (timer) clearTimeout(timer);
	};
}

export function clearSavedQueryCache() {
	storage()?.removeItem(KEY);
	saved = new Map();
}
