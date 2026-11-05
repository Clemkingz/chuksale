import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/features/builder-auth/components/AuthFormSkeleton";
import { SignInForm } from "@/features/builder-auth/components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
	return (
		<Suspense fallback={<AuthFormSkeleton />}>
			<SignInForm />
		</Suspense>
	);
}
