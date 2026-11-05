import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInView } from "@/features/auth/components/SignInView";

export const metadata: Metadata = { title: "Sign in" };

/** /sign-in: password + 6-digit code (PRD §5, §12; D7). */
export default function Page() {
	return (
		<Suspense>
			<SignInView />
		</Suspense>
	);
}
