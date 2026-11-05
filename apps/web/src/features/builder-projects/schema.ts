import { z } from "zod";
import { email, socialLinks, stellarAddress } from "@/lib/validation";

/**
 * Design "Add Project" (Dev add project 2). The server repeats every rule (packages/mock-api handlers/builder.ts).
 * Socials are optional; when given they must be full links. The wallet is the project's Stellar destination
 * (direct payments, D1): a public key, 56 characters starting with G. Never a secret key (those start with S).
 */
export const addProjectSchema = z.object({
	title: z.string().trim().min(3, "Use at least 3 characters.").max(80, "Use 80 characters or fewer."),
	logo_url: z.string().min(1, "Add a project logo."),
	contact_email: email,
	destination_address: stellarAddress("Enter the Stellar wallet that should receive contributions."),
	...socialLinks,
});

export type AddProjectValues = z.infer<typeof addProjectSchema>;
