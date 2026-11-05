import { z } from "zod";

/** Field rules shared by builder forms (Add Project, Edit Profile). The mock API repeats each rule. */

const STELLAR_PUBLIC_KEY = /^G[A-Z2-7]{55}$/;
const STELLAR_SECRET_KEY = /^S[A-Z2-7]{55}$/;

export const email = z.string().trim().min(1, "Enter an email address.").email("Enter a valid email address.");

/** A Stellar public key. A pasted secret key (S…) gets its own warning: never share it. */
export const stellarAddress = (required: string | false) =>
	z
		.string()
		.trim()
		.refine((v) => !!v || !required, required || "")
		.refine(
			(v) => !STELLAR_SECRET_KEY.test(v.toUpperCase()),
			"That’s a secret key. Never share it. Enter your public address (starts with G).",
		)
		.refine((v) => !v || STELLAR_PUBLIC_KEY.test(v.toUpperCase()), "Enter a Stellar address: 56 characters starting with G.");

/** Optional link; when given it must be a full URL, and on one of `hosts` if listed. */
export const optionalLink = (label: string, hosts?: string[]) =>
	z
		.string()
		.trim()
		.refine((v) => !v || /^https?:\/\/\S+\.\S+/i.test(v), `Enter a full ${label} link, starting with https://`)
		.refine((v) => {
			if (!v || !hosts) return true;
			try {
				const host = new URL(v).hostname.replace(/^www\./, "");
				return hosts.some((h) => host === h || host.endsWith(`.${h}`));
			} catch {
				return false;
			}
		}, `That doesn’t look like a ${label} link.`);

export const socialLinks = {
	twitter: optionalLink("Twitter / X", ["twitter.com", "x.com"]),
	discord: optionalLink("Discord", ["discord.gg", "discord.com"]),
	telegram: optionalLink("Telegram", ["t.me", "telegram.me", "telegram.org"]),
	website: optionalLink("website"),
};
