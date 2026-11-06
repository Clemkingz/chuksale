"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe, PenLine } from "lucide-react";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { errorMessage } from "@/lib/api/errors";
import { AddressChip } from "@/components/AddressChip";
import { SocialLinks } from "@/components/SocialLinks";
import { useMe } from "@/features/builder-auth/hooks";
import { profileCompletion } from "@/features/builder-profile/completion";

/**
 * Design "Dev add project 1/3": full-width banner, round initials avatar overlapping its bottom edge, name, then
 * organisation, website and "Joined April 15th" (from `GET /auth/me`).
 */

function joined(iso: string) {
	const d = new Date(iso);
	const day = d.getDate();
	const suffix =
		day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
	const month = d.toLocaleDateString("en-US", { month: "long" });
	const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : "";
	return `Joined ${month} ${day}${suffix}${year}`;
}

const initials = (name: string) =>
	name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

export function ProfileHero() {
	const profile = useMe();
	const me = profile.data;
	const completion = me ? profileCompletion(me) : null;
	const p = me && {
		avatar: me.avatarUrl,
		banner: me.profile?.bannerUrl ?? null,
		socials: me.profile?.socialLinks ?? [],
		wallet: me.profile?.walletAddress ?? null,
		name: me.profile?.displayName || me.name,
		organization: me.profile?.organizationName ?? null,
		website: me.profile?.websiteUrl ?? null,
		bio: me.profile?.bio ?? null,
		joinedAt: me.createdAt,
	};

	return (
		<section aria-label="Your profile">
			<div className="relative h-[120px] overflow-hidden bg-surface-700 sm:h-[160px] md:h-[190px]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={p?.banner ?? withBasePath("/images/profile-banner.webp")}
					alt=""
					width={2400}
					height={1345}
					fetchPriority="high"
					data-parallax="0.18"
					className="absolute inset-x-0 -top-6 h-[calc(100%+3rem)] w-full object-cover"
				/>
			</div>

			<div className="app-container">
				<div className="-mt-10 flex flex-col items-start sm:-mt-12 md:-mt-[52px]">
					<div className="flex w-full items-end justify-between gap-4">
						<span className="animate-pop relative size-20 overflow-hidden rounded-full bg-surface-600 ring-4 ring-surface-900 sm:size-24 md:size-[104px]">
							{p?.avatar ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={p.avatar} alt="" className="size-full object-cover" />
							) : p ? (
								<span className="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-700 font-display text-2xl font-bold text-white md:text-3xl">
									{initials(p.name)}
								</span>
							) : (
								<span className="skeleton-shimmer block size-full" />
							)}
						</span>
						{p && (
							<Link
								href={routes.editProfile}
								className="animate-rise inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3.5 text-sm text-white/90 transition-colors [--i:3] hover:border-primary-400 hover:bg-primary-500/10 hover:text-white md:h-11 md:px-4"
							>
								<PenLine className="size-4" aria-hidden /> Edit profile
							</Link>
						)}
					</div>

					{p ? (
						<>
							<h1 className="animate-rise mt-2 font-display text-[26px] leading-tight font-bold [--i:1] md:text-[32px]">
								{p.name}
							</h1>
							<div className="animate-rise mt-2 flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] text-white/90 [--i:2] md:ml-2.5 md:text-base">
								{p.organization && <span>{p.organization}</span>}
								{p.website && (
									<a
										href={p.website}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1.5 hover:text-primary-300"
									>
										<Globe className="size-4" aria-hidden /> {p.website.replace(/^https:\/\//, "").replace(/\/$/, "")}
									</a>
								)}
								<span>{joined(p.joinedAt)}</span>
							</div>
							{p.bio && (
								<p className="animate-rise mt-3 max-w-[620px] text-[15px] leading-6 whitespace-pre-line text-white/70 [--i:3] md:ml-2.5">
									{p.bio}
								</p>
							)}
							{(p.socials.length > 0 || p.wallet) && (
								<div className="animate-rise mt-4 flex flex-wrap items-center gap-3 [--i:3] md:ml-2.5">
									<SocialLinks socialLinks={p.socials} />
									{p.wallet && (
										<span className="inline-flex h-9 items-center gap-2 rounded-full bg-success-400/10 px-3.5 text-sm text-success-100">
											<BadgeCheck className="size-4" aria-hidden />
											<AddressChip value={p.wallet} head={4} tail={4} className="text-white/85" />
										</span>
									)}
								</div>
							)}
							{completion && completion.done < completion.total && (
								<Link
									href={routes.editProfile}
									className="group animate-rise mt-5 flex w-full max-w-[520px] items-center gap-4 rounded-2xl border border-primary-500/30 bg-primary-500/[0.07] px-4 py-3.5 transition-colors [--i:4] hover:border-primary-400 md:ml-2.5"
								>
									<span className="min-w-0 flex-1">
										<span className="flex items-baseline justify-between gap-3 text-sm">
											<span className="font-medium text-white">Complete your profile</span>
											<span className="text-white/60 tabular-nums">{completion.percent}%</span>
										</span>
										<span
											role="progressbar"
											aria-valuenow={completion.percent}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`Profile ${completion.percent}% complete`}
											className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10"
										>
											<span
												className="block h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-300"
												style={{ width: `${completion.percent}%` }}
											/>
										</span>
										<span className="mt-1.5 block text-xs text-white/55">
											Next: {completion.steps.find((s) => !s.done)?.label.toLowerCase()}
										</span>
									</span>
									<ArrowRight
										className="size-4 shrink-0 text-primary-300 transition-transform group-hover:translate-x-0.5"
										aria-hidden
									/>
								</Link>
							)}
						</>
					) : profile.isError ? (
						<p className="mt-3 text-sm text-error-200">{errorMessage(profile.error, "We couldn’t load your profile.")}</p>
					) : (
						<div aria-hidden className="mt-3 flex flex-col gap-2.5">
							<span className="skeleton-shimmer block h-8 w-52 rounded-md" />
							<span className="skeleton-shimmer block h-4 w-64 rounded-md" />
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
