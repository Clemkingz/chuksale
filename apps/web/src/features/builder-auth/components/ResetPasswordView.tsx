"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/button";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { AuthTitle } from "@/features/builder-auth/components/AuthShell";
import { FormError, PasswordField, PasswordRules } from "@/components/forms/Fields";
import { OtpPanel } from "@/features/builder-auth/components/OtpPanel";
import { useForgotPassword, useResetPassword } from "@/features/builder-auth/hooks";
import { resetSchema, type ResetValues } from "@/features/builder-auth/schema";

/** Step 1: the emailed code (A2 layout). Step 2: the new password. A bad code sends you back to step 1. */
export function ResetPasswordView() {
	const router = useRouter();
	const email = useSearchParams().get("email") ?? "";
	const [code, setCode] = useState<string | null>(null);
	const [codeError, setCodeError] = useState<string | null>(null);
	const reset = useResetPassword();
	const resend = useForgotPassword();
	const form = useForm<ResetValues>({
		resolver: zodResolver(resetSchema),
		defaultValues: { password: "", confirm_password: "" },
		mode: "onTouched",
	});
	const password = useWatch({ control: form.control, name: "password" });

	if (!email)
		return (
			<p className="text-center text-white/75">
				This link is missing an email address.{" "}
				<Link href={routes.forgotPassword} className="text-primary-400 hover:underline">
					Start again
				</Link>
			</p>
		);

	if (!code)
		return (
			<OtpPanel
				email={email}
				purpose="reset_password"
				isPending={false}
				error={codeError}
				resending={resend.isPending}
				onResend={() => resend.mutateAsync(email).catch(() => undefined)}
				onSubmit={(value) => {
					setCodeError(null);
					setCode(value);
				}}
			/>
		);

	const onSubmit = form.handleSubmit(({ password }) =>
		reset.mutate(
			{ email, otp: code, newPassword: password },
			{
				onSuccess: () => {
					notify.success("Password updated", "You’ve been signed out everywhere. Sign in with your new password.");
					router.replace(`${routes.signIn}?email=${encodeURIComponent(email)}`);
				},
				onError: (error) => {
					// A code problem (400/429) goes back to the code step; anything else stays here.
					if (errorStatus(error) === 400 || errorStatus(error) === 429) {
						setCodeError(errorMessage(error));
						setCode(null);
					}
				},
			},
		),
	);

	return (
		<>
			<button
				type="button"
				onClick={() => setCode(null)}
				className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
			>
				<ArrowLeft className="size-4" /> Back to code
			</button>
			<AuthTitle>Set a new password</AuthTitle>
			<form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
				<PasswordField
					label="New password"
					autoComplete="new-password"
					autoFocus
					error={form.formState.errors.password?.message}
					hint={password ? <PasswordRules value={password} /> : null}
					{...form.register("password")}
				/>
				<PasswordField
					label="Confirm password"
					autoComplete="new-password"
					error={form.formState.errors.confirm_password?.message}
					{...form.register("confirm_password")}
				/>
				<FormError message={reset.isError && errorStatus(reset.error) !== 400 ? errorMessage(reset.error) : null} />
				<Button type="submit" className="text-lg" isLoading={reset.isPending} loadingLabel="Updating password">
					Update password
				</Button>
			</form>
		</>
	);
}
