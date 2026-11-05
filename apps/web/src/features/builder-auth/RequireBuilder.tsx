"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { BrandLoader } from "@/components/BrandLoader";
import { isExpired, useBuilderSession } from "@/features/builder-auth/session";

const subscribe = (cb: () => void) => useBuilderSession.persist.onFinishHydration(cb);
const hydrated = () => useBuilderSession.persist.hasHydrated();

/** Sends signed-out visitors to sign-in, and back here afterwards (`?next=`). */
export function RequireBuilder({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const ready = useSyncExternalStore(subscribe, hydrated, () => false);
	const { token, expiresAt } = useBuilderSession();
	const signedIn = !!token && !isExpired(expiresAt);

	useEffect(() => {
		if (ready && !signedIn) router.replace(`${routes.signIn}?next=${encodeURIComponent(pathname)}`);
	}, [ready, signedIn, router, pathname]);

	if (!ready || !signedIn) return <BrandLoader label={ready ? "Taking you to sign in" : "Checking your session"} />;
	return <>{children}</>;
}
