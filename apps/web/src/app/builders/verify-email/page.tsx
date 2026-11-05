import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/features/builder-auth/components/AuthFormSkeleton";
import { VerifyEmailView } from "@/features/builder-auth/components/VerifyEmailView";

export const metadata: Metadata = { title: "Verify your email" };

export default function Page() {
	return (
		<Suspense fallback={<AuthFormSkeleton />}>
			<VerifyEmailView />
		</Suspense>
	);
}
