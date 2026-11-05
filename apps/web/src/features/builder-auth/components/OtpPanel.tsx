"use client";

import { useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/input-otp";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { FormError } from "@/components/forms/Fields";
import { MailIllustration } from "@/features/builder-auth/components/MailIllustration";

/** Digits only (same as input-otp’s REGEXP_ONLY_DIGITS). */
const DIGITS = "^\\d+$";
const RESEND_SECONDS = 120;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}s`;

/**
 * Designs A2 (entering) and A3 (verifying: dot loader in the button). Boxes turn periwinkle as they fill; the
 * sixth digit submits on its own; a wrong code shakes and clears. "Resend in 2:00s" counts down, then becomes a link.
 */
export function OtpPanel({
	email,
	purpose,
	onSubmit,
	isPending,
	error,
	onResend,
	resending,
	submitLabel = "Continue",
}: {
	email: string;
	purpose: "verify_email" | "reset_password";
	onSubmit: (code: string) => void;
	isPending: boolean;
	error?: string | null;
	onResend: () => Promise<unknown>;
	resending: boolean;
	submitLabel?: string;
}) {
	const [code, setCode] = useState("");
	const [seconds, setSeconds] = useState(RESEND_SECONDS);
	const [shakeKey, setShakeKey] = useState(0);
	const [lastError, setLastError] = useState(error);

	// A new error: shake and clear the boxes (adjusting state during render, not in an effect).
	if (error !== lastError) {
		setLastError(error);
		if (error) {
			setShakeKey((k) => k + 1);
			setCode("");
		}
	}

	useEffect(() => {
		if (seconds <= 0) return;
		const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
		return () => clearInterval(t);
	}, [seconds]);

	async function resend() {
		await onResend();
		setSeconds(RESEND_SECONDS);
	}

	return (
		<form
			noValidate
			onSubmit={(e) => {
				e.preventDefault();
				if (code.length === 6) onSubmit(code);
			}}
			className="flex flex-col items-center text-center"
		>
			<MailIllustration />
			<h1 className="mt-8 font-display text-2xl font-bold md:mt-10">Check your mail</h1>
			<p className="mt-3 max-w-[360px] text-base leading-[1.65] text-white/90">
				We sent a 6-digit code to <span className="font-medium break-all text-white">{email}</span>.{" "}
				{purpose === "verify_email" ? "Enter it to verify your email and open your account." : "Enter it to reset your password."}
			</p>

			<p id="otp-label" className="mt-8 text-base text-primary-400 md:mt-10">
				Enter OTP below
			</p>

			<div key={shakeKey} className={cn("mt-5 md:mt-7", shakeKey > 0 && "animate-shake")}>
				<InputOTP
					maxLength={6}
					pattern={DIGITS}
					value={code}
					onChange={setCode}
					onComplete={(value: string) => onSubmit(value)}
					disabled={isPending}
					autoFocus
					aria-labelledby="otp-label"
					inputMode="numeric"
					autoComplete="one-time-code"
					containerClassName="justify-center"
				>
					<InputOTPGroup className="gap-2 sm:gap-2.5">
						{Array.from({ length: 6 }, (_, i) => (
							<InputOTPSlot
								key={i}
								index={i}
								className={cn(
									"size-[46px] rounded-lg border text-lg text-white first:rounded-lg first:border-l last:rounded-lg sm:size-[54px] sm:text-xl",
									i < code.length ? "border-primary-500" : "border-white/90",
									"data-[active=true]:border-primary-400 data-[active=true]:ring-primary-500/40",
									error && "border-error-300",
								)}
							/>
						))}
					</InputOTPGroup>
				</InputOTP>
			</div>

			<div className="mt-3 flex w-full max-w-[362px] justify-end text-base">
				{seconds > 0 ? (
					<span className="text-white" aria-live="off">
						Resend in <span className="text-primary-400 tabular-nums">{fmt(seconds)}</span>
					</span>
				) : (
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto px-0 text-base"
						onClick={resend}
						isLoading={resending}
						loadingLabel="Sending a new code"
					>
						Resend code
					</Button>
				)}
			</div>

			{error && <div className="mt-4 w-full">{<FormError message={error} />}</div>}

			<Button
				type="submit"
				className="mt-6 lg:h-[52px]"
				isLoading={isPending}
				loadingLabel="Verifying code"
				disabled={code.length < 6 && !isPending}
			>
				{submitLabel}
			</Button>
		</form>
	);
}
