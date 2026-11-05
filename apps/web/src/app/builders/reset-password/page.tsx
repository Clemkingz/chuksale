import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/features/builder-auth/components/AuthFormSkeleton";
import { ResetPasswordView } from "@/features/builder-auth/components/ResetPasswordView";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
	return (
		<Suspense fallback={<AuthFormSkeleton />}>
			<ResetPasswordView />
		</Suspense>
	);
}
