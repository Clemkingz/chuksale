"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { DEMO_ACCOUNTS, USE_MOCK_API } from "@/lib/api/source";
import { ADMIN_URL } from "@/lib/site";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { AuthTitle } from "@/features/builder-auth/components/AuthShell";
import { FormError, PasswordField, TextField } from "@/components/forms/Fields";
import { startSession, useResendOtp, useSignIn } from "@/features/builder-auth/hooks";
import { signInSchema, type SignInValues } from "@/features/builder-auth/schema";

/** Only same-app paths: `?next=https://evil.example` must not redirect off-site. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : routes.dashboard);

/** Design A4: Welcome back! An unverified account is sent to the code screen with a fresh code. */
export function SignInForm() {
	const router = useRouter();
	const params = useSearchParams();
	const next = safeNext(params.get("next"));
	const signIn = useSignIn();
	const resend = useResendOtp();
	const form = useForm<SignInValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: params.get("email") ?? "", password: "" },
		mode: "onTouched",
	});
	const { errors } = form.formState;

	const onSubmit = form.handleSubmit((values) =>
		signIn.mutate(values, {
			onSuccess: (tokens) => {
				// Admins use the same login route but the admin console; this app never keeps their tokens.
				if (tokens.role === "admin") return;
				startSession(tokens);
				notify.success("Welcome back");
				router.replace(next);
			},
			onError: (error) => {
				// 403 "Email not verified": the code screen, with a fresh code.
				if (errorStatus(error) === 403 && /verif/i.test(errorMessage(error))) {
					resend.mutate(values.email);
					router.push(`${routes.verifyEmail}?email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(next)}`);
				}
			},
		}),
	);

	const isAdmin = signIn.data?.role === "admin";
	const unverified = errorStatus(signIn.error) === 403 && /verif/i.test(errorMessage(signIn.error));
	const suspended = errorStatus(signIn.error) === 403 && /suspend/i.test(errorMessage(signIn.error));

	return (
		<>
			<AuthTitle>Welcome back!</AuthTitle>
			{USE_MOCK_API && (
				<button
					type="button"
					onClick={() => {
						form.setValue("email", DEMO_ACCOUNTS.builder.email);
						form.setValue("password", DEMO_ACCOUNTS.builder.password);
					}}
					className="mx-auto mt-3 block rounded-full border border-primary-500/40 bg-primary-500/10 px-3 py-1 text-xs text-primary-300 hover:bg-primary-500/20"
				>
					Demo: fill in {DEMO_ACCOUNTS.builder.email}
				</button>
			)}
			<form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
				<TextField
					label="Email address"
					type="email"
					inputMode="email"
					autoComplete="email"
					error={errors.email?.message}
					{...form.register("email")}
				/>
				<PasswordField
					label="Password"
					autoComplete="current-password"
					error={errors.password?.message}
					{...form.register("password")}
				/>
				<FormError
					message={
						suspended
							? "This account is suspended. Contact the Chucksales team if you think this is a mistake."
							: errorStatus(signIn.error) === 401
								? "Email or password is wrong."
								: signIn.isError && !unverified
									? errorMessage(signIn.error)
									: null
					}
				/>
				{isAdmin && (
					<p className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-4 py-3 text-sm leading-6 text-white/85">
						This is an admin account. Sign in on the{" "}
						<a href={ADMIN_URL} className="text-primary-300 underline-offset-4 hover:underline">
							admin console
						</a>{" "}
						instead.
					</p>
				)}
				<Button type="submit" className="mt-1 text-lg" isLoading={signIn.isPending} loadingLabel="Signing in">
					Sign in
				</Button>
			</form>
			<p className="mt-8 text-center text-base">
				Don’t have an account?{" "}
				<Link href={routes.signUp} className="text-primary-400 hover:underline">
					Sign up
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
