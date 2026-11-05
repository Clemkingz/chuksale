import { z } from "zod";

/** Field rules shared by builder forms, matching the backend's (https-only links, G… addresses). */

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
		.refine((v) => !v || STELLAR_PUBLIC_KEY.test(v), "Enter a Stellar address: 56 characters starting with G.");

export const isHttpsUrl = (v: string) => {
	try {
		const u = new URL(v);
		return u.protocol === "https:" && u.hostname.includes(".");
	} catch {
		return false;
	}
};

/** Optional link; when given it must be a full https:// URL (the API refuses anything else). */
export const optionalLink = (label: string) =>
	z
		.string()
		.trim()
		.refine((v) => !v || isHttpsUrl(v), `Enter a full ${label} link, starting with https://`);
