"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { withoutBasePath } from "@/lib/site";
import { useAdminSignedIn } from "@/features/auth/session";

/** Sends anyone without an admin session to /sign-in. The API also answers 403 to non-admin tokens. */
export function RequireAdmin({ children }: { children: ReactNode }) {
	const router = useRouter();
	const signedIn = useAdminSignedIn();

	useEffect(() => {
		if (signedIn === false) router.replace(`/sign-in?next=${encodeURIComponent(withoutBasePath(window.location.pathname))}`);
	}, [signedIn, router]);

	if (!signedIn) return null;
	return <>{children}</>;
}
