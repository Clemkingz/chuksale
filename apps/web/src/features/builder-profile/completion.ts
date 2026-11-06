import type { Me } from "@repo/domain/types";

/**
 * How complete a builder's public profile is, from what's saved (`GET /auth/me`). Each step is something
 * supporters see next to the builder's projects. The display name is set at sign-up, so everyone starts with one.
 */

export type ProfileStep = {
	id: "avatar" | "name" | "bio" | "links" | "banner" | "wallet";
	label: string;
	done: boolean;
	anchor: string;
};

export function profileSteps(me: Me): ProfileStep[] {
	const p = me.profile;
	return [
		{ id: "name", label: "Display name", done: !!p?.displayName?.trim(), anchor: "about" },
		{ id: "avatar", label: "Profile picture", done: !!me.avatarUrl, anchor: "picture" },
		{ id: "bio", label: "Short bio", done: !!p?.bio?.trim(), anchor: "about" },
		{ id: "links", label: "Website or social link", done: !!p?.websiteUrl || !!p?.socialLinks.length, anchor: "links" },
		{ id: "banner", label: "Profile banner", done: !!p?.bannerUrl, anchor: "picture" },
		{ id: "wallet", label: "Verified wallet", done: !!p?.walletAddress, anchor: "wallet" },
	];
}

export function profileCompletion(me: Me) {
	const steps = profileSteps(me);
	const done = steps.filter((s) => s.done).length;
	return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100) };
}
