"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeClosed } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

/** Console form field (design "admin page 7"): label above, 48px input with a light outline; error under it. */
type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode };

export const inputClass = (invalid: boolean) =>
	cn(
		"h-12 w-full rounded-lg border bg-transparent px-4 text-base text-white transition-[border-color,box-shadow] outline-none placeholder:text-white/35",
		"focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60",
		invalid ? "border-error-300" : "border-white/60",
	);

export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, error, hint, className, type, ...props }, ref) {
	const id = useId();
	const [visible, setVisible] = useState(false);
	const password = type === "password";
	return (
		<div className={className}>
			<label htmlFor={id} className="mb-2.5 block text-base text-white">
				{label}
			</label>
			<div className="relative">
				<input
					ref={ref}
					id={id}
					type={password && visible ? "text" : type}
					aria-invalid={!!error}
					aria-describedby={error ? `${id}-error` : undefined}
					className={cn(inputClass(!!error), password && "pr-12")}
					{...props}
				/>
				{password && (
					<button
						type="button"
						onClick={() => setVisible((v) => !v)}
						aria-label={visible ? "Hide password" : "Show password"}
						aria-pressed={visible}
						className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
					>
						{visible ? <Eye className="size-5" /> : <EyeClosed className="size-5" />}
					</button>
				)}
			</div>
			{error && (
				<p id={`${id}-error`} role="alert" className="animate-rise mt-1.5 text-sm text-error-200">
					{error}
				</p>
			)}
			{hint}
		</div>
	);
});

export function FormError({ message }: { message?: string | null }) {
	if (!message) return null;
	return (
		<div
			role="alert"
			className="animate-pop rounded-lg border border-error-400/30 bg-error-400/10 px-4 py-3 text-sm leading-6 text-error-100"
		>
			{message}
		</div>
	);
}
