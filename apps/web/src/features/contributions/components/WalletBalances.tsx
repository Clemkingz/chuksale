"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Droplets, Info, RefreshCw } from "lucide-react";
import { formatAmount, subtract } from "@repo/domain/money";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { useWalletBalances } from "@/features/contributions/hooks";

/**
 * Live balances of the connected wallet (contributor page). Real wallets read Horizon Testnet directly, so these
 * are the network's numbers; XLM shows what's spendable after Stellar's locked minimum reserve. An account that
 * doesn't exist yet gets a one-click Friendbot top-up (Testnet only). The Demo wallet shows simulated balances.
 */
export function WalletBalances({ address, demo }: { address: string; demo: boolean }) {
	const q = useWalletBalances(address, demo);
	const qc = useQueryClient();
	const [funding, setFunding] = useState(false);
	const d = q.data;

	async function friendbot() {
		setFunding(true);
		try {
			const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`);
			if (!res.ok && res.status !== 400) throw new Error();
			notify.success("Wallet funded with test XLM", "Friendbot sent 10,000 Testnet XLM. It has no real value.");
			await qc.invalidateQueries({ queryKey: ["wallet-balances"] });
		} catch {
			notify.error("Friendbot didn’t respond", "Try again in a minute.");
		} finally {
			setFunding(false);
		}
	}

	return (
		<section aria-labelledby="balance-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5 md:p-6">
			<div className="flex items-center justify-between gap-3">
				<h2 id="balance-title" className="font-display text-xl font-bold">
					Wallet balance
				</h2>
				<button
					type="button"
					onClick={() => void q.refetch()}
					disabled={q.isFetching}
					aria-label="Refresh balances"
					className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
				>
					<RefreshCw className={cn("size-4", q.isFetching && "animate-spin")} /> <span className="hidden sm:inline">Refresh</span>
				</button>
			</div>
			<p className="mt-1 text-sm text-white/50">
				{d?.status === "active" && d.simulated ? "Simulated Demo-wallet balance (mock mode)" : "Live from Stellar Testnet"}
				{q.dataUpdatedAt
					? ` · updated ${new Date(q.dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
					: ""}
			</p>

			{q.isPending ? (
				<div aria-hidden className="mt-5 flex flex-col gap-3">
					<span className="skeleton-shimmer block h-20 rounded-xl" />
					<span className="skeleton-shimmer block h-20 rounded-xl" />
				</div>
			) : q.isError ? (
				<div role="alert" className="mt-5 rounded-xl border border-error-400/25 bg-error-400/5 px-4 py-4 text-sm text-error-100">
					{q.error instanceof Error ? q.error.message : "Balances couldn’t load."}
					<Button variant="outline" size="sm" className="mt-3 block" onClick={() => void q.refetch()}>
						Try again
					</Button>
				</div>
			) : d?.status === "unfunded" ? (
				<div className="animate-pop mt-5 rounded-xl border border-dashed border-primary-500/40 px-4 py-5">
					<p className="font-medium">This wallet isn’t active on Testnet yet</p>
					<p className="mt-1 text-sm leading-6 text-white/65">
						A Stellar account needs a little XLM before it exists on the network. On Testnet, Friendbot sends free test XLM (no
						real value).
					</p>
					<Button className="mt-4 h-11 gap-2" onClick={friendbot} isLoading={funding} loadingLabel="Asking Friendbot">
						<Droplets className="size-4" /> Fund with test XLM
					</Button>
				</div>
			) : d ? (
				<ul className="mt-5 flex flex-col gap-3">
					{d.balances.map((b, i) => {
						const spendable = b.reserve ? subtract(b.balance, b.reserve) : b.balance;
						return (
							<li
								key={`${b.code}-${b.issuer ?? "native"}`}
								data-reveal="up"
								style={{ "--d": i } as React.CSSProperties}
								className="rounded-xl bg-white/[0.04] px-4 py-4"
							>
								<div className="flex items-center gap-3">
									<span
										aria-hidden
										className={cn(
											"flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
											b.code === "USDC"
												? "bg-[#2775CA] text-white"
												: b.code === "XLM"
													? "bg-white text-black"
													: "bg-primary-500/20 text-primary-200",
										)}
									>
										{b.code === "USDC" ? "$" : b.code === "XLM" ? "✦" : b.code.slice(0, 2)}
									</span>
									<div className="min-w-0 flex-1">
										<p className="font-medium">{b.code}</p>
										<p className="truncate text-xs text-white/50">
											{b.issuer ? `Issuer ${shortKey(b.issuer, 5, 5)}` : "Native asset"}
										</p>
									</div>
									<p className="text-right font-display text-2xl leading-none font-bold tabular-nums">
										{formatAmount(b.balance, 2)}
									</p>
								</div>
								{b.reserve && (
									<p className="mt-2.5 flex items-center gap-1.5 text-xs text-white/55">
										<Info className="size-3.5 shrink-0" aria-hidden />
										{formatAmount(spendable, 2)} XLM spendable · {formatAmount(b.reserve, 1)} XLM locked as Stellar’s minimum
										reserve
									</p>
								)}
							</li>
						);
					})}
					{!d.balances.some((b) => b.code === "USDC") && (
						<li className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs leading-5 text-white/50">
							No USDC (Testnet) yet. To contribute in USDC, add the asset (trustline) in your wallet first.
						</li>
					)}
				</ul>
			) : null}
		</section>
	);
}
