"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Check, Eye, EyeClosed } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { PASSWORD_RULES } from "@/features/builder-auth/schema";

/** Design inputs: label above, 47px field, 1px light border, 8px radius, dark fill; errors under the field. */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: React.ReactNode };

const inputClass = (invalid: boolean) =>
	cn(
		"h-12 w-full rounded-lg border bg-transparent px-4 text-base text-white transition-colors outline-none placeholder:text-white/35",
		"focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30",
		invalid ? "border-error-300" : "border-white/70",
	);

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
	{ label, error, hint, className, ...props },
	ref,
) {
	const id = useId();
	return (
		<div className={className}>
			<label htmlFor={id} className="mb-2.5 block text-base text-white">
				{label}
			</label>
			<input
				ref={ref}
				id={id}
				aria-invalid={!!error}
				aria-describedby={error ? `${id}-error` : undefined}
				className={inputClass(!!error)}
				{...props}
			/>
			<FieldError id={`${id}-error`} message={error} />
			{hint}
		</div>
	);
});

export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(function PasswordField(
	{ label, error, hint, className, ...props },
	ref,
) {
	const id = useId();
	const [visible, setVisible] = useState(false);
	return (
		<div className={className}>
			<label htmlFor={id} className="mb-2.5 block text-base text-white">
				{label}
			</label>
			<div className="relative">
				<input
					ref={ref}
					id={id}
					type={visible ? "text" : "password"}
					aria-invalid={!!error}
					aria-describedby={error ? `${id}-error` : undefined}
					className={cn(inputClass(!!error), "pr-12")}
					{...props}
				/>
				<button
					type="button"
					onClick={() => setVisible((v) => !v)}
					aria-label={visible ? "Hide password" : "Show password"}
					aria-pressed={visible}
					className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
				>
					{visible ? <Eye className="size-5" /> : <EyeClosed className="size-5" />}
				</button>
			</div>
			<FieldError id={`${id}-error`} message={error} />
			{hint}
		</div>
	);
});

/** Multi-line field (design "Edit Profile" → Short Description), with a live character count when `maxLength` is set. */
export const TextAreaField = forwardRef<
	HTMLTextAreaElement,
	TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; count?: number }
>(function TextAreaField({ label, error, count, maxLength, className, ...props }, ref) {
	const id = useId();
	const near = maxLength !== undefined && count !== undefined && count > maxLength * 0.9;
	return (
		<div className={className}>
			<label htmlFor={id} className="mb-2.5 block text-base text-white">
				{label}
			</label>
			<textarea
				ref={ref}
				id={id}
				maxLength={maxLength}
				aria-invalid={!!error}
				aria-describedby={cn(error && `${id}-error`, maxLength && `${id}-count`) || undefined}
				className={cn(inputClass(!!error), "h-auto min-h-[132px] resize-y py-3 leading-6 md:min-h-[160px]")}
				{...props}
			/>
			<div className="flex items-start justify-between gap-3">
				<FieldError id={`${id}-error`} message={error} />
				{maxLength !== undefined && count !== undefined && (
					<p
						id={`${id}-count`}
						className={cn("mt-1.5 ml-auto text-xs tabular-nums", near ? "text-warning-200" : "text-white/45")}
					>
						{count}/{maxLength}
					</p>
				)}
			</div>
		</div>
	);
});

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} role="alert" className="animate-rise mt-1.5 text-sm text-error-200">
			{message}
		</p>
	);
}

/** Live password checklist under "Create password": each rule ticks as it's met. */
export function PasswordRules({ value }: { value: string }) {
	return (
		<ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
			{PASSWORD_RULES.map((rule) => {
				const met = rule.test(value);
				return (
					<li
						key={rule.label}
						className={cn("flex items-center gap-1.5 transition-colors", met ? "text-success-200" : "text-white/50")}
					>
						<span
							className={cn(
								"flex size-3.5 items-center justify-center rounded-full border",
								met ? "animate-pop border-success-200 bg-success-200/15" : "border-white/30",
							)}
						>
							{met && <Check className="size-2.5" strokeWidth={3} />}
						</span>
						{rule.label}
						<span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
					</li>
				);
			})}
		</ul>
	);
}

/** Form-level error (wrong password, server down): above the submit button, announced. */
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
