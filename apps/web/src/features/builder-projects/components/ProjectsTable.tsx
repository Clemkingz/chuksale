"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Copy, Eye, ExternalLink, MoreHorizontal, Pencil } from "lucide-react";
import { formatAmount, progressPercent } from "@repo/domain/money";
import { isBuilderEditable, isPubliclyVisible } from "@repo/domain/project-status";
import type { BuilderProjectListItem } from "@repo/domain/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectLogo } from "@/components/ProjectLogo";
import { TimeLeft } from "@/features/builder-projects/components/TimeLeft";

/**
 * Design "Dev add project 3": bordered card, "Projects (n)", columns Name · Amount raised · Time left · Wallet
 * address · Action (•••). Status sits under the name: the builder needs it and the tabs alone don't show it.
 * Below lg the same data stacks as cards. Amounts are confirmed contributions only.
 */

const stagger = (i: number) => ({ "--d": i }) as CSSProperties;

export function ProjectsTable({ items, total, dimmed }: { items: BuilderProjectListItem[]; total: number; dimmed?: boolean }) {
	return (
		<div
			aria-busy={dimmed}
			className={cn(
				"overflow-hidden rounded-2xl border border-white/15 transition-opacity duration-200",
				dimmed && "pointer-events-none opacity-60",
			)}
		>
			<h2 className="px-5 py-5 font-display text-xl font-bold md:px-7 md:py-6 md:text-2xl">Projects ({total})</h2>

			{/* lg+: table */}
			<table className="hidden w-full table-fixed text-left lg:table">
				<thead className="border-t border-white/10 text-base text-white/90">
					<tr>
						<th scope="col" className="w-[28%] px-7 py-5 font-normal">
							Name
						</th>
						<th scope="col" className="w-[24%] px-4 py-5 font-normal">
							Amount raised
						</th>
						<th scope="col" className="w-[16%] px-4 py-5 font-normal">
							Time left
						</th>
						<th scope="col" className="w-[22%] px-4 py-5 font-normal">
							Wallet address
						</th>
						<th scope="col" className="w-[10%] px-4 py-5 text-center font-normal">
							Action
						</th>
					</tr>
				</thead>
				<tbody>
					{items.map((p, i) => (
						<tr
							key={p.id}
							data-reveal="up"
							style={stagger(i)}
							className="border-t border-white/10 transition-colors duration-200 hover:bg-white/[0.025]"
						>
							<td className="px-7 py-[13px]">
								<div className="flex min-w-0 items-center gap-4">
									<ProjectLogo title={p.title} src={p.logo_url} />
									<div className="min-w-0">
										<Link
											href={routes.builderProject(p.id)}
											className="block truncate text-base text-white transition-colors hover:text-primary-300"
										>
											{p.title}
										</Link>
										<StatusBadge status={p.status} className="mt-1" />
									</div>
								</div>
							</td>
							<td className="px-4">
								<Raised project={p} />
							</td>
							<td className="px-4 text-base">
								<TimeLeft endsAt={p.ends_at} />
							</td>
							<td className="px-4">
								<WalletCell address={p.destination_address} />
							</td>
							<td className="px-4 text-center">
								<RowActions project={p} />
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* below lg: cards */}
			<ul className="divide-y divide-white/10 border-t border-white/10 lg:hidden">
				{items.map((p, i) => (
					<li key={p.id} data-reveal="up" style={stagger(i)} className="flex flex-col gap-4 px-5 py-5">
						<div className="flex items-start gap-3">
							<ProjectLogo title={p.title} src={p.logo_url} className="size-11" />
							<div className="min-w-0 flex-1">
								<Link href={routes.builderProject(p.id)} className="block truncate text-base font-medium text-white">
									{p.title}
								</Link>
								<StatusBadge status={p.status} className="mt-1" />
							</div>
							<RowActions project={p} />
						</div>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
							<div className="col-span-2 sm:col-span-1">
								<dt className="text-white/50">Amount raised</dt>
								<dd className="mt-0.5">
									<Raised project={p} />
								</dd>
							</div>
							<div>
								<dt className="text-white/50">Time left</dt>
								<dd className="mt-0.5">
									<TimeLeft endsAt={p.ends_at} />
								</dd>
							</div>
							<div className="min-w-0">
								<dt className="text-white/50">Wallet address</dt>
								<dd className="mt-0.5">
									<WalletCell address={p.destination_address} short />
								</dd>
							</div>
						</dl>
					</li>
				))}
			</ul>
		</div>
	);
}

function Raised({ project: p }: { project: BuilderProjectListItem }) {
	const code = p.target_asset?.code ?? "XLM";
	const live = isPubliclyVisible(p);
	if (!live && Number(p.raised_amount) === 0) return <span className="text-white/45">Not live yet</span>;
	const pct = progressPercent(p.raised_amount, p.target_amount);
	return (
		<div className="min-w-0">
			<p className="truncate text-base">
				{formatAmount(p.raised_amount)} {code}
				{p.target_amount && (
					<span className="text-white/60">
						{" "}
						/ {formatAmount(p.target_amount)} {code}
					</span>
				)}
			</p>
			{pct !== null && (
				<div
					className="mt-1.5 h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-white/10"
					role="progressbar"
					aria-valuenow={Math.min(pct, 100)}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={`${pct}% of target`}
				>
					<div
						className={cn("h-full rounded-full", pct >= 100 ? "bg-success-300" : "bg-primary-500")}
						style={{ width: `${Math.min(pct, 100)}%` }}
					/>
				</div>
			)}
		</div>
	);
}

async function copy(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		notify.success("Address copied");
	} catch {
		notify.error("Couldn’t copy", "Select the address and copy it manually.");
	}
}

function WalletCell({ address, short }: { address: string | null; short?: boolean }) {
	if (!address) return <span className="text-white/40">—</span>;
	return (
		<button
			type="button"
			onClick={() => void copy(address)}
			title={`${address} (click to copy)`}
			aria-label={`Copy wallet address ${address}`}
			className="group inline-flex max-w-full items-center gap-2 text-left font-mono text-sm tracking-tight text-white/90 transition-colors hover:text-white md:text-[15px]"
		>
			<span className="truncate">{short ? shortKey(address, 5, 4) : shortKey(address, 10, 8)}</span>
			<Copy className="size-3.5 shrink-0 text-white/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-lg:opacity-100" />
		</button>
	);
}

function RowActions({ project: p }: { project: BuilderProjectListItem }) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger
				aria-label={`Actions for ${p.title}`}
				className="inline-flex size-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 data-[state=open]:bg-white/10"
			>
				<MoreHorizontal className="size-6" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-52 rounded-xl border-white/10 bg-[#16161B] p-1.5 text-white shadow-xl shadow-black/40"
			>
				<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
					<Link href={routes.builderProject(p.id)}>
						<Eye className="size-4 text-white/60" /> View details
					</Link>
				</DropdownMenuItem>
				{isBuilderEditable(p.status) && (
					<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
						<Link href={routes.editProject(p.id)}>
							<Pencil className="size-4 text-white/60" /> Edit project
						</Link>
					</DropdownMenuItem>
				)}
				{isPubliclyVisible(p) && (
					<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
						<Link href={routes.project(p.slug)}>
							<ExternalLink className="size-4 text-white/60" /> View public page
						</Link>
					</DropdownMenuItem>
				)}
				{p.destination_address && (
					<>
						<DropdownMenuSeparator className="bg-white/10" />
						<DropdownMenuItem
							onSelect={() => void copy(p.destination_address!)}
							className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white"
						>
							<Copy className="size-4 text-white/60" /> Copy wallet address
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function ProjectsTableSkeleton() {
	return (
		<div aria-hidden className="overflow-hidden rounded-2xl border border-white/15">
			<div className="px-5 py-5 md:px-7 md:py-6">
				<span className="skeleton-shimmer block h-7 w-40 rounded-md" />
			</div>
			{Array.from({ length: 4 }, (_, i) => (
				<div key={i} className="flex items-center gap-4 border-t border-white/10 px-5 py-4 md:px-7">
					<span className="skeleton-shimmer size-[46px] shrink-0 rounded-full" />
					<span className="flex flex-1 flex-col gap-2">
						<span className="skeleton-shimmer block h-4 w-1/3 rounded" />
						<span className="skeleton-shimmer block h-3 w-20 rounded-full" />
					</span>
					<span className="skeleton-shimmer hidden h-4 w-36 rounded lg:block" />
					<span className="skeleton-shimmer hidden h-4 w-20 rounded lg:block" />
					<span className="skeleton-shimmer hidden h-4 w-40 rounded lg:block" />
				</div>
			))}
		</div>
	);
}
