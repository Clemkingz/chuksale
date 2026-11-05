"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, XCircle } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { ContributionDetail } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { explorer } from "@/lib/stellar/config";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { EmptyState, ErrorState } from "@/components/States";
import { useContribution } from "@/features/contributions/hooks";
import { STATUS_TONE } from "@/features/contributions/components/StatusPill";

/**
 * /contributions/[id] (PRD §6.5 step 9): Pending (polls every 4 s, announced politely) → Confirmed (receipt with
 * hash and explorer link) / Failed (reason, safe retry = a new contribution) / Expired / Cancelled.
 * Pending is never shown as funded (PRD §13).
 */
export function ContributionStatusView({ id }: { id: string }) {
	const q = useContribution(id);
	const c = q.data;

	if (q.isError)
		return (
			<div className="app-container max-w-[760px] py-16">
				{errorStatus(q.error) === 404 ? (
					<EmptyState
						title="We couldn’t find this contribution"
						description="Check the link, or look in your wallet’s history."
						action={
							<Button asChild>
								<Link href={routes.wallet}>My wallet</Link>
							</Button>
						}
					/>
				) : (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
				)}
			</div>
		);

	if (!c)
		return (
			<div className="app-container max-w-[760px] py-16" aria-hidden>
				<div className="skeleton-shimmer h-[420px] rounded-[24px]" />
			</div>
		);

	return (
		<div className="app-container max-w-[760px] py-10 md:py-14">
			<StatusHeader c={c} />
			<section aria-label="Receipt" className="animate-rise mt-6 rounded-[24px] bg-[#16161B] px-5 py-6 [--i:1] sm:px-8 md:py-8">
				<div className="flex items-center gap-4">
					<ProjectLogo title={c.project.title} src={c.project.logo_url} className="size-12 text-sm" />
					<div className="min-w-0">
						<p className="text-sm text-white/55">Contribution to</p>
						<Link
							href={routes.project(c.project.slug)}
							className="block truncate font-display text-xl font-bold hover:text-primary-300"
						>
							{c.project.title}
						</Link>
					</div>
					<p
						className={cn(
							"ml-auto text-right font-display text-2xl font-bold whitespace-nowrap",
							c.status === "failed" && "text-white/50 line-through",
						)}
					>
						{formatAmount(c.amount, 7)} <span className="text-base font-normal text-white/70">{c.asset.code}</span>
					</p>
				</div>
				<dl className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10">
					<Row label="Status">
						<span className={cn("font-medium", STATUS_TONE[c.status])}>{CONTRIBUTION_STATUS_LABEL[c.status]}</span>
					</Row>
					<Row label="Asset">
						{c.asset.label}
						{c.asset.issuer && <AddressChip value={c.asset.issuer} head={5} tail={5} className="block text-xs text-white/60" />}
					</Row>
					<Row label="From">
						<AddressChip value={c.sender_address} head={8} tail={6} className="text-sm" />
					</Row>
					<Row label="To (project wallet)">
						<AddressChip value={c.destination_or_contract} head={8} tail={6} className="text-sm" />
					</Row>
					<Row label="Memo (reference)">
						<span className="font-mono">{c.reference}</span>
					</Row>
					<Row label="Transaction">
						{c.simulated ? (
							<span className="text-white/55">Simulated (Demo wallet)</span>
						) : (
							<AddressChip value={c.tx_hash} kind="tx" head={8} tail={8} className="text-sm" />
						)}
					</Row>
					{c.ledger_or_event_ref && <Row label="Ledger">{c.ledger_or_event_ref}</Row>}
					<Row label="Sent">{new Date(c.created_at).toLocaleString()}</Row>
					{c.confirmed_at && <Row label="Confirmed">{new Date(c.confirmed_at).toLocaleString()}</Row>}
					<Row label="Network">Stellar Testnet</Row>
				</dl>
				<div className="mt-7 flex flex-col gap-3 sm:flex-row">
					{c.status === "failed" || c.status === "expired" || c.status === "cancelled" ? (
						<Button asChild className="h-12 flex-1">
							<Link href={routes.contribute(c.project.slug)}>Start a new contribution</Link>
						</Button>
					) : (
						<Button asChild className="h-12 flex-1">
							<Link href={routes.project(c.project.slug)}>Back to project</Link>
						</Button>
					)}
					<Button asChild variant="outline" className="h-12 flex-1">
						<Link href={routes.wallet}>My wallet &amp; contributions</Link>
					</Button>
					{!c.simulated && (
						<Button asChild variant="ghost" className="h-12 gap-2">
							<a href={explorer.tx(c.tx_hash)} target="_blank" rel="noopener noreferrer">
								Stellar Expert <ExternalLink className="size-4" />
							</a>
						</Button>
					)}
				</div>
			</section>
		</div>
	);
}

