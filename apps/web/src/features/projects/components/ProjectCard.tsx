import Link from "next/link";
import type { CSSProperties } from "react";
import { Users } from "lucide-react";
import { PROJECT_STAGE_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { PublicProjectCard } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { FundingDeadline } from "@/components/FundingDeadline";
import { ProjectLogo } from "@/components/ProjectLogo";
import { Progress } from "@/components/Progress";
import { fundingProgress, raisedIn } from "@/features/projects/funding";

/**
 * A live project in a grid (Home, Explore). Funding shows CONFIRMED totals only, in the target's own asset (other
 * assets are never added in). Everything listed is approved; funding status gets its own chip.
 */

const TINTS = [
	"from-[#3B5BDB]/50 via-[#688CEC]/25",
	"from-[#2FA58C]/45 via-[#2FA58C]/15",
	"from-[#8B6CEC]/45 via-[#8B6CEC]/15",
	"from-[#E08A3C]/45 via-[#E08A3C]/15",
];
const tintFor = (slug: string) => TINTS[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

export function ProjectCard({ project: p, index = 0 }: { project: PublicProjectCard; index?: number }) {
	const f = p.funding;
	const mainAsset = f?.targetAsset ?? f?.acceptedAssets[0];
	const pct = fundingProgress(f);
	const funded = pct !== null && pct >= 100;
	return (
		<li data-reveal="up" style={{ "--d": index % 3 } as CSSProperties} className="h-full">
			<Link
				href={routes.project(p.slug)}
				className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11121A] transition-[border-color,transform,box-shadow] duration-300 ease-(--ease-settle) hover:-translate-y-1 hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none"
			>
				<div className={cn("relative h-28 bg-gradient-to-br to-transparent", tintFor(p.category.slug))}>
					{p.coverImageUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={p.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
					) : (
						<div
							aria-hidden
							className="absolute inset-0 bg-cover opacity-30 mix-blend-screen"
							style={{ backgroundImage: `url(${withBasePath("/images/grid.webp")})` }}
						/>
					)}
					<div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5">
						{p.featured && (
							<span className="rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur">Featured</span>
						)}
						{funded && (
							<span className="rounded-full bg-success-400/20 px-2.5 py-1 text-xs text-success-100 backdrop-blur">
								Target reached
							</span>
						)}
						<FundingDeadline funding={f} />
					</div>
					<ProjectLogo
						title={p.title}
						src={p.logoUrl}
						className="absolute -bottom-6 left-5 size-14 text-base ring-4 ring-[#11121A]"
					/>
				</div>
				<div className="flex flex-1 flex-col px-5 pt-9 pb-5">
					<h3 className="font-display text-lg leading-snug font-bold transition-colors group-hover:text-primary-300">
						{p.title}
					</h3>
					<p className="mt-1.5 flex items-center gap-2 text-sm text-white/55">
						<ProjectLogo
							title={p.builder.organizationName ?? p.builder.displayName ?? "Builder"}
							src={p.builder.avatarUrl}
							className="size-5 text-[9px]"
						/>
						<span className="truncate">by {p.builder.organizationName ?? p.builder.displayName ?? "a Chucksales builder"}</span>
					</p>
					<p className="mt-3 line-clamp-2 text-[15px] leading-6 text-white/80">{p.summary}</p>
					<div className="mt-4 flex flex-wrap gap-1.5 text-xs">
						<span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-white/75">{p.category.name}</span>
						<span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-white/75">{PROJECT_STAGE_LABEL[p.stage]}</span>
					</div>
					<div className="mt-auto pt-5">
						{f && mainAsset ? (
							<>
								<div className="flex items-baseline justify-between gap-3 text-sm">
									<span>
										<span className="font-display text-base font-bold">
											{formatAmount(raisedIn(f, mainAsset.id))} {mainAsset.code}
										</span>
										{f.targetAmount && <span className="text-white/50"> of {formatAmount(f.targetAmount)}</span>}
									</span>
									{pct !== null && <span className="text-white/60 tabular-nums">{pct}%</span>}
								</div>
								<Progress percent={pct} className="mt-2" />
								<p className="mt-2.5 flex items-center gap-1.5 text-xs text-white/50">
									<Users className="size-3.5" aria-hidden /> {f.contributionCount} contribution
									{f.contributionCount === 1 ? "" : "s"} · Accepts {f.acceptedAssets.map((a) => a.code).join(" / ")}
								</p>
							</>
						) : (
							<p className="text-xs text-white/50">Not raising funds · open to suggestions</p>
						)}
					</div>
				</div>
			</Link>
		</li>
	);
}

export function ProjectCardSkeleton() {
	return (
		<li aria-hidden className="overflow-hidden rounded-2xl border border-white/10 bg-[#11121A]">
			<div className="skeleton-shimmer h-28" />
			<div className="flex flex-col gap-3 px-5 pt-9 pb-5">
				<span className="skeleton-shimmer block h-5 w-2/3 rounded" />
				<span className="skeleton-shimmer block h-4 w-full rounded" />
				<span className="skeleton-shimmer block h-4 w-4/5 rounded" />
				<span className="skeleton-shimmer mt-4 block h-1.5 w-full rounded-full" />
			</div>
		</li>
	);
}
