"use client";

import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { BackLink } from "@/components/BackLink";

/** The auth screens' back link: each step goes to the one before it; the entry pages go back to the site. */
const BACK: Record<string, { href: string; label: string }> = {
	[routes.signIn]: { href: routes.home, label: "Back to site" },
	[routes.signUp]: { href: routes.home, label: "Back to site" },
	[routes.verifyEmail]: { href: routes.signUp, label: "Sign up" },
	[routes.forgotPassword]: { href: routes.signIn, label: "Sign in" },
	[routes.resetPassword]: { href: routes.forgotPassword, label: "Forgot password" },
};

export function AuthBack() {
	const pathname = usePathname();
	const back = BACK[pathname.replace(/\/$/, "")] ?? BACK[routes.signIn]!;
	return <BackLink href={back.href} label={back.label} />;
}
