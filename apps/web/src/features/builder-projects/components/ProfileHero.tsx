"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, PenLine } from "lucide-react";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { useBuilderProfile } from "@/features/builder-projects/hooks";

/**
 * Design "Dev add project 1/3": full-width banner, round avatar overlapping its bottom edge, name, then the
 * builder's wallet (short, copyable) and "Joined April 15th".
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
	const profile = useBuilderProfile();
	const p = profile.data;

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
							{p?.avatar_url ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={p.avatar_url} alt="" className="size-full object-cover" />
							) : p ? (
								<span className="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-700 font-display text-2xl font-bold text-white md:text-3xl">
									{initials(p.display_name)}
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
								{p.display_name}
							</h1>
							<div className="animate-rise mt-2 flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] text-white/90 [--i:2] md:ml-2.5 md:text-base">
								{p.wallet_address ? (
									<CopyAddress address={p.wallet_address} />
								) : (
									<span className="text-white/50">No wallet linked yet</span>
								)}
								<span>{joined(p.joined_at)}</span>
							</div>
							{p.bio && (
								<p className="animate-rise mt-3 max-w-[620px] text-[15px] leading-6 text-white/70 [--i:3] md:ml-2.5">{p.bio}</p>
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

function CopyAddress({ address }: { address: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			title={address}
			aria-label={`Copy wallet address ${address}`}
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(address);
					setCopied(true);
					notify.success("Address copied");
					setTimeout(() => setCopied(false), 1600);
				} catch {
					notify.error("Couldn’t copy", "Select the address and copy it manually.");
				}
			}}
			className="group inline-flex items-center gap-2 rounded-md transition-colors hover:text-white"
		>
			<span className="font-mono text-[0.95em] tracking-tight">{shortKey(address, 6, 4)}</span>
			{copied ? (
				<Check className="animate-pop size-4 text-success-200" aria-hidden />
			) : (
				<Copy className="size-3.5 text-white/50 transition-colors group-hover:text-primary-300" aria-hidden />
			)}
		</button>
	);
}
