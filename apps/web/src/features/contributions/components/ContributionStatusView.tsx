"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, Wallet, XCircle } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { Contribution } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { EmptyState, ErrorState } from "@/components/States";
import { useContribution } from "@/features/contributions/hooks";
import { useConnectedWallet } from "@/features/wallet/hooks";
import { useWalletDialog } from "@/features/wallet/dialog-store";
import { STATUS_TONE } from "@/features/contributions/components/StatusPill";
import { BackLink } from "@/components/BackLink";

/**
 * /contributions/[id] (backend guide, "Contributions" step 5): Pending (polls every 4 s, announced politely) →
 * Confirmed (receipt with hash and explorer link) / Failed or Expired (reason; a new contribution is safe).
 * Pending is never shown as funded. Reading it needs the contributor's wallet session.
 */
export function ContributionStatusView({ id }: { id: string }) {
	const q = useContribution(id);
	const c = q.data;
	const { ready, address } = useConnectedWallet();
	const showWallet = useWalletDialog((s) => s.show);

	if (ready && !address)
		return (
			<div className="app-container max-w-[760px] py-16">
				<EmptyState
					icon={<Wallet className="size-6" aria-hidden />}
					title="Connect your wallet to see this contribution"
					description="Contributions are tied to the wallet that sent them. Connect the same wallet to see its status."
					action={
						<Button className="w-auto px-6" onClick={() => showWallet("Connect the wallet this contribution came from.")}>
							Connect wallet
						</Button>
					}
				/>
			</div>
		);

	if (q.isError)
		return (
			<div className="app-container max-w-[760px] py-16">
				{errorStatus(q.error) === 404 || errorStatus(q.error) === 403 ? (
					<EmptyState
						title="We couldn’t find this contribution"
						description="Check the link, and that the wallet that sent it is connected."
						action={
							<Button asChild className="w-auto px-6">
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
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				{c.project.slug ? <BackLink href={routes.project(c.project.slug)} label={c.project.title} /> : <span />}
				<BackLink href={routes.wallet} label="My wallet" className="[&>svg]:hidden" />
			</div>
			<StatusHeader c={c} />
			<section aria-label="Receipt" className="animate-rise mt-6 rounded-[24px] bg-[#16161B] px-5 py-6 [--i:1] sm:px-8 md:py-8">
				<div className="flex items-center gap-4">
					<ProjectLogo title={c.project.title} src={null} className="size-12 text-sm" />
					<div className="min-w-0">
						<p className="text-sm text-white/55">Contribution to</p>
						{c.project.slug ? (
							<Link
								href={routes.project(c.project.slug)}
								className="block truncate font-display text-xl font-bold hover:text-primary-300"
							>
								{c.project.title}
							</Link>
						) : (
							<p className="truncate font-display text-xl font-bold">{c.project.title}</p>
						)}
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
						{c.asset.code}
						{c.asset.issuer && <AddressChip value={c.asset.issuer} head={5} tail={5} className="block text-xs text-white/60" />}
					</Row>
					<Row label="From">
						<AddressChip value={c.contributorAddress} head={8} tail={6} className="text-sm" />
					</Row>
					<Row label="To (the builder’s wallet)">
						<AddressChip value={c.destination} head={8} tail={6} className="text-sm" />
					</Row>
					<Row label="Memo">
						<span className="font-mono">{c.memo}</span>
					</Row>
					<Row label="Network fee">{formatAmount(c.fee, 7)} XLM</Row>
					<Row label="Transaction">
						<AddressChip value={c.txHash} kind="tx" head={8} tail={8} explorerLink={false} className="text-sm" />
					</Row>
					{c.ledger && <Row label="Ledger">{c.ledger}</Row>}
					<Row label="Started">{new Date(c.createdAt).toLocaleString()}</Row>
					{c.confirmedAt && <Row label="Confirmed">{new Date(c.confirmedAt).toLocaleString()}</Row>}
				</dl>
				<div className="mt-7 flex flex-col gap-3 sm:flex-row">
					{c.project.slug &&
						(c.status === "failed" || c.status === "expired" || c.status === "awaiting_signature" ? (
							<Button asChild className="h-12 flex-1">
								<Link href={routes.contribute(c.project.slug)}>Start a new contribution</Link>
							</Button>
						) : (
							<Button asChild className="h-12 flex-1">
								<Link href={routes.project(c.project.slug)}>Back to project</Link>
							</Button>
						))}
					<Button asChild variant="outline" className="h-12 flex-1">
						<Link href={routes.wallet}>My wallet &amp; contributions</Link>
					</Button>
					{(c.status === "confirmed" || c.status === "pending") && (
						<Button asChild variant="ghost" className="h-12 w-auto gap-2 px-5">
							<a href={c.explorerUrl} target="_blank" rel="noopener noreferrer">
								Stellar Expert <ExternalLink className="size-4" />
							</a>
						</Button>
					)}
				</div>
			</section>
		</div>
	);
}

function StatusHeader({ c }: { c: Contribution }) {
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
					{c.failureReason ?? "It couldn’t be completed on Stellar."} It isn’t counted.
				</p>
			</div>
		);
	if (c.status === "expired")
		return (
			<div className="flex flex-col items-center text-center" aria-live="polite">
				<span className="flex size-20 items-center justify-center rounded-full bg-white/10 text-white/70">
					<AlertTriangle className="size-10" aria-hidden />
				</span>
				<h1 className="mt-5 font-display text-[28px] font-bold">This contribution expired</h1>
				<p className="mt-2 max-w-[480px] text-white/70">
					{c.failureReason ?? "It wasn’t signed in time."} No funds moved. You can start a new one.
				</p>
			</div>
		);
	if (c.status === "awaiting_signature")
		return (
			<div className="flex flex-col items-center text-center" aria-live="polite">
				<span className="flex size-20 items-center justify-center rounded-full bg-white/10 text-white/70">
					<Wallet className="size-10" aria-hidden />
				</span>
				<h1 className="mt-5 font-display text-[28px] font-bold">Still waiting for the wallet</h1>
				<p className="mt-2 max-w-[480px] text-white/70">
					This payment hasn’t been signed and nothing has been sent. It expires on its own; you can start a new one.
				</p>
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
				<Loader2 className="size-4 animate-spin" aria-hidden /> <SlowHint since={c.submittedAt ?? c.createdAt} />
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