function StatusHeader({ c }: { c: ContributionDetail }) {
	if (c.status === "confirmed")
		return (
			<div className="flex flex-col items-center text-center" aria-live="polite">
				<span className="animate-pop flex size-20 items-center justify-center rounded-full bg-success-400/15 text-success-200">
					<CheckCircle2 className="size-10" aria-hidden />
				</span>
				<h1 className="mt-5 font-display text-[28px] font-bold md:text-[34px]">Contribution confirmed</h1>
				<p className="mt-2 max-w-[460px] text-white/70">
					Verified on Stellar and counted toward the project’s total. Thank you for your support.
				</p>
			</div>
		);
	if (c.status === "failed")
		return (
			<div className="flex flex-col items-center text-center" aria-live="polite">
				<span className="animate-pop flex size-20 items-center justify-center rounded-full bg-error-400/15 text-error-200">
					<XCircle className="size-10" aria-hidden />
				</span>
				<h1 className="mt-5 font-display text-[28px] font-bold md:text-[34px]">Contribution failed</h1>
				<p className="mt-2 max-w-[480px] text-white/70">
					{c.failure_reason ?? "It couldn’t be verified on Stellar."} It isn’t counted.
				</p>
			</div>
		);
	if (c.status === "expired" || c.status === "cancelled")
		return (
			<div className="flex flex-col items-center text-center" aria-live="polite">
				<span className="flex size-20 items-center justify-center rounded-full bg-white/10 text-white/70">
					<AlertTriangle className="size-10" aria-hidden />
				</span>
				<h1 className="mt-5 font-display text-[28px] font-bold">
					{c.status === "expired" ? "This contribution expired" : "This contribution was cancelled"}
				</h1>
				<p className="mt-2 text-white/70">Nothing was counted. You can start a new one.</p>
			</div>
		);
	return (
		<div className="flex flex-col items-center text-center" aria-live="polite">
			<span className="animate-signal flex size-20 items-center justify-center rounded-full bg-warning-400/15 text-warning-200">
				<Clock className="size-10" aria-hidden />
			</span>
			<h1 className="mt-5 font-display text-[28px] font-bold md:text-[34px]">Waiting for confirmation</h1>
			<p className="mt-2 max-w-[460px] text-white/70">
				We’re checking your payment on Stellar. This usually takes a few seconds. It isn’t counted until it’s confirmed.
			</p>
			<p className="mt-3 inline-flex items-center gap-2 text-sm text-white/55">
				<Loader2 className="size-4 animate-spin" aria-hidden /> <SlowHint since={c.created_at} />
			</p>
		</div>
	);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
			<dt className="shrink-0 text-sm text-white/55">{label}</dt>
			<dd className="min-w-0 text-[15px] sm:text-right">{children}</dd>
		</div>
	);
}

/** After 20 s pending, say so (and that it's fine to leave). The clock is read in an effect, not during render. */
function SlowHint({ since }: { since: string }) {
	const [slow, setSlow] = useState(false);
	useEffect(() => {
		const wait = Math.max(0, new Date(since).getTime() + 20_000 - Date.now());
		const id = setTimeout(() => setSlow(true), wait);
		return () => clearTimeout(id);
	}, [since]);
	return <>{slow ? "Taking longer than usual. You can leave this page: we’ll keep checking." : "Checking every few seconds…"}</>;
}
