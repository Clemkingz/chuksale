import { z } from "zod";
import { isValidAmount } from "@repo/domain/money";
import { isHttpsUrl, stellarAddress } from "@/lib/validation";

/**
 * Builder project forms, with the backend's rules (guide, "Builder: create and edit"). These are the rules on every
 * save; the extra "needed to submit" rules are checked by the API on submit, which answers with one line per
 * problem (shown beside each field).
 */

export const addProjectSchema = z.object({
	title: z.string().trim().min(3, "Use at least 3 characters.").max(120, "Use 120 characters or fewer."),
	type: z.enum(["new_idea", "existing_project"]),
});
export type AddProjectValues = z.infer<typeof addProjectSchema>;

const text = (max: number) => z.string().trim().max(max, `Use ${max.toLocaleString()} characters or fewer.`);

export const projectSchema = z
	.object({
		title: z.string().trim().min(3, "Use at least 3 characters.").max(120, "Use 120 characters or fewer."),
		type: z.enum(["new_idea", "existing_project"]),
		categoryId: z.string(),
		stage: z.string(),
		summary: text(280),
		problem: text(5000),
		solution: text(5000),
		beneficiaries: text(2000),
		teamMembers: z
			.array(
				z.object({
					name: z.string().trim().min(1, "Add a name.").max(100, "Use 100 characters or fewer."),
					role: z.string().trim().min(1, "Add a role.").max(100, "Use 100 characters or fewer."),
				}),
			)
			.max(20, "Up to 20 people."),
		links: z
			.array(
				z.object({
					label: z.string().trim().min(1, "Add a label.").max(50, "Use 50 characters or fewer."),
					url: z.string().trim().refine(isHttpsUrl, "Use a full https:// link."),
				}),
			)
			.max(10, "Up to 10 links."),
		fundraisingEnabled: z.boolean(),
		targetAmount: z
			.string()
			.trim()
			.refine((v) => !v || isValidAmount(v), "Use a number above 0, with up to 7 decimals."),
		targetAssetId: z.string(),
		acceptedAssetIds: z.array(z.string()),
		payoutAddress: stellarAddress(false),
		/** YYYY-MM-DD (the deadline is the end of that day, local time) or "" for none. */
		fundingEndsAt: z
			.string()
			.refine((v) => !v || endOfDay(v).getTime() > Date.now(), "Pick a date in the future, or leave it empty."),
	})
	.refine((v) => !v.fundraisingEnabled || !v.targetAssetId || v.acceptedAssetIds.includes(v.targetAssetId), {
		path: ["acceptedAssetIds"],
		message: "Accept the asset your target is in.",
	});

export type ProjectValues = z.infer<typeof projectSchema>;

/** The funding deadline for a picked day: the end of that day, local time. */
export const endOfDay = (day: string) => new Date(`${day}T23:59:59`);

/** ISO deadline → the day for a date input (local time). */
export function dayOf(iso: string | null) {
	if (!iso) return "";
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
