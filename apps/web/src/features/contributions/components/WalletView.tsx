"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, ExternalLink, HandCoins, Layers, Lightbulb, ShieldCheck, Timer, Wallet } from "lucide-react";
import { SUGGESTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount, progressPercent, sum } from "@repo/domain/money";
import type { ContributionDetail } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { explorer, shortKey } from "@/lib/stellar/config";
import { timeAgo } from "@/lib/time";
import { AddressChip } from "@/components/AddressChip";
import { Pager } from "@/components/Pager";
import { ProjectLogo } from "@/components/ProjectLogo";
import { EmptyState, ErrorState } from "@/components/States";
import { useWalletContributions, type HistoryFilters } from "@/features/contributions/hooks";
import { ContributionSheet } from "@/features/contributions/components/ContributionSheet";
import { SentChart } from "@/features/contributions/components/SentChart";
import { ContributionStatusPill } from "@/features/contributions/components/StatusPill";
import { WalletBalances } from "@/features/contributions/components/WalletBalances";
import { useMySuggestions } from "@/features/suggestions/hooks";
import { DEMO_WALLET } from "@/features/wallet/connect";
import { useWalletDialog } from "@/features/wallet/dialog-store";
import { useConnectedWallet } from "@/features/wallet/hooks";
import { walletName } from "@/features/wallet/kit";

/**
 * /wallet: the contributor page (PRD §3.2: contributors have no account; the connected wallet is their identity).
 * - Wallet card: which wallet, full address (copy + explorer), network.
 * - Live balance (Horizon Testnet; simulated for the Demo wallet).
 * - What it has sent: totals per asset, confirmed count, projects supported, pending; per-month chart; per-project
 *   breakdown; and the full history (filter by status/asset) with a details panel for each contribution.
 * - Its suggestions and their moderation status.
 * Only confirmed contributions count in totals (pending/failed are listed but never added up).
 */

const d = (i: number) => ({ "--d": i }) as CSSProperties;

const STATUS_TABS = [
	{ id: "all", label: "All" },
	{ id: "confirmed", label: "Confirmed" },
	{ id: "pending", label: "Pending" },
	{ id: "failed", label: "Failed" },
] as const;

export function WalletView() {
	const { ready, address, walletId } = useConnectedWallet();
	const show = useWalletDialog((s) => s.show);

	if (!ready)
		return (
			<div className="app-container py-12" aria-hidden>
				<div className="skeleton-shimmer h-[220px] rounded-3xl" />
			</div>
		);

	if (!address)
		return (
			<div className="app-container py-14 md:py-20">
				<div className="animate-rise mx-auto flex max-w-[560px] flex-col items-center rounded-[28px] border border-white/10 bg-[#11121A] px-6 py-12 text-center md:px-10">
					<span className="animate-signal flex size-16 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-300">
						<Wallet className="size-7" aria-hidden />
					</span>
					<h1 className="mt-6 font-display text-[28px] font-bold md:text-[32px]">Your wallet &amp; contributions</h1>
					<p className="mt-3 leading-7 text-white/70">
						Connect your Stellar wallet to see its balance, every contribution it has sent, where the funds went, and the status
						of your suggestions.
					</p>
					<Button
						size="lg"
						className="mt-7 h-12 gap-2 px-7 text-base"
						onClick={() => show("Connect a wallet to see its balance and contributions.")}
					>
						<Wallet className="size-4" /> Connect wallet
					</Button>
					<p className="mt-5 flex items-center gap-2 text-xs text-white/50">
						<ShieldCheck className="size-4 text-primary-300" aria-hidden /> No account needed. We never ask for your secret key.
					</p>
				</div>
			</div>
		);

	return <ConnectedWallet address={address} walletId={walletId} />;
}

