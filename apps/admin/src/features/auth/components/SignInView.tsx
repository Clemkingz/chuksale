"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@repo/ui/button";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { DEMO_ACCOUNTS, USE_MOCK_API } from "@/lib/api/source";
import { routes } from "@/lib/routes";
import { Field, FormError } from "@/components/forms/Field";
import { Logo } from "@/components/Logo";
import { NotAnAdminError, useAdminLogin, useDemoAdminSignIn, useForgotPassword, useResetPassword } from "@/features/auth/hooks";

/**
 * Admin sign-in (styled like the console): email + password on the shared login route; only admin accounts get in
 * (builders are told to use the app). New admins set their password with the emailed setup code, the same way a
 * forgotten password is reset. Sends the admin back to where they were (?next=).
 */

const schema = z.object({
	email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
	password: z.string().min(1, "Enter your password."),
});

const resetSchema = z.object({
	otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
	newPassword: z.string().min(8, "Use at least 8 characters.").max(128, "Use 128 characters or fewer."),
});

export function SignInView() {
	const router = useRouter();
	const next = useSearchParams().get("next");
	const login = useAdminLogin();
	const demo = useDemoAdminSignIn();
	const goIn = () => router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : routes.overview);
	const [mode, setMode] = useState<"signin" | "forgot" | "reset">("signin");
	const [resetEmail, setResetEmail] = useState("");

	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: { email: "", password: "" },
		mode: "onTouched",
	});

	const submitPassword = form.handleSubmit((v) => login.mutate(v, { onSuccess: goIn }));
	const status = errorStatus(login.error);
	const loginError = !login.isError
		? null
		: login.error instanceof NotAnAdminError
			? login.error.message
			: status === 401
				? "Email or password is wrong."
				: status === 403 && /suspend/i.test(errorMessage(login.error))
					? "This account is suspended. Ask another admin to restore it."
					: errorMessage(login.error);

	return (
		<main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
			<div
				aria-hidden
				className="absolute -top-40 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-primary-500/15 blur-[120px]"
			/>
			<div className="animate-rise w-full max-w-[440px]">
				<div className="flex justify-center">
					<Logo />
				</div>
				<section className="admin-card mt-8 bg-[#0B0D16]/80 px-6 py-8 backdrop-blur sm:px-8">
					{mode === "signin" ? (
						<>
							<h1 className="font-display text-2xl font-bold">Admin sign in</h1>
							<p className="mt-1.5 text-sm text-white/60">Staff only. Admin accounts are created by another admin.</p>
							<form noValidate onSubmit={submitPassword} className="mt-7 flex flex-col gap-5">
								<Field
									label="Email address"
									type="email"
									autoComplete="username"
									error={form.formState.errors.email?.message}
									{...form.register("email")}
								/>
								<Field
									label="Password"
									type="password"
									autoComplete="current-password"
									error={form.formState.errors.password?.message}
									{...form.register("password")}
								/>
								<FormError message={loginError} />
								<Button type="submit" className="mt-1 h-12 text-base" isLoading={login.isPending} loadingLabel="Signing in">
									Sign in
								</Button>
							</form>
							<button
								type="button"
								onClick={() => {
									setResetEmail(form.getValues("email"));
									setMode("forgot");
								}}
								className="mt-4 w-full text-center text-sm text-white/60 hover:text-white"
							>
								Forgot your password, or setting up a new admin account?
							</button>
							{USE_MOCK_API && (
								<div className="mt-6 rounded-xl border border-dashed border-primary-500/40 p-4">
									<p className="text-xs tracking-wide text-primary-300 uppercase">Test mode</p>
									<p className="mt-1 text-sm leading-6 text-white/65">Any email and password work here. Or skip it:</p>
									<Button
										type="button"
										variant="outline"
										className="mt-3 h-11 w-full text-base"
										isLoading={demo.isPending}
										loadingLabel="Signing in"
										onClick={() => demo.mutate(undefined, { onSuccess: goIn })}
									>
										Continue as demo admin
									</Button>
									<button
										type="button"
										onClick={() => {
											form.setValue("email", DEMO_ACCOUNTS.admin.email);
											form.setValue("password", DEMO_ACCOUNTS.admin.password);
										}}
										className="mt-2 w-full text-center text-xs text-white/50 hover:text-white/80"
									>
										or fill {DEMO_ACCOUNTS.admin.email} / {DEMO_ACCOUNTS.admin.password}
									</button>
									{demo.isError && <p className="mt-2 text-sm text-error-200">{errorMessage(demo.error)}</p>}
								</div>
							)}
						</>
					) : (
						<ResetFlow
							email={resetEmail}
							setEmail={setResetEmail}
							step={mode}
							onStep={setMode}
							onDone={(email) => {
								form.reset({ email, password: "" });
								setMode("signin");
							}}
						/>
					)}
				</section>
			</div>
		</main>
	);
}

