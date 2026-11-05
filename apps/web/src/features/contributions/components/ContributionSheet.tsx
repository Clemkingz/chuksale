"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { Contribution } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@repo/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { STATUS_TONE } from "@/features/contributions/components/StatusPill";

/** Every detail of one contribution (contributor page): what was sent, where, the memo, hash, ledger and times. */
export function ContributionSheet({ c, onClose }: { c: Contribution | null; onClose: () => void }) {
	return (
		<Sheet open={!!c} onOpenChange={(o) => !o && onClose()}>
			<SheetContent
				side="right"
				className="w-full gap-0 overflow-y-auto rounded-none border-white/10 bg-[#0E1018] p-0 text-white sm:max-w-[460px]"
			>
				{c && (
					<>
						<div className="border-b border-white/10 px-6 pt-7 pb-6">
							<SheetTitle className="sr-only">Contribution details</SheetTitle>
							<SheetDescription className="sr-only">
								Everything about this contribution, including its Stellar transaction.
							</SheetDescription>
							<div className="flex items-center gap-3">
								<ProjectLogo title={c.project.title} src={null} className="size-11 text-xs" />
								<div className="min-w-0">
									<p className="text-xs text-white/50">Contribution to</p>
									<p className="truncate font-display text-lg font-bold">{c.project.title}</p>
								</div>
							</div>
							<p className={cn("mt-5 font-display text-4xl font-bold", c.status === "failed" && "text-white/50 line-through")}>
								{formatAmount(c.amount, 7)} <span className="text-xl font-normal text-white/70">{c.asset.code}</span>
							</p>
							<p className={cn("mt-1.5 text-sm font-medium", STATUS_TONE[c.status])}>{CONTRIBUTION_STATUS_LABEL[c.status]}</p>
							{c.failureReason && (
								<p className="mt-2 rounded-lg bg-error-400/10 px-3 py-2 text-sm text-error-100">{c.failureReason}</p>
							)}
						</div>
						<dl className="divide-y divide-white/10 px-6">
							<Item label="Asset">
								{c.asset.code}
								{c.asset.issuer && (
									<AddressChip value={c.asset.issuer} head={6} tail={6} className="mt-0.5 block text-xs text-white/60" />
								)}
							</Item>
							<Item label="From (your wallet)">
								<AddressChip value={c.contributorAddress} head={8} tail={8} className="text-sm" />
							</Item>
							<Item label="To (the builder’s wallet)">
								<AddressChip value={c.destination} head={8} tail={8} className="text-sm" />
							</Item>
							<Item label="Memo">
								<span className="font-mono text-sm">{c.memo}</span>
							</Item>
							<Item label="Network fee">{formatAmount(c.fee, 7)} XLM</Item>
							<Item label="Transaction hash">
								<AddressChip value={c.txHash} kind="tx" head={10} tail={10} explorerLink={false} className="text-sm" />
							</Item>
							{c.ledger && <Item label="Ledger">{c.ledger}</Item>}
							<Item label="Started">{new Date(c.createdAt).toLocaleString()}</Item>
							{c.submittedAt && <Item label="Submitted">{new Date(c.submittedAt).toLocaleString()}</Item>}
							{c.confirmedAt && <Item label="Confirmed">{new Date(c.confirmedAt).toLocaleString()}</Item>}
							<Item label="Counted toward the project">
								{c.status === "confirmed" ? "Yes" : "No (only confirmed contributions count)"}
							</Item>
						</dl>
						<div className="flex flex-col gap-2.5 px-6 pt-4 pb-8">
							<Button asChild className="h-11">
								<Link href={routes.contribution(c.id)}>Open receipt page</Link>
							</Button>
							{(c.status === "confirmed" || c.status === "pending") && (
								<Button asChild variant="outline" className="h-11 gap-2">
									<a href={c.explorerUrl} target="_blank" rel="noopener noreferrer">
										View on Stellar Expert <ExternalLink className="size-4" />
									</a>
								</Button>
							)}
							{c.project.slug && (
								<Button asChild variant="ghost" className="h-11">
									<Link href={routes.project(c.project.slug)}>Go to project</Link>
								</Button>
							)}
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="py-3.5">
			<dt className="text-xs text-white/50">{label}</dt>
			<dd className="mt-1 text-[15px] break-words">{children}</dd>
		</div>
	);
}
