"use client";

import Link from "next/link";
import { BellRing, CheckCircle2, Clock, Eye } from "lucide-react";
import { Button } from "@repo/ui/button";
import { routes } from "@/lib/routes";
import { useBuilderProject } from "@/features/builder-projects/hooks";
import { BackLink } from "@/components/BackLink";

/** /builder/projects/[id]/submitted (PRD §6.2 step 8): confirmation and what happens next. */
export function SubmittedView({ id }: { id: string }) {
	const q = useBuilderProject(id);
	return (
		<div className="app-container max-w-[640px] py-8 md:py-12">
			<BackLink href={routes.builderProject(id)} label="Project status" />
			<div className="mt-6 flex flex-col items-center text-center md:mt-8">
				<span className="animate-pop flex size-20 items-center justify-center rounded-full bg-success-400/15 text-success-200">
					<CheckCircle2 className="size-10" aria-hidden />
				</span>
				<h1 className="animate-rise mt-6 font-display text-[30px] font-bold md:text-[36px]">Submitted for review</h1>
				<p className="animate-rise mt-3 text-lg leading-8 text-white/75 [--i:1]">
					{q.data ? (
						<>
							We’ve received <strong className="text-white">{q.data.title}</strong>.
						</>
					) : (
						"We’ve received your project."
					)}{" "}
					An admin will review it soon.
				</p>
			</div>
			<ol className="mt-10 flex flex-col gap-4">
				{[
					{
						icon: Clock,
						title: "Review",
						body: "An admin checks your submission. You’ll see it as “Under review” on your dashboard.",
					},
					{
						icon: BellRing,
						title: "Decision",
						body: "You’re notified when it’s approved, or if changes are needed (with the reason).",
					},
					{ icon: Eye, title: "Live", body: "Once approved, it’s public and can receive contributions straight to your wallet." },
				].map((s, i) => (
					<li
						key={s.title}
						data-reveal="up"
						style={{ "--d": i } as React.CSSProperties}
						className="flex gap-4 rounded-2xl border border-white/10 px-5 py-4"
					>
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1E2030] text-primary-400">
							<s.icon className="size-5" aria-hidden />
						</span>
						<div>
							<p className="font-medium">{s.title}</p>
							<p className="mt-0.5 text-sm leading-6 text-white/65">{s.body}</p>
						</div>
					</li>
				))}
			</ol>
			<div className="mt-8 flex flex-col gap-3 sm:flex-row">
				<Button asChild className="h-12 flex-1">
					<Link href={routes.builderProject(id)}>View status</Link>
				</Button>
				<Button asChild variant="outline" className="h-12 flex-1">
					<Link href={routes.dashboard}>Back to dashboard</Link>
				</Button>
			</div>
		</div>
	);
}
