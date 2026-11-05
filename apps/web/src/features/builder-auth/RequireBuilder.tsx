"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { BrandLoader } from "@/components/BrandLoader";
import { useSignedIn } from "@/features/builder-auth/session";

/** Sends signed-out visitors to sign-in, and back here afterwards (`?next=`). */
export function RequireBuilder({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const signedIn = useSignedIn();

	useEffect(() => {
		if (signedIn === false) router.replace(`${routes.signIn}?next=${encodeURIComponent(pathname)}`);
	}, [signedIn, router, pathname]);

	if (!signedIn) return <BrandLoader label={signedIn === null ? "Checking your session" : "Taking you to sign in"} />;
	return <>{children}</>;
}
