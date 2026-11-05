"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@repo/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/input-otp";
import { cn } from "@repo/ui/lib/utils";
import { errorData, errorMessage } from "@/lib/api/errors";
import { DEMO_ACCOUNTS, USE_MOCK_API } from "@/lib/api/source";
import { routes } from "@/lib/routes";
import { Field, FormError } from "@/components/forms/Field";
import { Logo } from "@/components/Logo";
import { useAdminLogin, useAdminMfa, useDemoAdminSignIn } from "@/features/auth/hooks";

/**
 * Admin sign-in (no design yet; styled like the console): email + password, then a 6-digit code (D7, PRD §12).
 * Sends the admin back to where they were (?next=) after signing in.
 */

const schema = z.object({
	email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
	password: z.string().min(1, "Enter your password."),
});

export function SignInView() {
	const router = useRouter();
	const next = useSearchParams().get("next");
	const login = useAdminLogin();
	const mfa = useAdminMfa();
	const demo = useDemoAdminSignIn();
	const goIn = () => router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : routes.overview);
	const [challenge, setChallenge] = useState<{ id: string; email: string } | null>(null);
	const [code, setCode] = useState("");
	const [shake, setShake] = useState(0);

	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: { email: "", password: "" },
		mode: "onTouched",
	});

	const submitPassword = form.handleSubmit((v) =>
		login.mutate(v, { onSuccess: (d) => setChallenge({ id: d.challenge_id, email: v.email }) }),
	);

	const submitCode = (value: string) => {
		if (!challenge || value.length !== 6) return;
		mfa.mutate(
			{ challenge_id: challenge.id, code: value },
			{
				onSuccess: goIn,
				onError: (e) => {
					setCode("");
					setShake((n) => n + 1);
					if (errorData(e)?.reason === "expired") setChallenge(null);
				},
			},
		);
	};

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
					{!challenge ? (
						<>
							<h1 className="font-display text-2xl font-bold">Admin sign in</h1>
							<p className="mt-1.5 text-sm text-white/60">Staff only. You’ll confirm with a 6-digit code next.</p>
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
								<FormError message={login.isError ? errorMessage(login.error) : null} />
								<Button
									type="submit"
									className="mt-1 h-12 text-base"
									isLoading={login.isPending}
									loadingLabel="Checking your details"
								>
									Continue
								</Button>
							</form>
							{USE_MOCK_API && (
								<div className="mt-6 rounded-xl border border-dashed border-primary-500/40 p-4">
									<p className="text-xs tracking-wide text-primary-300 uppercase">Test mode</p>
									<p className="mt-1 text-sm leading-6 text-white/65">
										Any email and password work here, and any 6-digit code. Or skip both steps:
									</p>
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
						<div className="animate-page">
							<button
								type="button"
								onClick={() => {
									setChallenge(null);
									mfa.reset();
								}}
								className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
							>
								<ArrowLeft className="size-4" /> Back
							</button>
							<span className="mt-4 flex size-12 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300">
								<ShieldCheck className="size-6" aria-hidden />
							</span>
							<h1 id="code-label" className="mt-4 font-display text-2xl font-bold">
								Enter your code
							</h1>
							<p className="mt-1.5 text-sm leading-6 text-white/60">
								Open your authenticator app and enter the 6-digit code for{" "}
								<span className="text-white/85">{challenge.email}</span>.
							</p>
							<div key={shake} className={cn("mt-6", shake > 0 && "animate-shake")}>
								<InputOTP
									maxLength={6}
									pattern="^\d+$"
									value={code}
									onChange={setCode}
									onComplete={submitCode}
									disabled={mfa.isPending}
									autoFocus
									aria-labelledby="code-label"
									inputMode="numeric"
									autoComplete="one-time-code"
									containerClassName="justify-center"
								>
									<InputOTPGroup className="gap-2">
										{Array.from({ length: 6 }, (_, i) => (
											<InputOTPSlot
												key={i}
												index={i}
												className={cn(
													"size-12 rounded-lg border text-lg text-white first:rounded-lg first:border-l last:rounded-lg",
													i < code.length ? "border-primary-500" : "border-white/70",
													"data-[active=true]:border-primary-400 data-[active=true]:ring-primary-500/40",
													mfa.isError && "border-error-300",
												)}
											/>
										))}
									</InputOTPGroup>
								</InputOTP>
							</div>
							<div className="mt-4">
								<FormError message={mfa.isError ? errorMessage(mfa.error) : null} />
							</div>
							<Button
								className="mt-4 h-12 w-full text-base"
								disabled={code.length !== 6}
								isLoading={mfa.isPending}
								loadingLabel="Verifying"
								onClick={() => submitCode(code)}
							>
								Verify and sign in
							</Button>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
