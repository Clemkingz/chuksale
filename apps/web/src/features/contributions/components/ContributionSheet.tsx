"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { ContributionDetail } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@repo/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { explorer } from "@/lib/stellar/config";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { STATUS_TONE } from "@/features/contributions/components/StatusPill";

/** Every detail of one contribution (contributor page): what was sent, where, the memo, hash, ledger and times. */
export function ContributionSheet({ c, onClose }: { c: ContributionDetail | null; onClose: () => void }) {
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
								<ProjectLogo title={c.project.title} src={c.project.logo_url} className="size-11 text-xs" />
								<div className="min-w-0">
									<p className="text-xs text-white/50">Contribution to</p>
									<p className="truncate font-display text-lg font-bold">{c.project.title}</p>
								</div>
							</div>
							<p className={cn("mt-5 font-display text-4xl font-bold", c.status === "failed" && "text-white/50 line-through")}>
								{formatAmount(c.amount, 7)} <span className="text-xl font-normal text-white/70">{c.asset.code}</span>
							</p>
							<p className={cn("mt-1.5 text-sm font-medium", STATUS_TONE[c.status])}>{CONTRIBUTION_STATUS_LABEL[c.status]}</p>
							{c.failure_reason && (
								<p className="mt-2 rounded-lg bg-error-400/10 px-3 py-2 text-sm text-error-100">{c.failure_reason}</p>
							)}
						</div>
						<dl className="divide-y divide-white/10 px-6">
							<Item label="Asset">
								{c.asset.label}
								{c.asset.issuer && (
									<AddressChip value={c.asset.issuer} head={6} tail={6} className="mt-0.5 block text-xs text-white/60" />
								)}
							</Item>
							<Item label="From (your wallet)">
								<AddressChip value={c.sender_address} head={8} tail={8} className="text-sm" />
							</Item>
							<Item label="To (project wallet)">
								<AddressChip value={c.destination_or_contract} head={8} tail={8} className="text-sm" />
							</Item>
							<Item label="Memo (reference)">
								<span className="font-mono text-sm">{c.reference}</span>
							</Item>
							<Item label="Transaction hash">
								{c.simulated ? (
									<span className="text-sm text-white/55">Simulated (Demo wallet)</span>
								) : (
									<AddressChip value={c.tx_hash} kind="tx" head={10} tail={10} className="text-sm" />
								)}
							</Item>
							{c.ledger_or_event_ref && <Item label="Ledger">{c.ledger_or_event_ref}</Item>}
							<Item label="Sent">{new Date(c.created_at).toLocaleString()}</Item>
							{c.confirmed_at && <Item label="Confirmed">{new Date(c.confirmed_at).toLocaleString()}</Item>}
							<Item label="Network">Stellar Testnet</Item>
							<Item label="Counted toward the project">
								{c.status === "confirmed" ? "Yes" : "No (only confirmed contributions count)"}
							</Item>
						</dl>
						<div className="flex flex-col gap-2.5 px-6 pt-4 pb-8">
							<Button asChild className="h-11">
								<Link href={routes.contribution(c.id)}>Open receipt page</Link>
							</Button>
							{!c.simulated && (
								<Button asChild variant="outline" className="h-11 gap-2">
									<a href={explorer.tx(c.tx_hash)} target="_blank" rel="noopener noreferrer">
										View on Stellar Expert <ExternalLink className="size-4" />
									</a>
								</Button>
							)}
							<Button asChild variant="ghost" className="h-11">
								<Link href={routes.project(c.project.slug)}>Go to project</Link>
							</Button>
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
