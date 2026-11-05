"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { exportDb, importDb, onDbSaved } from "@repo/mock-api/db";
import { ADMIN_URL as PEER_URL } from "@/lib/site";

/**
 * Mock mode only. Web (:3000) and admin (:3001) are different origins, so each keeps its own demo data. This keeps
 * them in step: a hidden iframe loads the admin console's /mock-bridge page; every local write is mirrored to it, and its
 * newer data is pulled in (newest document wins). With Vercel Services both apps share one origin and storage, so
 * this switches itself off. Other tabs of this app are picked up through the "storage" event.
 */
const peerBridge = () => {
	try {
		const url = new URL(`${PEER_URL}/mock-bridge`, window.location.href);
		return url.origin === window.location.origin ? null : url;
	} catch {
		return null;
	}
};

export function MockSync() {
	const qc = useQueryClient();
	const frame = useRef<HTMLIFrameElement>(null);
	const [peer, setPeer] = useState<URL | null>(null);

	useEffect(() => {
		// Never inside the bridge iframe itself (no nesting), and only when the other app is on another origin.
		if (window.top !== window.self) return;
		const id = setTimeout(() => setPeer(peerBridge()), 1500); // after the page has settled
		const onStorage = (e: StorageEvent) => {
			if (e.key === "csp-mock-db") void qc.invalidateQueries();
		};
		window.addEventListener("storage", onStorage);
		return () => {
			clearTimeout(id);
			window.removeEventListener("storage", onStorage);
		};
	}, [qc]);

	useEffect(() => {
		if (!peer) return;
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== peer.origin || e.data?.type !== "csp-db") return;
			if (importDb(String(e.data.doc))) void qc.invalidateQueries();
		};
		window.addEventListener("message", onMessage);
		const off = onDbSaved((raw) => frame.current?.contentWindow?.postMessage({ type: "csp-db-push", doc: raw }, peer.origin));
		return () => {
			window.removeEventListener("message", onMessage);
			off();
		};
	}, [peer, qc]);

	if (!peer) return null;
	return (
		<iframe
			ref={frame}
			src={peer.href}
			// On load, offer ours too: the bridge keeps it if it is newer than what that app has.
			onLoad={() => frame.current?.contentWindow?.postMessage({ type: "csp-db-push", doc: exportDb() }, peer.origin)}
			title="Demo data sync"
			aria-hidden
			tabIndex={-1}
			className="pointer-events-none fixed size-0 border-0 opacity-0"
		/>
	);
}
