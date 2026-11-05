"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import { PROJECT_ACTION_LABEL, PROJECT_STAGE_LABEL, PROJECT_TYPE_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { EXPLORER, fullDate, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { Avatar, WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, Pager, RowsSkeleton, StatusPill } from "@/components/ui";
import { useAdminCategories } from "@/features/categories/hooks";
import {
	CONTRIBUTIONS_PAGE,
	useAdminProject,
	useAdminProjectInsights,
	useProjectContributions,
	useRevision,
	useRevisions,
	useSetCategory,
} from "@/features/projects/hooks";
import { ProjectActions } from "@/features/projects/components/ProjectActions";
import { RejectionReasonDialog } from "@/features/projects/components/RejectionDialogs";

/**
 * Design "admin page 4", tailored to `GET /admin/projects/{id}`: cover, name, status, the "Action" button, the
 * full submission (story, team, links, fundraising), owner, category (changeable), insights, confirmed
 * contributions, submitted revisions, and every review action with its internal note.
 */

const d = (i: number) => ({ "--d": i }) as CSSProperties;

export function ProjectDetailView({ id }: { id: string }) {
	const project = useAdminProject(id);
	const [page, setPage] = useState(1);
	const [showReason, setShowReason] = useState(false);
	const p = project.data;
	const listed = p?.status === "approved" || p?.status === "archived";
	const contributions = useProjectContributions(id, page, !!p?.fundraisingEnabled && listed);
	const insights = useAdminProjectInsights(id, listed);

	if (project.isError)
		return (
			<div className="admin-container pt-6">
				<BackLink />
				<div className="mt-6">
					{errorStatus(project.error) === 404 ? (
						<EmptyState
							title="Project not found"
							description="It may be a draft (drafts never reach admins), or the link is wrong."
							action={
								<Link href={routes.projects} className="text-primary-300">
									Back to projects
								</Link>
							}
						/>
					) : (
						<ErrorState message={errorMessage(project.error)} onRetry={() => void project.refetch()} retrying={project.isFetching} />
					)}
				</div>
			</div>
		);

	const latest = p ? [...p.reviews].reverse().find((r) => r.reason && (r.action === "reject" || r.action === "request_changes" || r.action === "archive")) : undefined;

	return (
		<div>
			<div className="admin-container">
				<BackLink />
			</div>
			<div className="relative mt-3 h-[140px] overflow-hidden sm:h-[200px] lg:mx-8 lg:rounded-2xl xl:h-[250px]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={p?.coverImageUrl ?? withBasePath("/images/profile-banner.webp")}
					alt=""
					data-parallax="0.15"
					className="absolute inset-x-0 -top-6 h-[calc(100%+3rem)] w-full object-cover"
				/>
			</div>

			<div className="admin-container">
				<div className="-mt-11 flex flex-col gap-6 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0 flex-1">
						{p ? (
							<Avatar name={p.title} className="animate-pop size-[88px] text-2xl ring-4 ring-surface-900 sm:size-[112px] sm:text-3xl" />
						) : (
							<span className="skeleton-shimmer block size-[88px] rounded-full ring-4 ring-surface-900 sm:size-[112px]" />
						)}
					</div>
					{p && (
						<div className="animate-rise flex shrink-0 flex-col gap-2 [--i:2] lg:items-end">
							<ProjectActions project={p} variant="button" showView={false} />
						</div>
					)}
				</div>

				{p ? (
					<>
						<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
							<h1 className="animate-rise font-display text-[26px] leading-tight font-bold md:text-[32px]">{p.title}</h1>
							<StatusPill status={p.status} className="animate-rise text-sm [--i:1] md:text-[15px]" />
							{p.status === "approved" && (
								<span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">{p.published ? "Listed" : "Not listed"}</span>
							)}
							{p.featured && <span className="rounded-full bg-primary-500/15 px-2.5 py-0.5 text-xs text-primary-200">Featured</span>}
							<span className="text-xs text-white/45">Revision {p.revision}</span>
						</div>

						{(p.status === "rejected" || p.status === "changes_requested" || p.status === "archived") && (
							<div
								role="note"
								className={cn(
									"animate-pop mt-4 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
									p.status === "changes_requested" ? "border-warning-400/30 bg-warning-400/[0.06]" : "border-error-400/30 bg-error-400/[0.06]",
								)}
							>
								<div className="min-w-0">
									<p className={cn("text-sm font-medium", p.status === "changes_requested" ? "text-warning-200" : "text-error-200")}>
										{PROJECT_ACTION_LABEL[latest?.action ?? "reject"]}
										{latest ? ` · ${timeAgo(latest.at)}` : ""}
									</p>
									<p className="mt-1 line-clamp-2 text-[15px] leading-6 break-words text-white/85">{latest?.reason ?? "No reason recorded."}</p>
								</div>
								<Button variant="outline" size="sm" className="h-10 w-auto shrink-0 px-4" onClick={() => setShowReason(true)}>
									View details
								</Button>
							</div>
						)}

						<p className="animate-rise mt-3 max-w-[820px] text-base leading-7 text-white/90 [--i:2]">
							{p.summary || <span className="text-white/45">No summary.</span>}
						</p>
						{p.links.length > 0 && (
							<ul className="animate-rise mt-5 flex flex-wrap gap-x-6 gap-y-3 [--i:3]">
								{p.links.map((l, i) => (
									<li key={`${l.url}-${i}`}>
										<a
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group inline-flex items-center gap-2.5 text-base text-white/90 hover:text-white"
										>
											<span className="flex size-8 items-center justify-center rounded-full bg-white/10">
												<Globe className="size-4" />
											</span>
											<span className="underline-offset-4 group-hover:underline">{l.label}</span>
										</a>
									</li>
								))}
							</ul>
						)}

						<dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
							<Fact i={0} label="Owner" value={p.owner.displayName ?? p.owner.name} sub={p.owner.email} />
							<CategoryFact projectId={p.id} current={p.category} i={1} />
							<Fact
								i={2}
								label="Type · stage"
								value={PROJECT_TYPE_LABEL[p.type]}
								sub={p.stage ? PROJECT_STAGE_LABEL[p.stage] : "Stage not set"}
							/>
							<Fact
								i={3}
								label="Submitted"
								value={p.submittedAt ? timeAgo(p.submittedAt) : "—"}
								sub={p.decidedAt ? `Decided ${fullDate(p.decidedAt)}` : p.submittedAt ? fullDate(p.submittedAt) : undefined}
							/>
						</dl>

						<div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
							<section data-reveal="up" className="admin-card px-5 py-5 md:px-7">
								<h2 className="font-display text-xl font-bold">Submission</h2>
								{[
									{ t: "The problem", b: p.problem },
									{ t: "The solution", b: p.solution },
									{ t: "Who it helps", b: p.beneficiaries },
								].map((s) => (
									<div key={s.t} className="mt-4">
										<h3 className="text-sm text-white/55">{s.t}</h3>
										<p className={cn("mt-1 leading-7 whitespace-pre-line", !s.b && "text-white/40")}>{s.b || "Not provided"}</p>
									</div>
								))}
								<div className="mt-4">
									<h3 className="text-sm text-white/55">Team</h3>
									{p.teamMembers.length ? (
										<ul className="mt-1.5 flex flex-wrap gap-2">
											{p.teamMembers.map((m, i) => (
												<li key={`${m.name}-${i}`} className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-sm">
													{m.name} <span className="text-white/50">· {m.role}</span>
												</li>
											))}
										</ul>
									) : (
										<p className="mt-1 text-white/40">No team listed</p>
									)}
								</div>
							</section>
							<section data-reveal="up" style={d(1)} className="admin-card px-5 py-5 md:px-7">
								<h2 className="font-display text-xl font-bold">Fundraising</h2>
								{!p.fundraisingEnabled ? (
									<p className="mt-3 text-white/60">Off. The project is listed for feedback only.</p>
								) : (
									<dl className="mt-3 flex flex-col gap-3 text-[15px]">
										<Row label="Accepts">{p.acceptedAssets.map((a) => a.code).join(", ") || "—"}</Row>
										<Row label="Target">{p.targetAmount ? `${formatAmount(p.targetAmount)} ${p.targetAsset?.code ?? ""}` : "No target"}</Row>
										<Row label="Payout wallet">
											{p.payoutAddress ? (
												<a
													href={`${EXPLORER}/account/${p.payoutAddress}`}
													target="_blank"
													rel="noopener noreferrer"
													title={p.payoutAddress}
													className="inline-flex items-center gap-1.5 font-mono hover:text-primary-300"
												>
													{shortKey(p.payoutAddress, 8, 6)} <ExternalLink className="size-3.5" />
												</a>
											) : (
												"—"
											)}
										</Row>
									</dl>
								)}
								{listed && (
									<div className="mt-5 border-t border-white/10 pt-4">
										<h3 className="text-sm text-white/55">Last 30 days</h3>
										{insights.data ? (
											<ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
												<Mini label="Views" value={insights.data.views} />
												<Mini label="Contributions started" value={insights.data.contributionsStarted} />
												<Mini label="Confirmed" value={insights.data.contributionsConfirmed} />
												<Mini label="Suggestions" value={`${insights.data.suggestionsPublished}/${insights.data.suggestionsReceived}`} />
											</ul>
										) : (
											<span className="skeleton-shimmer mt-2 block h-16 rounded-lg" aria-hidden />
										)}
									</div>
								)}
							</section>
						</div>
					</>
				) : (
					<div aria-hidden className="mt-5 flex flex-col gap-3">
						<span className="skeleton-shimmer block h-8 w-72 rounded" />
						<span className="skeleton-shimmer block h-4 w-full max-w-[720px] rounded" />
						<span className="skeleton-shimmer block h-4 w-full max-w-[560px] rounded" />
					</div>
				)}

				{p?.fundraisingEnabled && listed && (
					<section data-reveal="up" aria-labelledby="contributions-title" className="admin-card mt-10 overflow-hidden">
						<h2 id="contributions-title" className="px-5 py-6 font-display text-2xl font-bold md:px-7">
							Confirmed contributions
						</h2>
						{contributions.isPending ? (
							<RowsSkeleton rows={5} cols={4} />
						) : contributions.isError ? (
							<div className="p-4">
								<ErrorState message={errorMessage(contributions.error)} onRetry={() => void contributions.refetch()} />
							</div>
						) : contributions.data.result.length === 0 ? (
							<EmptyState title="No contributions yet" description="Confirmed contributions appear here." />
						) : (
							<div className={cn("overflow-x-auto transition-opacity", contributions.isPlaceholderData && "opacity-60")}>
								<table className="w-full min-w-[620px] text-left">
									<thead className="border-t border-white/10 text-base">
										<tr>
											<th scope="col" className="px-5 py-4 font-normal md:px-7">
												Contributor
											</th>
											<th scope="col" className="px-3 py-4 font-normal">
												Amount
											</th>
											<th scope="col" className="px-3 py-4 font-normal">
												Transaction
											</th>
											<th scope="col" className="px-3 py-4 text-right font-normal md:pr-7">
												Confirmed
											</th>
										</tr>
									</thead>
									<tbody>
										{contributions.data.result.map((c, i) => (
											<tr key={c.id} data-reveal="up" style={d(i)} className="border-t border-white/10 hover:bg-white/[0.025]">
												<td className="px-5 py-4 md:px-7">
													<Link href={routes.contributor(c.contributorAddress)} className="flex items-center gap-3 hover:text-primary-300">
														<WalletDot address={c.contributorAddress} className="size-7 ring-0" />
														<span className="font-mono text-[15px]" title={c.contributorAddress}>
															{shortKey(c.contributorAddress, 10, 8)}
														</span>
													</Link>
												</td>
												<td className="px-3 text-base">
													{formatAmount(c.amount)} {c.asset.code}
												</td>
												<td className="px-3">
													<a
														href={c.explorerUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 font-mono text-sm text-white/75 hover:text-primary-300"
													>
														{shortKey(c.txHash, 6, 4)} <ExternalLink className="size-3.5" />
													</a>
												</td>
												<td className="px-3 text-right md:pr-7" title={c.confirmedAt ? fullDate(c.confirmedAt) : undefined}>
													{c.confirmedAt ? timeAgo(c.confirmedAt) : "—"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				)}
				{contributions.data && contributions.data.paginationMeta.totalPage > 1 && (
					<Pager
						page={page}
						pages={Math.ceil(contributions.data.paginationMeta.totalCount / CONTRIBUTIONS_PAGE)}
						onPage={setPage}
					/>
				)}

				{p && <Revisions id={p.id} />}

				{p && p.reviews.length > 0 && (
					<section data-reveal="up" aria-labelledby="history-title" className="mt-10 pb-6">
						<h2 id="history-title" className="font-display text-xl font-bold">
							Review history
						</h2>
						<ol className="mt-4 flex flex-col gap-3">
							{[...p.reviews].reverse().map((r) => (
								<li key={r.id} className="rounded-xl border border-white/10 px-5 py-4">
									<p className="text-sm text-white/60">
										<span className="text-white">{r.adminName ?? "An admin"}</span> · {PROJECT_ACTION_LABEL[r.action]} · revision{" "}
										{r.revision} · <span title={fullDate(r.at)}>{timeAgo(r.at)}</span>
									</p>
									{r.reason && <p className="mt-1.5 text-[15px] leading-6 whitespace-pre-line">Builder sees: {r.reason}</p>}
									{r.internalNote && <p className="mt-1 text-sm leading-6 whitespace-pre-line text-white/55">Internal: {r.internalNote}</p>}
								</li>
							))}
						</ol>
					</section>
				)}
			</div>
			{showReason && <RejectionReasonDialog projectId={id} onClose={() => setShowReason(false)} />}
		</div>
	);
}

function CategoryFact({ projectId, current, i }: { projectId: string; current: { id: string; name: string } | null; i: number }) {
	const categories = useAdminCategories();
	const save = useSetCategory();
	return (
		<div data-reveal="up" style={d(i)} className="bg-surface-900 px-5 py-4">
			<dt className="text-sm text-white/55">Category</dt>
			<dd className="mt-1">
				<label className="sr-only" htmlFor="project-category">
					Move to category
				</label>
				<select
					id="project-category"
					value={current?.id ?? ""}
					disabled={save.isPending || !categories.data}
					onChange={(e) =>
						e.target.value &&
						save.mutate(
							{ id: projectId, categoryId: e.target.value },
							{ onSuccess: (p) => notify.success("Category changed", p.category?.name), onError: (err) => notify.fromError(err) },
						)
					}
					className="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent px-2 text-base outline-none focus:border-primary-500"
				>
					{!current && <option value="">Not set</option>}
					{categories.data?.map((c) => (
						<option key={c.id} value={c.id} className="bg-[#131318]" disabled={!c.isActive && c.id !== current?.id}>
							{c.name}
							{c.isActive ? "" : " (inactive)"}
						</option>
					))}
				</select>
			</dd>
		</div>
	);
}

function Revisions({ id }: { id: string }) {
	const list = useRevisions(id);
	const [open, setOpen] = useState<number | null>(null);
	const rev = useRevision(id, open);
	if (!list.data?.length) return null;
	return (
		<section data-reveal="up" aria-labelledby="revisions-title" className="mt-10">
			<h2 id="revisions-title" className="font-display text-xl font-bold">
				Submitted revisions
			</h2>
			<p className="mt-1 text-sm text-white/55">Exactly what the builder sent each time they submitted.</p>
			<ul className="mt-4 flex flex-wrap gap-2">
				{list.data.map((r) => (
					<li key={r.revision}>
						<button
							type="button"
							onClick={() => setOpen(r.revision)}
							className="rounded-lg border border-white/15 px-3.5 py-2 text-sm hover:border-primary-400"
						>
							Revision {r.revision} <span className="text-white/50">· {timeAgo(r.submittedAt)}</span>
						</button>
					</li>
				))}
			</ul>
			<Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
				<DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#11131C] text-white sm:max-w-[680px]">
					<DialogHeader>
						<DialogTitle className="font-display text-xl">Revision {open}</DialogTitle>
						<DialogDescription className="text-white/60">
							{rev.data ? `Submitted ${fullDate(rev.data.submittedAt)}` : "Loading…"}
						</DialogDescription>
					</DialogHeader>
					{rev.isError ? (
						<p className="text-sm text-error-200">{errorMessage(rev.error)}</p>
					) : rev.data ? (
						<dl className="flex flex-col gap-3 text-sm">
							{Object.entries(rev.data.snapshot).map(([k, v]) => (
								<div key={k} className="rounded-lg bg-white/[0.04] px-3.5 py-2.5">
									<dt className="text-xs text-white/50">{k}</dt>
									<dd className="mt-0.5 break-words whitespace-pre-wrap">{formatSnapshot(v)}</dd>
								</div>
							))}
						</dl>
					) : (
						<span className="skeleton-shimmer block h-40 rounded-lg" aria-hidden />
					)}
				</DialogContent>
			</Dialog>
		</section>
	);
}

/** Snapshot values are plain data: strings as they are, everything else as readable JSON (never HTML). */
function formatSnapshot(v: unknown): string {
	if (v === null || v === undefined || v === "") return "—";
	if (typeof v === "string") return v;
	return JSON.stringify(v, null, 2);
}

function BackLink() {
	return (
		<Link
			href={routes.projects}
			className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
		>
			<ArrowLeft className="size-4" /> All projects
		</Link>
	);
}

function Fact({ i, label, value, sub }: { i: number; label: string; value: ReactNode; sub?: string }) {
	return (
		<div data-reveal="up" style={d(i)} className="bg-surface-900 px-5 py-4">
			<dt className="text-sm text-white/55">{label}</dt>
			<dd className="mt-1 truncate text-lg">{value}</dd>
			{sub && <p className="mt-1.5 truncate text-sm text-white/55">{sub}</p>}
		</div>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<dt className="text-white/55">{label}</dt>
			<dd className="min-w-0 truncate text-right">{children}</dd>
		</div>
	);
}

function Mini({ label, value }: { label: string; value: number | string }) {
	return (
		<li className="rounded-lg bg-white/[0.04] px-3 py-2">
			<p className="font-display text-lg font-bold tabular-nums">{value}</p>
			<p className="text-xs text-white/55">{label}</p>
		</li>
	);
}
