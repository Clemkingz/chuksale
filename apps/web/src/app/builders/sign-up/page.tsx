import type { Metadata } from "next";

import { SignUpForm } from "@/features/builder-auth/components/SignUpForm";

export const metadata: Metadata = { title: "Create an account" };

export default function Page() {
	return <SignUpForm />;
}
