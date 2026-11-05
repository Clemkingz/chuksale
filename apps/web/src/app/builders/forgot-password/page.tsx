import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/builder-auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
	return <ForgotPasswordForm />;
}