/** Forgot password / new-admin setup: email → code (from the email; on staging, from the backend owner) + new password. */
function ResetFlow({
	email,
	setEmail,
	step,
	onStep,
	onDone,
}: {
	email: string;
	setEmail: (v: string) => void;
	step: "forgot" | "reset";
	onStep: (s: "signin" | "forgot" | "reset") => void;
	onDone: (email: string) => void;
}) {
	const forgot = useForgotPassword();
	const reset = useResetPassword();
	const [emailError, setEmailError] = useState<string | null>(null);
	const form = useForm<z.infer<typeof resetSchema>>({
		resolver: zodResolver(resetSchema),
		defaultValues: { otp: "", newPassword: "" },
		mode: "onTouched",
	});

	return (
		<div className="animate-page">
			<button
				type="button"
				onClick={() => onStep(step === "reset" ? "forgot" : "signin")}
				className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
			>
				<ArrowLeft className="size-4" /> Back
			</button>
			<span className="mt-4 flex size-12 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300">
				<KeyRound className="size-6" aria-hidden />
			</span>
			{step === "forgot" ? (
				<form
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						if (!z.email().safeParse(email.trim()).success) return setEmailError("Enter a valid email address.");
						setEmailError(null);
						forgot.mutate(email, { onSuccess: () => onStep("reset") });
					}}
					className="mt-4 flex flex-col gap-5"
				>
					<div>
						<h1 className="font-display text-2xl font-bold">Set a password</h1>
						<p className="mt-1.5 text-sm leading-6 text-white/60">
							We’ll email a 6-digit code to reset your password, or to set it up if you’re a new admin.
						</p>
					</div>
					<Field
						label="Email address"
						type="email"
						autoComplete="username"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						error={emailError ?? undefined}
					/>
					<FormError message={forgot.isError ? errorMessage(forgot.error) : null} />
					<Button type="submit" className="h-12 text-base" isLoading={forgot.isPending} loadingLabel="Sending code">
						Send code
					</Button>
				</form>
			) : (
				<form
					noValidate
					onSubmit={form.handleSubmit((v) =>
						reset.mutate(
							{ email: email.trim(), otp: v.otp, newPassword: v.newPassword },
							{
								onSuccess: () => {
									notify.success("Password set", "Sign in with your new password.");
									onDone(email.trim());
								},
							},
						),
					)}
					className="mt-4 flex flex-col gap-5"
				>
					<div>
						<h1 className="font-display text-2xl font-bold">Enter the code</h1>
						<p className="mt-1.5 text-sm leading-6 text-white/60">
							Sent to <span className="text-white/85">{email}</span> if it has an account. All other sessions end.
						</p>
					</div>
					<Field
						label="6-digit code"
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						error={form.formState.errors.otp?.message}
						{...form.register("otp")}
					/>
					<Field
						label="New password"
						type="password"
						autoComplete="new-password"
						error={form.formState.errors.newPassword?.message}
						{...form.register("newPassword")}
					/>
					<FormError message={reset.isError ? errorMessage(reset.error) : null} />
					<Button type="submit" className="h-12 text-base" isLoading={reset.isPending} loadingLabel="Saving password">
						Set password
					</Button>
				</form>
			)}
		</div>
	);
}
