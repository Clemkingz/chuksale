"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { OtpPanel } from "@/features/builder-auth/components/OtpPanel";
import { useResendOtp, useVerifyEmail } from "@/features/builder-auth/hooks";

/** Designs A2/A3: the code from the sign-up email; success signs the builder in. */
export function VerifyEmailView() {
	const router = useRouter();
	const params = useSearchParams();
	const email = params.get("email") ?? "";
	const next = params.get("next");
	const verify = useVerifyEmail();
	const resend = useResendOtp();

	if (!email) return <MissingEmail />;

	return (
		<OtpPanel
			email={email}
			purpose="verify_email"
			isPending={verify.isPending || verify.isSuccess}
			error={verify.isError ? errorMessage(verify.error) : null}
			resending={resend.isPending}
			onResend={() => resend.mutateAsync(email).catch(() => undefined)}
			onSubmit={(code) =>
				verify.mutate(
					{ email, otp: code },
					{
						onSuccess: () => {
							notify.success("Email verified", "Welcome to Chucksales. Your builder account is ready.");
							router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : routes.dashboard);
						},
					},
				)
			}
		/>
	);
}

function MissingEmail() {
	return (
		<div className="text-center">
			<h1 className="font-display text-2xl font-bold">Which email should we check?</h1>
			<p className="mt-3 text-white/70">This link is missing an email address. Start again and we’ll send you a new code.</p>
			<div className="mt-6 flex justify-center gap-6">
				<Link href={routes.signUp} className="text-primary-400 hover:underline">
					Create an account
				</Link>
				<Link href={routes.signIn} className="text-primary-400 hover:underline">
					Sign in
				</Link>
			</div>
		</div>
	);
}
