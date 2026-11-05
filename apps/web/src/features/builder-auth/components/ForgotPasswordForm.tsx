"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { AuthTitle } from "@/features/builder-auth/components/AuthShell";
import { FormError, TextField } from "@/components/forms/Fields";
import { useForgotPassword } from "@/features/builder-auth/hooks";
import { forgotSchema, type ForgotValues } from "@/features/builder-auth/schema";

/** Same answer whether or not the account exists, so the page can't be used to find accounts. */
export function ForgotPasswordForm() {
	const router = useRouter();
	const forgot = useForgotPassword();
	const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" }, mode: "onTouched" });

	const onSubmit = form.handleSubmit(({ email }) =>
		forgot.mutate(email, { onSuccess: () => router.push(`${routes.resetPassword}?email=${encodeURIComponent(email)}`) }),
	);

	return (
		<>
			<AuthTitle>Forgot password?</AuthTitle>
			<p className="mt-3 text-center text-white/75">Enter your account email and we’ll send you a code to reset it.</p>
			<form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
				<TextField
					label="Email address"
					type="email"
					inputMode="email"
					autoComplete="email"
					error={form.formState.errors.email?.message}
					{...form.register("email")}
				/>
				<FormError message={forgot.isError ? errorMessage(forgot.error) : null} />
				<Button type="submit" className="text-lg" isLoading={forgot.isPending} loadingLabel="Sending code">
					Send code
				</Button>
			</form>
			<p className="mt-8 text-center text-base">
				Remembered it?{" "}
				<Link href={routes.signIn} className="text-primary-400 hover:underline">
					Sign in
				</Link>
			</p>
		</>
	);
}
