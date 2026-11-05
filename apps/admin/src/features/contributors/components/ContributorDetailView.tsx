"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ExternalLink } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL, SUGGESTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { EXPLORER, fullDate, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui";
import { useAdminContributions } from "@/features/monitor/hooks";
import { useAdminSuggestions, useLiftRestriction, useRestrictions } from "@/features/moderation/hooks";
import { groupByWallet } from "@/features/contributors/summary";
import { RestrictDialog } from "@/features/moderation/components/RestrictDialog";

/**
 * /contributors/[address]: one wallet's activity. Its contributions (any status), confirmed totals per asset, its
 * suggestions, and whether it's restricted from suggesting and reporting (restrict / lift).
 */
export function ContributorDetailView({ address }: { address: string }) {
	const contributions = useAdminContributions({ status: "", address, limit: 100, offset: 0 });
	const suggestions = useAdminSuggestions({ status: "", reported: false, address, page: 1 });
	const restrictions = useRestrictions();
	const lift = useLiftRestriction();
	const [restricting, setRestricting] = useState(false);
	const list = contributions.data?.result;
	const confirmed = list?.filter((c) => c.status === "confirmed") ?? [];
	const summary = groupByWallet(confirmed)[0];
	const restriction = restrictions.data?.find((r) => r.address === address);

	return (
		<div className="admin-container pt-2 md:pt-6">
			<Link
				href={routes.contributors}
				className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
			>
				<ArrowLeft className="size-4" /> Contributors
			</Link>

			<header className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<WalletDot address={address} className="size-14 ring-0" />
					<div className="min-w-0">
						<h1 className="animate-rise truncate font-mono text-xl md:text-2xl" title={address}>
							{shortKey(address, 10, 8)}
						</h1>
						<a
							href={`${EXPLORER}/account/${address}`}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 inline-flex items-center gap-1 text-sm text-white/60 hover:text-primary-300"
						>
							View on Stellar Expert <ExternalLink className="size-3.5" />
						</a>
					</div>
				</div>
				{restriction ? (
					<Button
						variant="outline"
						className="h-11 w-auto px-5"
						isLoading={lift.isPending}
						loadingLabel="Lifting"
						onClick={() => lift.mutate(address, { onSuccess: () => notify.success("Restriction lifted"), onError: (e) => notify.fromError(e) })}
					>
						Lift restriction
					</Button>
				) : (
					<Button variant="outline" className="h-11 w-auto gap-2 border-error-400/40 px-5 text-error-200 hover:bg-error-400/10" onClick={() => setRestricting(true)}>
						<Ban className="size-4" /> Restrict from suggesting
					</Button>
				)}
			</header>

			{restriction && (
				<div role="note" className="animate-pop mt-5 rounded-2xl border border-error-400/30 bg-error-400/[0.06] px-5 py-4">
					<p className="text-sm font-medium text-error-200">
						Restricted {restriction.until ? `until ${fullDate(restriction.until)}` : "until lifted"}
					</p>
					<p className="mt-1 whitespace-pre-line text-white/85">{restriction.reason}</p>
				</div>
			)}

			<dl className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
				<Fact label="Confirmed total" value={summary ? summary.totals.map((t) => `${formatAmount(t.amount)} ${t.asset.code}`).join(" · ") : list ? "0" : undefined} />
				<Fact label="Confirmed contributions" value={list ? String(confirmed.length) : undefined} />
				<Fact label="Projects supported" value={list ? String(summary?.projects ?? 0) : undefined} />
			</dl>

			<section data-reveal="up" aria-labelledby="c-title" className="admin-card mt-8 overflow-hidden">
				<h2 id="c-title" className="px-5 py-5 font-display text-xl font-bold md:px-7">
					Contributions
				</h2>
				{contributions.isPending ? (
					<RowsSkeleton rows={4} cols={4} />
				) : contributions.isError ? (
					<div className="p-4">
						<ErrorState message={errorMessage(contributions.error)} onRetry={() => void contributions.refetch()} />
					</div>
				) : !list?.length ? (
					<EmptyState title="No contributions from this wallet" />
				) : (
					<ul>
						{list.map((c, i) => (
							<li key={c.id} data-reveal="up" style={{ "--d": Math.min(i, 8) } as CSSProperties} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 px-5 py-3.5 md:px-7">
								<Link href={routes.project(c.project.id)} className="min-w-0 flex-1 truncate hover:text-primary-300">
									{c.project.title}
								</Link>
								<span className="tabular-nums">
									{formatAmount(c.amount)} {c.asset.code}
								</span>
								<span className={cn("w-40 text-sm", c.status === "confirmed" ? "text-success-300" : c.status === "failed" ? "text-error-300" : "text-white/60")}>
									{CONTRIBUTION_STATUS_LABEL[c.status]}
								</span>
								<span className="w-24 text-right text-sm text-white/55" title={fullDate(c.createdAt)}>
									{timeAgo(c.createdAt)}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>

			<section data-reveal="up" aria-labelledby="s-title" className="admin-card mt-6 mb-6 overflow-hidden">
				<h2 id="s-title" className="px-5 py-5 font-display text-xl font-bold md:px-7">
					Suggestions
				</h2>
				{suggestions.isPending ? (
					<RowsSkeleton rows={3} cols={3} />
				) : !suggestions.data?.result.length ? (
					<EmptyState title="No suggestions from this wallet" />
				) : (
					<ul>
						{suggestions.data.result.map((s) => (
							<li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 px-5 py-3.5 md:px-7">
								<Link href={routes.suggestion(s.id)} className="min-w-0 flex-1 truncate hover:text-primary-300">
									{s.title}
								</Link>
								<span className="text-sm text-white/60">{s.project.title}</span>
								<span className="text-sm">{SUGGESTION_STATUS_LABEL[s.status]}</span>
								<span className="text-sm text-white/55">{timeAgo(s.createdAt)}</span>
							</li>
						))}
					</ul>
				)}
			</section>
			{restricting && <RestrictDialog address={address} onClose={() => setRestricting(false)} />}
		</div>
	);
}

function Fact({ label, value }: { label: string; value?: string }) {
	return (
		<div className="bg-surface-900 px-5 py-4">
			<dt className="text-sm text-white/55">{label}</dt>
			<dd className="mt-1 truncate text-lg">{value ?? <span className="skeleton-shimmer inline-block h-6 w-24 rounded" />}</dd>
		</div>
	);
}
