"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { AuthTitle, OrDivider } from "@/features/builder-auth/components/AuthShell";
import { FormError, PasswordField, PasswordRules, TextField } from "@/components/forms/Fields";
import { GoogleButton } from "@/features/builder-auth/components/GoogleButton";
import { useGoogleSignIn, useSignUp } from "@/features/builder-auth/hooks";
import { signUpSchema, type SignUpValues } from "@/features/builder-auth/schema";

/** Design A1: Create an account → "Check your mail" (A2). Builders only; contributors never need an account. */
export function SignUpForm() {
	const router = useRouter();
	const signUp = useSignUp();
	const google = useGoogleSignIn();
	const form = useForm<SignUpValues>({
		resolver: zodResolver(signUpSchema),
		defaultValues: { full_name: "", email: "", password: "", confirm_password: "" },
		mode: "onTouched",
	});
	const { errors } = form.formState;
	const password = useWatch({ control: form.control, name: "password" });

	const onSubmit = form.handleSubmit((values) =>
		signUp.mutate(values, {
			onSuccess: (data) => router.push(`${routes.verifyEmail}?email=${encodeURIComponent(data.email)}`),
		}),
	);

	return (
		<>
			<AuthTitle>Create an account</AuthTitle>
			<form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
				<TextField label="Full name" autoComplete="name" error={errors.full_name?.message} {...form.register("full_name")} />
				<TextField
					label="Email address"
					type="email"
					inputMode="email"
					autoComplete="email"
					error={errors.email?.message}
					{...form.register("email")}
				/>
				<PasswordField
					label="Create password"
					autoComplete="new-password"
					error={errors.password?.message}
					hint={password ? <PasswordRules value={password} /> : null}
					{...form.register("password")}
				/>
				<PasswordField
					label="Confirm password"
					autoComplete="new-password"
					error={errors.confirm_password?.message}
					{...form.register("confirm_password")}
				/>
				<FormError message={signUp.isError ? errorMessage(signUp.error) : null} />
				<Button type="submit" className="mt-1 text-lg" isLoading={signUp.isPending} loadingLabel="Creating your account">
					Sign up
				</Button>
			</form>
			<OrDivider />
			<GoogleButton
				isLoading={google.isPending}
				onClick={() =>
					google.mutate(undefined, {
						onSuccess: () => {
							notify.success("Signed in with Google");
							router.replace(routes.dashboard);
						},
						onError: (e) => notify.fromError(e),
					})
				}
			/>
			<p className="mt-8 text-center text-base">
				Already have an account?{" "}
				<Link href={routes.signIn} className="text-primary-400 hover:underline">
					Sign in
				</Link>
			</p>
			<p className="mt-5 text-center text-sm">
				<Link href={routes.forgotPassword} className="text-white/90 hover:text-white hover:underline">
					Forgot password?
				</Link>
			</p>
		</>
	);
}
