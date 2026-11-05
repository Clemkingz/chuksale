"use client";

import { useSyncExternalStore } from "react";
import type { AuthTokens } from "@repo/domain/types";
import { accountTokens, builderApi } from "@/lib/api/client";

/**
 * The builder's session is the token store (backend guide, "Tokens"): access token in memory, single-use refresh
 * token in localStorage. Who is signed in comes from `GET /auth/me` (`useMe`). Contributors never get one: their
 * identity is the wallet (features/wallet).
 */

const subscribe = (cb: () => void) => accountTokens.subscribe(cb);

/** true / false once mounted; null while server-rendering (no storage there). */
export function useSignedIn(): boolean | null {
	return useSyncExternalStore(
		subscribe,
		() => accountTokens.hasSession() && accountTokens.getRole() !== "admin",
		() => null,
	);
}

export function startSession(tokens: AuthTokens) {
	accountTokens.save(tokens);
	return tokens;
}

/** Signs out this device. The server revokes the session even if the call fails midway; it always answers 204. */
export async function signOut() {
	const refreshToken = accountTokens.getRefreshToken();
	accountTokens.clear();
	if (refreshToken) await builderApi.post("/auth/logout", { refreshToken }).catch(() => undefined);
}
