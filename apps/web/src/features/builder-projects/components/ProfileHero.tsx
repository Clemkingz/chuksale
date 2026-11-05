"use client";

import Link from "next/link";
import { Globe, PenLine } from "lucide-react";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { errorMessage } from "@/lib/api/errors";
import { useMe } from "@/features/builder-auth/hooks";

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
	const p = me && {
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
					src={withBasePath("/images/profile-banner.webp")}
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
							{p ? (
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
								<p className="animate-rise mt-3 max-w-[620px] text-[15px] leading-6 whitespace-pre-line text-white/70 [--i:3] md:ml-2.5">{p.bio}</p>
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
