import { z } from "zod";

/** Builder auth forms (designs A1–A4), with the backend's rules: name 1–100, password 8–128, organisation ≤150. */

const email = z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.");
const newPassword = z.string().min(8, "Use at least 8 characters.").max(128, "Use 128 characters or fewer.");

export const PASSWORD_RULES = [{ label: "8+ characters", test: (v: string) => v.length >= 8 }] as const;

export const signUpSchema = z
	.object({
		name: z.string().trim().min(1, "Enter your full name.").max(100, "Use 100 characters or fewer."),
		organizationName: z.string().trim().max(150, "Use 150 characters or fewer.").optional(),
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
