"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, HandCoins, MessageSquareText, Send } from "lucide-react";
import { Button } from "@repo/ui/button";
import { CountUp } from "@repo/ui/count-up";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { ErrorState } from "@/components/States";
import { useCategories, useFeaturedProjects, usePublicStats } from "@/features/projects/hooks";
import { ProjectCard, ProjectCardSkeleton } from "@/features/projects/components/ProjectCard";

/**
 * App home (PRD §6.3 step 1): a short hero, live stats, featured projects, categories, how it works, and a builder
 * CTA. The marketing site (apps/landing) does the long pitch; this page gets people to projects fast.
 */

const d = (i: number) => ({ "--d": i }) as CSSProperties;

export function HomeView() {
	const stats = usePublicStats();
	const featured = useFeaturedProjects();
	const categories = useCategories();

	return (
		<div>
			<section className="relative isolate overflow-hidden">
				<div
					aria-hidden
					data-parallax="0.25"
					className="absolute inset-x-0 -top-10 -z-10 h-[520px] bg-cover bg-center opacity-60 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
					style={{ backgroundImage: `url(${withBasePath("/images/grid.webp")})` }}
				/>
				<div aria-hidden className="absolute top-20 -left-40 -z-10 size-[420px] rounded-full bg-primary-500/20 blur-[120px]" />
				<div className="app-container pt-16 pb-14 md:pt-24 md:pb-20">
					<p className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-sm text-primary-200">
						<span className="size-1.5 rounded-full bg-success-200" /> Live on Stellar Testnet
					</p>
					<h1 className="animate-rise mt-5 max-w-[760px] font-display text-[38px] leading-[1.08] font-bold [--i:1] sm:text-5xl md:text-6xl">
						Back community projects you believe in
					</h1>
					<p className="animate-rise mt-5 max-w-[600px] text-base leading-7 text-white/75 [--i:2] md:text-lg">
						Reviewed projects, direct Stellar contributions you can verify on-chain, and a place to share practical feedback.
					</p>
					<div className="animate-rise mt-8 flex flex-col gap-3 [--i:3] sm:flex-row">
						<Button asChild size="lg" className="h-[52px] gap-2 px-7 text-base">
							<Link href={routes.projects}>
								Explore projects <ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline" className="h-[52px] px-7 text-base">
							<Link href={routes.newProject}>Submit a project</Link>
						</Button>
					</div>

					<dl className="mt-12 grid max-w-[720px] grid-cols-3 gap-3 md:mt-16">
						{[
							{ label: "Live projects", value: stats.data?.projects },
							{ label: "Contributors", value: stats.data?.contributors },
							{ label: "Contributions", value: stats.data?.contributions },
						].map((s, i) => (
							<div
								key={s.label}
								data-reveal="up"
								style={d(i)}
								className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:px-6 md:py-5"
							>
								<dd className="font-display text-2xl font-bold text-primary-400 md:text-4xl">
									{s.value === undefined ? (
										<span className="skeleton-shimmer inline-block h-8 w-12 rounded" />
									) : (
										<CountUp value={s.value} />
									)}
								</dd>
								<dt className="mt-1 text-xs text-white/65 md:text-sm">{s.label}</dt>
							</div>
						))}
					</dl>
				</div>
			</section>

			<section aria-labelledby="featured-title" className="app-container py-12 md:py-16">
				<div className="flex items-end justify-between gap-4">
					<div>
						<h2 id="featured-title" data-reveal="up" className="font-display text-2xl font-bold md:text-[32px]">
							Featured projects
						</h2>
						<p data-reveal="up" style={d(1)} className="mt-2 text-white/65">
							Picked by our team from approved projects.
						</p>
					</div>
					<Link
						href={routes.projects}
						className="group hidden shrink-0 items-center gap-1.5 text-primary-300 hover:text-primary-200 sm:inline-flex"
					>
						View all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
				{featured.isError ? (
					<div className="mt-6">
						<ErrorState message={errorMessage(featured.error)} onRetry={() => void featured.refetch()} />
					</div>
				) : (
					<ul className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{featured.data
							? featured.data.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)
							: Array.from({ length: 3 }, (_, i) => <ProjectCardSkeleton key={i} />)}
					</ul>
				)}
				<Link href={routes.projects} className="mt-6 inline-flex items-center gap-1.5 text-primary-300 sm:hidden">
					View all projects <ArrowRight className="size-4" />
				</Link>
			</section>

			{categories.data && categories.data.length > 0 && (
				<section aria-labelledby="cat-title" className="app-container py-8 md:py-12">
					<h2 id="cat-title" data-reveal="up" className="font-display text-2xl font-bold md:text-[32px]">
						Browse by cause
					</h2>
					<ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
						{categories.data.map((c, i) => (
							<li key={c.id} data-reveal="zoom" style={d(i)}>
								<Link
									href={`${routes.projects}?category=${c.slug}`}
									className="group flex h-24 items-end justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/15 to-transparent px-5 py-4 transition-[border-color,background-color] hover:border-primary-500/50 md:h-28"
								>
									<span className="font-display text-lg font-bold">{c.name}</span>
									<ArrowRight className="size-5 text-primary-300 transition-transform group-hover:translate-x-1" aria-hidden />
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			<section aria-labelledby="how-title" className="app-container py-12 md:py-16">
				<h2 id="how-title" data-reveal="up" className="font-display text-2xl font-bold md:text-[32px]">
					How it works
				</h2>
				<ol className="mt-7 grid gap-4 md:grid-cols-4">
					{[
						{
							icon: Send,
							title: "Builders submit",
							body: "A new idea or an existing project, with a plan and a Stellar address.",
						},
						{
							icon: BadgeCheck,
							title: "We review",
							body: "An admin approves it, asks for changes, or declines it. Only approved projects go live.",
						},
						{
							icon: HandCoins,
							title: "You contribute",
							body: "Send XLM or USDC from your own wallet, straight to the project. Verified on-chain.",
						},
						{
							icon: MessageSquareText,
							title: "You give feedback",
							body: "Suggest improvements. Moderated suggestions appear on the project page.",
						},
					].map((s, i) => (
						<li
							key={s.title}
							data-reveal="up"
							style={d(i)}
							className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6"
						>
							<span className="flex size-11 items-center justify-center rounded-xl bg-[#1E2030] text-primary-400">
								<s.icon className="size-5" aria-hidden />
							</span>
							<p className="mt-4 text-xs tracking-wide text-white/45 uppercase">Step {i + 1}</p>
							<h3 className="mt-1 font-display text-lg font-bold">{s.title}</h3>
							<p className="mt-2 text-sm leading-6 text-white/70">{s.body}</p>
						</li>
					))}
				</ol>
			</section>

			<section className="app-container pt-4 pb-16 md:pb-24">
				<div data-reveal="zoom" className="relative overflow-hidden rounded-3xl bg-primary-500 px-6 py-10 md:px-12 md:py-14">
					<div aria-hidden className="absolute -right-20 -bottom-24 size-72 rounded-full bg-white/15 blur-3xl" />
					<h2 className="max-w-[560px] font-display text-[28px] leading-tight font-bold md:text-4xl">
						Have a project that helps your community?
					</h2>
					<p className="mt-3 max-w-[520px] text-white/90">
						Submit it for review. Once approved, people can find it, support it, and help you improve it.
					</p>
					<div className="mt-7 flex flex-col gap-3 sm:flex-row">
						<Button asChild variant="light" size="lg" className="h-12 px-6 text-base text-primary-600">
							<Link href={routes.newProject}>Submit a project</Link>
						</Button>
						<Button asChild size="lg" className="h-12 border border-white/40 bg-transparent px-6 text-base hover:bg-white/10">
							<Link href={routes.faq}>Read the FAQ</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
