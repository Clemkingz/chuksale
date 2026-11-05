"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { withoutBasePath } from "@/lib/site";
import { isExpired, useAdminSession } from "@/features/auth/session";

const subscribe = (cb: () => void) => useAdminSession.persist.onFinishHydration(cb);
const hydrated = () => useAdminSession.persist.hasHydrated();

/** Sends anyone without an admin session to /sign-in. The mock backend also returns 403 for non-admin tokens. */
export function RequireAdmin({ children }: { children: ReactNode }) {
	const router = useRouter();
	const ready = useSyncExternalStore(subscribe, hydrated, () => false);
	const { token, expiresAt } = useAdminSession();
	const signedIn = !!token && !isExpired(expiresAt);

	useEffect(() => {
		if (ready && !signedIn) router.replace(`/sign-in?next=${encodeURIComponent(withoutBasePath(window.location.pathname))}`);
	}, [ready, signedIn, router]);

	if (!ready || !signedIn) return null;
	return <>{children}</>;
}
