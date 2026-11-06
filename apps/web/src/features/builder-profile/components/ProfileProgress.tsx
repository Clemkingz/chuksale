"use client";

import { Check, PartyPopper } from "lucide-react";
import type { Me } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { profileCompletion } from "@/features/builder-profile/completion";

/**
 * "Profile 67% complete": a progress bar over the saved profile, and a checklist whose open steps jump to their
 * section. Updates as soon as each save lands.
 */
export function ProfileProgress({ me, className }: { me: Me; className?: string }) {
	const { steps, done, total, percent } = profileCompletion(me);
	const complete = done === total;
	return (
		<section
			aria-labelledby="profile-progress-title"
			className={cn("rounded-[24px] border border-white/10 bg-[#16161B] px-5 py-6 sm:px-8", className)}
		>
			<div className="flex items-baseline justify-between gap-4">
				<h2 id="profile-progress-title" className="flex items-center gap-2 font-display text-lg font-bold md:text-xl">
					{complete && <PartyPopper className="size-5 text-success-200" aria-hidden />}
					{complete ? "Your profile is complete" : "Profile strength"}
				</h2>
				<p className="font-display text-2xl font-bold tabular-nums">
					{percent}
					<span className="text-base font-normal text-white/55">%</span>
				</p>
			</div>
			<div
				role="progressbar"
				aria-valuenow={percent}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={`Profile ${percent}% complete`}
				className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
			>
				<div
					className={cn(
						"h-full rounded-full transition-[width] duration-700 ease-(--ease-settle)",
						complete ? "bg-success-300" : "bg-gradient-to-r from-primary-600 to-primary-300",
					)}
					style={{ width: `${percent}%` }}
				/>
			</div>
			<p className="mt-2 text-sm text-white/55">
				{complete
					? "Supporters see a full picture of who’s behind your projects."
					: `${done} of ${total} done. A complete profile helps supporters trust your projects.`}
			</p>
			<ul className="mt-4 flex flex-wrap gap-2">
				{steps.map((s) => (
					<li key={s.id}>
						{s.done ? (
							<span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-400/10 px-3 text-xs text-success-100">
								<Check className="size-3.5" aria-hidden /> {s.label}
							</span>
						) : (
							<a
								href={`#${s.anchor}`}
								className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-white/25 px-3 text-xs text-white/75 transition-colors hover:border-primary-400 hover:text-white"
							>
								<span className="size-1.5 rounded-full bg-primary-400" aria-hidden /> {s.label}
							</a>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
