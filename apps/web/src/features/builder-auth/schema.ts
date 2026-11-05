import { z } from "zod";

/** Builder auth forms (designs A1–A4). Server rules match packages/mock-api/src/handlers/auth.ts. */

const email = z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.");
const newPassword = z
	.string()
	.min(8, "Use at least 8 characters.")
	.regex(/[A-Za-z]/, "Add at least one letter.")
	.regex(/\d/, "Add at least one number.");

export const PASSWORD_RULES = [
	{ label: "8+ characters", test: (v: string) => v.length >= 8 },
	{ label: "A letter", test: (v: string) => /[A-Za-z]/.test(v) },
	{ label: "A number", test: (v: string) => /\d/.test(v) },
] as const;

export const signUpSchema = z
	.object({
		full_name: z.string().trim().min(2, "Enter your full name."),
		email,
		password: newPassword,
		confirm_password: z.string().min(1, "Confirm your password."),
	})
	.refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords don’t match." });

export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });

export const forgotSchema = z.object({ email });

export const resetSchema = z
	.object({ password: newPassword, confirm_password: z.string().min(1, "Confirm your password.") })
	.refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords don’t match." });

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