function ConnectedWallet({ address, walletId }: { address: string; walletId: string | null }) {
	const demo = walletId === "demo";
	const [f, setF] = useState<HistoryFilters>({ status: "all", asset: "", page: 1 });
	const [open, setOpen] = useState<ContributionDetail | null>(null);
	const history = useWalletContributions(address, demo, f);
	const s = history.data?.summary;
	const name = demo ? DEMO_WALLET.name : walletName(walletId);
	const totalXlm = s ? (s.total_sent.XLM ?? "0") : "0";

	return (
		<div className="app-container py-8 md:py-12">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="animate-rise font-display text-[32px] leading-tight font-bold md:text-[40px]">My wallet</h1>
					<p className="animate-rise mt-1.5 text-white/65 [--i:1]">
						Your balance and everything this wallet has sent through Chucksales.
					</p>
				</div>
				<Button asChild className="animate-rise h-11 w-full gap-2 px-5 [--i:2] sm:w-auto">
					<Link href={routes.projects}>
						<HandCoins className="size-4" /> Find a project to support
					</Link>
				</Button>
			</header>

			<div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
				{/* Wallet identity card */}
				<section
					aria-label="Connected wallet"
					className="animate-rise relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-[#5470D6] to-[#2B3A8F] p-6 [--i:1] md:p-8"
				>
					<div aria-hidden className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-white/15 blur-3xl" />
					<div
						aria-hidden
						className="absolute inset-0 -z-10 bg-cover opacity-20 mix-blend-overlay"
						style={{ backgroundImage: `url(${withBasePath("/images/grid.webp")})` }}
					/>
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={withBasePath(demo ? "/apple-icon.png" : `/images/wallets/${walletId}.png`)}
								alt=""
								width={40}
								height={40}
								className="size-10 rounded-xl bg-white"
							/>
							<div>
								<p className="font-medium">{name}</p>
								<p className="text-xs text-white/75">{demo ? "Simulated · mock mode" : "Connected"}</p>
							</div>
						</div>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs backdrop-blur">
							<span className="size-1.5 rounded-full bg-success-200" /> Stellar Testnet
						</span>
					</div>
					<p className="mt-8 text-sm text-white/75">Wallet address</p>
					<p className="mt-1 font-mono text-sm leading-6 break-all text-white md:text-[15px]">{address}</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<AddressChip value={address} head={4} tail={4} className="rounded-lg bg-black/20 py-0.5 pl-2.5 text-xs" />
					</div>
					<div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/20 pt-5">
						<div>
							<p className="text-xs text-white/75">Total contributed</p>
							<p className="mt-1 font-display text-2xl font-bold">{s ? `${formatAmount(totalXlm)} XLM` : "…"}</p>
							{s?.total_sent.USDC && <p className="text-sm text-white/85">+ {formatAmount(s.total_sent.USDC)} USDC</p>}
						</div>
						<div>
							<p className="text-xs text-white/75">Contributing since</p>
							<p className="mt-1 font-display text-2xl font-bold">
								{s?.first_at
									? new Date(s.first_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
									: s
										? "—"
										: "…"}
							</p>
						</div>
					</div>
				</section>

				<WalletBalances address={address} demo={demo} />
			</div>

			{/* Summary */}
			<ul className="mt-5 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
				<Stat
					i={0}
					icon={<HandCoins className="size-5" />}
					label="XLM sent (confirmed)"
					value={s ? formatAmount(totalXlm) : undefined}
				/>
				<Stat i={1} icon={<Layers className="size-5" />} label="Contributions confirmed" value={s?.confirmed_count} />
				<Stat i={2} icon={<Lightbulb className="size-5" />} label="Projects supported" value={s?.projects_supported} />
				<Stat
					i={3}
					icon={<Timer className="size-5" />}
					label="Pending confirmation"
					value={s?.pending_count}
					tone={s?.pending_count ? "warn" : undefined}
				/>
			</ul>

			{history.isError && !history.data ? (
				<div className="mt-6">
					<ErrorState
						message={errorMessage(history.error)}
						onRetry={() => void history.refetch()}
						retrying={history.isFetching}
					/>
				</div>
			) : (
				<>
					<div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
						{s ? <SentChart monthly={s.monthly} /> : <div className="skeleton-shimmer h-[300px] rounded-2xl" aria-hidden />}
						<section
							aria-labelledby="where-title"
							data-reveal="up"
							className="rounded-2xl border border-white/10 bg-[#11121A] p-5 md:p-6"
						>
							<h2 id="where-title" className="font-display text-xl font-bold">
								Where your XLM went
							</h2>
							<p className="mt-1 text-sm text-white/50">Confirmed contributions, by project</p>
							{!s ? (
								<div className="mt-5 flex flex-col gap-3" aria-hidden>
									{[0, 1, 2].map((k) => (
										<span key={k} className="skeleton-shimmer block h-12 rounded-xl" />
									))}
								</div>
							) : s.by_project.length === 0 ? (
								<p className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/50">
									Nothing confirmed yet.
								</p>
							) : (
								<ul className="mt-5 flex flex-col gap-4">
									{s.by_project.map((b, i) => {
										const share = progressPercent(b.amount, sum(s.by_project.map((x) => x.amount))) ?? 0;
										return (
											<li key={b.project.id} data-reveal="up" style={d(i)}>
												<Link href={routes.project(b.project.slug)} className="group flex items-center gap-3">
													<ProjectLogo title={b.project.title} src={b.project.logo_url} className="size-10 text-xs" />
													<div className="min-w-0 flex-1">
														<div className="flex items-baseline justify-between gap-3">
															<p className="truncate text-[15px] group-hover:text-primary-300">{b.project.title}</p>
															<p className="shrink-0 text-sm font-medium tabular-nums">{formatAmount(b.amount)} XLM</p>
														</div>
														<div className="mt-1.5 flex items-center gap-2">
															<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
																<div
																	className="h-full rounded-full bg-primary-500 transition-[width] duration-700"
																	style={{ width: `${share}%` }}
																/>
															</div>
															<span className="w-16 shrink-0 text-right text-xs text-white/50 tabular-nums">
																{share}% · {b.count}×
															</span>
														</div>
													</div>
												</Link>
											</li>
										);
									})}
								</ul>
							)}
						</section>
					</div>

					{/* History */}
					<section
						aria-labelledby="history-title"
						data-reveal="up"
						className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#11121A]"
					>
						<div className="flex flex-col gap-4 px-5 pt-5 md:flex-row md:items-center md:justify-between md:px-6 md:pt-6">
							<div>
								<h2 id="history-title" className="font-display text-xl font-bold">
									Contribution history
								</h2>
								<p className="mt-1 text-sm text-white/50">Select one to see every detail, including its Stellar transaction.</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
									{STATUS_TABS.map((t) => (
										<button
											key={t.id}
											type="button"
											role="tab"
											aria-selected={f.status === t.id}
											onClick={() => setF({ ...f, status: t.id, page: 1 })}
											className={cn(
												"h-8 rounded-md px-3 text-sm transition-colors",
												f.status === t.id ? "bg-primary-500 text-white" : "text-white/65 hover:text-white",
											)}
										>
											{t.label}
										</button>
									))}
								</div>
								<label className="relative">
									<span className="sr-only">Asset</span>
									<select
										value={f.asset}
										onChange={(e) => setF({ ...f, asset: e.target.value, page: 1 })}
										className="h-10 cursor-pointer rounded-lg border border-white/15 bg-transparent px-3 text-sm outline-none focus:border-primary-500"
									>
										<option value="" className="bg-[#131318]">
											All assets
										</option>
										<option value="xlm" className="bg-[#131318]">
											XLM
										</option>
										<option value="usdc" className="bg-[#131318]">
											USDC
										</option>
									</select>
								</label>
							</div>
						</div>

						<div className={cn("mt-5 transition-opacity", history.isPlaceholderData && "opacity-60")}>
							{history.isPending ? (
								<div className="flex flex-col gap-2 px-5 pb-5" aria-hidden>
									{[0, 1, 2, 3].map((k) => (
										<span key={k} className="skeleton-shimmer block h-14 rounded-xl" />
									))}
								</div>
							) : history.data && history.data.items.length === 0 ? (
								<EmptyState
									className="mx-5 mb-5"
									title={f.status === "all" && !f.asset ? "No contributions yet" : "Nothing matches these filters"}
									description={
										f.status === "all" && !f.asset
											? "When you support a project, it shows up here with its receipt."
											: "Try another status or asset."
									}
									action={
										f.status === "all" && !f.asset ? (
											<Button asChild>
												<Link href={routes.projects}>Explore projects</Link>
											</Button>
										) : undefined
									}
								/>
							) : history.data ? (
								<>
									<table className="hidden w-full text-left md:table">
										<thead className="border-y border-white/10 text-sm text-white/55">
											<tr>
												<th scope="col" className="px-6 py-3 font-normal">
													Project
												</th>
												<th scope="col" className="px-3 py-3 font-normal">
													Amount
												</th>
												<th scope="col" className="px-3 py-3 font-normal">
													Status
												</th>
												<th scope="col" className="px-3 py-3 font-normal">
													Date
												</th>
												<th scope="col" className="px-3 py-3 font-normal">
													Transaction
												</th>
												<th scope="col" className="px-6 py-3">
													<span className="sr-only">Details</span>
												</th>
											</tr>
										</thead>
										<tbody>
											{history.data.items.map((c, i) => (
												<tr
													key={c.id}
													data-reveal="up"
													style={d(i)}
													onClick={() => setOpen(c)}
													className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
												>
													<td className="px-6 py-3.5">
														<span className="flex min-w-0 items-center gap-3">
															<ProjectLogo title={c.project.title} src={c.project.logo_url} className="size-9 text-[11px]" />
															<span className="truncate">{c.project.title}</span>
														</span>
													</td>
													<td
														className={cn(
															"px-3 font-medium whitespace-nowrap tabular-nums",
															c.status === "failed" && "text-white/45 line-through",
														)}
													>
														{formatAmount(c.amount)} {c.asset.code}
													</td>
													<td className="px-3">
														<ContributionStatusPill status={c.status} />
													</td>
													<td
														className="px-3 text-sm whitespace-nowrap text-white/70"
														title={new Date(c.created_at).toLocaleString()}
													>
														{timeAgo(c.created_at)}
													</td>
													<td className="px-3 text-sm text-white/70">
														{c.simulated ? (
															<span className="text-white/45">Simulated</span>
														) : (
															<a
																href={explorer.tx(c.tx_hash)}
																target="_blank"
																rel="noopener noreferrer"
																onClick={(e) => e.stopPropagation()}
																className="inline-flex items-center gap-1 font-mono hover:text-primary-300"
															>
																{shortKey(c.tx_hash, 6, 4)} <ExternalLink className="size-3.5" />
															</a>
														)}
													</td>
													<td className="px-6 text-right">
														<button
															type="button"
															onClick={(e) => (e.stopPropagation(), setOpen(c))}
															className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-primary-200"
															aria-label={`Details of the ${c.amount} ${c.asset.code} contribution to ${c.project.title}`}
														>
															Details <ChevronRight className="size-4" />
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>

									<ul className="divide-y divide-white/10 border-t border-white/10 md:hidden">
										{history.data.items.map((c, i) => (
											<li key={c.id} data-reveal="up" style={d(i)}>
												<button
													type="button"
													onClick={() => setOpen(c)}
													className="flex w-full items-center gap-3 px-5 py-4 text-left"
												>
													<ProjectLogo title={c.project.title} src={c.project.logo_url} className="size-10 text-xs" />
													<span className="min-w-0 flex-1">
														<span className="block truncate">{c.project.title}</span>
														<ContributionStatusPill status={c.status} className="mt-0.5 text-xs" />
													</span>
													<span className="text-right">
														<span
															className={cn(
																"block font-medium whitespace-nowrap",
																c.status === "failed" && "text-white/45 line-through",
															)}
														>
															{formatAmount(c.amount)} {c.asset.code}
														</span>
														<span className="text-xs text-white/50">{timeAgo(c.created_at)}</span>
													</span>
												</button>
											</li>
										))}
									</ul>
									<Pager
										page={history.data.meta.page}
										pages={history.data.meta.total_pages}
										onPage={(page) => setF({ ...f, page })}
										className="mt-4 mb-5 md:mt-5"
									/>
								</>
							) : null}
						</div>
					</section>
				</>
			)}

			<MySuggestions address={address} />
			<ContributionSheet c={open} onClose={() => setOpen(null)} />
		</div>
	);
}

function Stat({
	i,
	icon,
	label,
	value,
	tone,
}: {
	i: number;
	icon: ReactNode;
	label: string;
	value?: number | string;
	tone?: "warn";
}) {
	return (
		<li data-reveal="up" style={d(i)} className="rounded-2xl border border-white/10 bg-[#11121A] px-4 py-4 md:px-5 md:py-5">
			<span
				className={cn(
					"flex size-9 items-center justify-center rounded-lg",
					tone === "warn" ? "bg-warning-400/15 text-warning-200" : "bg-[#1E2030] text-primary-400",
				)}
				aria-hidden
			>
				{icon}
			</span>
			<p className="mt-3 font-display text-2xl font-bold tabular-nums md:text-[28px]">
				{value === undefined ? <span className="skeleton-shimmer inline-block h-7 w-16 rounded" /> : value}
			</p>
			<p className="mt-0.5 text-xs text-white/60 md:text-sm">{label}</p>
		</li>
	);
}

function MySuggestions({ address }: { address: string }) {
	const q = useMySuggestions(address);
	if (!q.data || q.data.length === 0) return null;
	return (
		<section
			aria-labelledby="my-suggestions"
			data-reveal="up"
			className="mt-5 rounded-2xl border border-white/10 bg-[#11121A] p-5 md:p-6"
		>
			<h2 id="my-suggestions" className="font-display text-xl font-bold">
				My suggestions
			</h2>
			<ul className="mt-4 grid gap-3 md:grid-cols-2">
				{q.data.slice(0, 6).map((s) => (
					<li key={s.id}>
						<Link
							href={routes.project(s.project.slug)}
							className="group block rounded-xl bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.07]"
						>
							<p
								className={cn(
									"text-xs",
									s.status === "published"
										? "text-success-200"
										: s.status === "pending_moderation"
											? "text-warning-200"
											: "text-white/50",
								)}
							>
								{SUGGESTION_STATUS_LABEL[s.status]}
							</p>
							<p className="mt-1 truncate font-medium">{s.title}</p>
							<p className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
								{s.project.title} · {timeAgo(s.created_at)}{" "}
								<ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
							</p>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
