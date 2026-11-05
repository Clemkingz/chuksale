"use client";

import { useSyncExternalStore } from "react";
import { accountTokens, api } from "@/lib/api/client";

/**
 * The admin's session is the token store (access token in memory, single-use refresh token in localStorage under
 * the admin app's own key). Only `role: "admin"` tokens are kept; who is signed in comes from `GET /auth/me`.
 */

const subscribe = (cb: () => void) => accountTokens.subscribe(cb);

/** true / false once mounted; null while server-rendering. */
export function useAdminSignedIn(): boolean | null {
	return useSyncExternalStore(
		subscribe,
		() => accountTokens.hasSession() && accountTokens.getRole() === "admin",
		() => null,
	);
}

/** Signs out this device; the server revokes the session even if the call fails midway. */
export async function signOut() {
	const refreshToken = accountTokens.getRefreshToken();
	accountTokens.clear();
	if (refreshToken) await api.post("/auth/logout", { refreshToken }).catch(() => undefined);
}
