"use client";

import { useEffect } from "react";
import { exportDb, importDb } from "@repo/mock-api/db";
import { ADMIN_URL as PEER_URL } from "@/lib/site";
import { USE_MOCK_API } from "@/lib/api/source";

/**
 * Runs inside the hidden sync iframe of the admin console. Accepts its mirrored demo data (if newer) into this origin's
 * storage, and sends this origin's data up: once on load, then whenever a tab of this app writes it.
 */
export function MockBridge() {
	useEffect(() => {
		if (!USE_MOCK_API || window.parent === window) return;
		let allowed: string;
		try {
			allowed = new URL(PEER_URL, window.location.href).origin;
		} catch {
			return;
		}
		const send = () => window.parent.postMessage({ type: "csp-db", doc: exportDb() }, allowed);
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== allowed || e.data?.type !== "csp-db-push") return;
			importDb(String(e.data.doc));
		};
		const onStorage = (e: StorageEvent) => {
			if (e.key === "csp-mock-db") send();
		};
		window.addEventListener("message", onMessage);
		window.addEventListener("storage", onStorage);
		send();
		return () => {
			window.removeEventListener("message", onMessage);
			window.removeEventListener("storage", onStorage);
		};
	}, []);
	return null;
}
