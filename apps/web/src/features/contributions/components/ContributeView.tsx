"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Info, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { getControls } from "@repo/mock-api/controls";
import { compare, formatAmount, isValidAmount } from "@repo/domain/money";
import type { AcceptedAsset } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { USE_MOCK_API } from "@/lib/api/source";
import { routes } from "@/lib/routes";
import { ACCEPTED_ASSETS, shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { EmptyState } from "@/components/States";
import { useProject } from "@/features/projects/hooks";
import { ContributionError, buildContributionTx, submitContributionTx } from "@/features/contributions/stellar-tx";
import { useCreateIntent, useSubmitContribution, useWalletBalances, type Intent } from "@/features/contributions/hooks";
import { useConnectedWallet, useRequireWallet } from "@/features/wallet/hooks";
import { isWalletDismissal, signWithWallet, walletErrorMessage, type WalletId } from "@/features/wallet/kit";

/**
 * /projects/[slug]/contribute (PRD §6.5): Amount → Review → Sign, then the status page.
 * D1: a direct payment from the contributor's wallet to the project's address with the intent's reference as memo.
 * D2 assets (XLM, USDC), D12 minimum 1. A closed or declined wallet prompt is never success; a lost response after
 * sending is "check status", never sent again. The Demo wallet (mock mode) simulates the payment.
 */

const QUICK = ["5", "10", "25", "50", "100"];
const MIN = "1";
type Step = "amount" | "review" | "sign";
type Phase = "intent" | "build" | "wallet" | "submit" | "record";

const PHASES: { id: Phase; label: string }[] = [
	{ id: "intent", label: "Preparing your contribution" },
	{ id: "build", label: "Checking your wallet’s balance" },
	{ id: "wallet", label: "Waiting for you to approve in your wallet" },
	{ id: "submit", label: "Sending to Stellar Testnet" },
	{ id: "record", label: "Recording it for verification" },
];

export function ContributeView({ slug }: { slug: string }) {
	const router = useRouter();
	const project = useProject(slug);
	const { address, walletId } = useConnectedWallet();
	const requireWallet = useRequireWallet();
	const balances = useWalletBalances(address, walletId === "demo");
	const createIntent = useCreateIntent();
	const submit = useSubmitContribution();

	const [step, setStep] = useState<Step>("amount");
	const [asset, setAsset] = useState<AcceptedAsset>(ACCEPTED_ASSETS[0]!);
	const [amount, setAmount] = useState("");
	const [touched, setTouched] = useState(false);
	const [agreed, setAgreed] = useState(false);
	const [phase, setPhase] = useState<Phase>("intent");
	const [failure, setFailure] = useState<{ message: string; unknown?: boolean; hash?: string; intent?: Intent } | null>(null);

	const p = project.data;
	const trimmed = amount.trim();
	const amountError = !trimmed
		? "Enter an amount."
		: !isValidAmount(trimmed)
			? "Use numbers only, with up to 7 decimal places."
			: compare(trimmed, MIN) < 0
				? `The minimum is ${MIN} ${asset.code}.`
				: null;
	const held =
		balances.data?.status === "active"
			? balances.data.balances.find((b) => b.code === asset.code && (b.issuer ?? null) === asset.issuer)
			: undefined;
	const overBalance = !!held && !amountError && compare(trimmed, held.balance) > 0;

	if (project.isError || (p && (!p.fundraising || !p.destination_address)))
		return (
			<div className="app-container py-16">
				<EmptyState
					title="This project isn’t accepting contributions"
					description="It may not be approved yet, or fundraising is off."
					action={
						<Button asChild>
							<Link href={routes.projects}>Explore projects</Link>
						</Button>
					}
				/>
			</div>
		);

	/** The whole send: intent → (demo: simulate) | (real: build → sign → Horizon) → record hash → status page. */
	async function send(wallet: string) {
		setStep("sign");
		setFailure(null);
		setPhase("intent");
		let intent: Intent;
		try {
			intent = await createIntent.mutateAsync({
				project_slug: slug,
				wallet_address: wallet,
				asset_id: asset.id,
				amount: trimmed,
			});
		} catch (e) {
			setFailure({ message: errorMessage(e) });
			return;
		}

		if (walletId === "demo" || !walletId) {
			setPhase("wallet");
			await new Promise((r) => setTimeout(r, 1200));
			setPhase("record");
			try {
				const c = await submit.mutateAsync({
					intentId: intent.id,
					simulated: true,
					scenario: USE_MOCK_API ? getControls().paymentScenario : "confirmed",
				});
				router.replace(routes.contribution(c.id));
			} catch (e) {
				setFailure({ message: errorMessage(e), intent });
			}
			return;
		}

		let hash: string;
		try {
			setPhase("build");
			const { xdr } = await buildContributionTx(intent, asset, wallet);
			setPhase("wallet");
			const signed = await signWithWallet(walletId as WalletId, xdr, wallet);
			setPhase("submit");
			hash = await submitContributionTx(signed);
		} catch (e) {
			if (e instanceof ContributionError) return setFailure({ message: e.message, unknown: e.outcomeUnknown, intent });
			if (isWalletDismissal(e)) {
				// Declining is a choice, not a failure: nothing was sent.
				notify.info("Nothing was sent", "You closed or declined the wallet request.");
				setStep("review");
				return;
			}
			return setFailure({ message: walletErrorMessage(e), intent });
		}
		await record(intent, hash);
	}

	/** Records the hash with the API. Safe to repeat (idempotent on tx_hash), so "Try recording again" is safe. */
	async function record(intent: Intent, hash: string) {
		setPhase("record");
		try {
			const c = await submit.mutateAsync({ intentId: intent.id, tx_hash: hash });
			router.replace(routes.contribution(c.id));
		} catch (e) {
			setFailure({
				message: `Your payment was sent (transaction ${shortKey(hash, 6, 6)}), but we couldn’t record it yet. ${errorMessage(e)}`,
				hash,
				intent,
			});
		}
	}

	return (
		<div className="app-container max-w-[760px] py-10 md:py-14">
			<Link href={routes.project(slug)} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
				<ArrowLeft className="size-4" /> Back to project
			</Link>

			<div className="mt-5 flex items-center gap-4">
				{p ? (
					<ProjectLogo title={p.title} src={p.logo_url} className="size-12 text-sm" />
				) : (
					<span className="skeleton-shimmer block size-12 rounded-full" />
				)}
				<div className="min-w-0">
					<p className="text-sm text-white/55">Contribute to</p>
					<h1 className="truncate font-display text-2xl font-bold md:text-[28px]">{p?.title ?? " "}</h1>
				</div>
			</div>

			<ol aria-label="Steps" className="mt-8 grid grid-cols-3 gap-2">
				{(["amount", "review", "sign"] as Step[]).map((s, i) => {
					const idx = ["amount", "review", "sign"].indexOf(step);
					const done = i < idx;
					const active = i === idx;
					return (
						<li key={s} aria-current={active ? "step" : undefined} className="flex flex-col gap-2">
							<span
								className={cn(
									"h-1 rounded-full transition-colors duration-500",
									done || active ? "bg-primary-500" : "bg-white/10",
								)}
							/>
							<span
								className={cn(
									"flex items-center gap-1.5 text-sm capitalize",
									active ? "text-white" : done ? "text-primary-300" : "text-white/45",
								)}
							>
								{done && <Check className="size-3.5" />} {i + 1}. {s}
							</span>
						</li>
					);
				})}
			</ol>

			<section className="mt-6 rounded-[24px] bg-[#16161B] px-5 py-7 sm:px-8 md:py-8">
				{step === "amount" && (
					<div className="animate-page">
						<fieldset>
							<legend className="text-base">Asset</legend>
							<div className="mt-3 grid gap-3 sm:grid-cols-2">
								{ACCEPTED_ASSETS.map((a) => (
									<label
										key={a.id}
										className={cn(
											"flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40",
											asset.id === a.id ? "border-primary-500 bg-primary-500/10" : "border-white/15 hover:border-white/30",
										)}
									>
										<input
											type="radio"
											name="asset"
											className="sr-only"
											checked={asset.id === a.id}
											onChange={() => setAsset(a)}
										/>
										<span
											aria-hidden
											className={cn(
												"flex size-10 items-center justify-center rounded-full text-sm font-bold",
												a.code === "USDC" ? "bg-[#2775CA]" : "bg-white text-black",
											)}
										>
											{a.code === "USDC" ? "$" : "✦"}
										</span>
										<span className="min-w-0">
											<span className="block font-medium">{a.label}</span>
											<span className="block truncate text-xs text-white/55">
												{a.issuer ? `Issuer ${shortKey(a.issuer, 5, 5)}` : "Native Stellar asset"}
											</span>
										</span>
									</label>
								))}
							</div>
						</fieldset>

						<label htmlFor="amount" className="mt-7 block text-base">
							Amount
						</label>
						<div className="relative mt-2.5">
							<input
								id="amount"
								inputMode="decimal"
								autoComplete="off"
								value={amount}
								onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
								onBlur={() => setTouched(true)}
								placeholder="0"
								aria-invalid={touched && !!amountError}
								aria-describedby="amount-help"
								className={cn(
									"h-16 w-full rounded-xl border bg-transparent pr-20 pl-5 font-display text-3xl font-bold outline-none placeholder:text-white/25 focus:ring-2 focus:ring-primary-500/30",
									touched && amountError ? "border-error-300" : "border-white/30 focus:border-primary-500",
								)}
							/>
							<span className="absolute top-1/2 right-5 -translate-y-1/2 text-lg text-white/60">{asset.code}</span>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							{QUICK.map((q) => (
								<button
									key={q}
									type="button"
									onClick={() => setAmount(q)}
									className={cn(
										"h-9 rounded-full border px-4 text-sm transition-colors",
										amount === q ? "border-primary-500 bg-primary-500/15" : "border-white/15 text-white/80 hover:border-white/35",
									)}
								>
									{q} {asset.code}
								</button>
							))}
						</div>
						<p
							id="amount-help"
							className={cn(
								"mt-3 text-sm",
								touched && amountError ? "text-error-200" : overBalance ? "text-warning-200" : "text-white/55",
							)}
						>
							{touched && amountError
								? amountError
								: overBalance
									? `That’s more than this wallet holds (${formatAmount(held!.balance)} ${asset.code}).`
									: held
										? `Available: ${formatAmount(held.balance, 7)} ${asset.code}${balances.data?.status === "active" && balances.data.simulated ? " (demo)" : ""}`
										: `Minimum ${MIN} ${asset.code}. Up to 7 decimal places.`}
						</p>

						<Button
							size="lg"
							className="mt-8 h-14 w-full text-base"
							onClick={() => {
								setTouched(true);
								if (!amountError) setStep("review");
							}}
						>
							Continue
						</Button>
					</div>
				)}

				{step === "review" && p && (
					<div className="animate-page">
						<h2 className="font-display text-xl font-bold">Review your contribution</h2>
						<dl className="mt-5 divide-y divide-white/10 rounded-xl border border-white/10">
							<Row label="Amount">
								<span className="font-display text-xl font-bold">
									{formatAmount(trimmed, 7)} {asset.code}
								</span>
							</Row>
							<Row label="Asset">
								{asset.label}
								{asset.issuer && (
									<AddressChip value={asset.issuer} head={5} tail={5} className="mt-0.5 block text-xs text-white/60" />
								)}
							</Row>
							<Row label="To (project wallet)">
								<AddressChip value={p.destination_address!} head={8} tail={6} className="text-sm" />
							</Row>
							<Row label="From (your wallet)">
								{address ? (
									<AddressChip value={address} head={8} tail={6} className="text-sm" />
								) : (
									<span className="text-white/55">You’ll connect it next</span>
								)}
							</Row>
							<Row label="Network">Stellar Testnet</Row>
							<Row label="Network fee">≈ 0.00001 XLM, paid from your wallet</Row>
							<Row label="Memo">A reference like CSP-XXXXXX is added so we can match your payment</Row>
						</dl>
						<ul className="mt-5 flex flex-col gap-2.5 text-sm leading-6 text-white/75">
							<li className="flex gap-2.5">
								<ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-300" aria-hidden /> The payment goes straight from
								your wallet to the project. Chucksales never holds funds.
							</li>
							<li className="flex gap-2.5">
								<Info className="mt-0.5 size-4 shrink-0 text-primary-300" aria-hidden /> Stellar payments are public: your wallet
								address and the amount will be visible on-chain and on this project.
							</li>
							<li className="flex gap-2.5">
								<AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-200" aria-hidden /> Payments are final and can’t be
								refunded. Approval isn’t a guarantee the project will succeed.
							</li>
						</ul>
						<label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 px-4 py-3.5 text-sm">
							<input
								type="checkbox"
								checked={agreed}
								onChange={(e) => setAgreed(e.target.checked)}
								className="mt-0.5 size-4 accent-primary-500"
							/>
							<span>
								I understand this is a contribution to support the project, not a purchase, and it can’t be reversed.{" "}
								<Link href={routes.risk} className="text-primary-300 hover:underline">
									Risk disclosure
								</Link>
							</span>
						</label>
						<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
							<Button variant="ghost" className="h-14 sm:w-40" onClick={() => setStep("amount")}>
								Back
							</Button>
							<Button
								size="lg"
								className="h-14 flex-1 gap-2 text-base"
								disabled={!agreed}
								onClick={() => requireWallet((wallet) => void send(wallet), "Connect the wallet you want to contribute from.")}
							>
								<Wallet className="size-4" /> {address ? "Confirm and sign" : "Connect wallet and sign"}
							</Button>
						</div>
					</div>
				)}

				{step === "sign" && (
					<div className="animate-page" aria-live="polite">
						{!failure ? (
							<>
								<div className="flex flex-col items-center text-center">
									<span className="animate-signal flex size-16 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
										<Wallet className="size-7" aria-hidden />
									</span>
									<h2 className="mt-5 font-display text-xl font-bold">
										{phase === "wallet" ? "Approve in your wallet" : "Working on it…"}
									</h2>
									<p className="mt-1.5 max-w-[380px] text-sm text-white/60">
										{phase === "wallet"
											? "Check your wallet: it’s asking you to approve this payment."
											: "Don’t close this page."}
									</p>
								</div>
								<ol className="mx-auto mt-7 flex max-w-[420px] flex-col gap-3">
									{PHASES.filter((ph) => walletId !== "demo" || (ph.id !== "build" && ph.id !== "submit")).map((ph) => {
										const order = PHASES.findIndex((x) => x.id === phase);
										const mine = PHASES.findIndex((x) => x.id === ph.id);
										return (
											<li
												key={ph.id}
												className={cn(
													"flex items-center gap-3 text-sm transition-colors",
													mine < order ? "text-success-200" : mine === order ? "text-white" : "text-white/40",
												)}
											>
												{mine < order ? (
													<Check className="size-4" />
												) : mine === order ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													<span className="size-4 rounded-full border border-white/25" />
												)}
												{ph.label}
											</li>
										);
									})}
								</ol>
							</>
						) : (
							<div className="flex flex-col items-center text-center">
								<span
									className={cn(
										"animate-pop flex size-16 items-center justify-center rounded-full",
										failure.unknown || failure.hash ? "bg-warning-400/15 text-warning-200" : "bg-error-400/15 text-error-200",
									)}
								>
									<AlertTriangle className="size-7" aria-hidden />
								</span>
								<h2 className="mt-5 font-display text-xl font-bold">
									{failure.hash
										? "Sent, but not recorded yet"
										: failure.unknown
											? "We can’t confirm what happened"
											: "That didn’t go through"}
								</h2>
								<p className="mt-2 max-w-[440px] text-sm leading-6 text-white/70">{failure.message}</p>
								{failure.unknown && !failure.hash && (
									<p className="mt-2 max-w-[440px] text-sm text-white/60">
										Don’t send it again yet: check your wallet’s history (or the explorer) for this payment first.
									</p>
								)}
								<div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
									{failure.hash && failure.intent ? (
										<Button
											className="h-12 px-6 sm:w-auto"
											isLoading={submit.isPending}
											loadingLabel="Recording"
											onClick={() => void record(failure.intent!, failure.hash!)}
										>
											Try recording again
										</Button>
									) : failure.unknown ? (
										address && (
											<Button asChild className="h-12 px-6 sm:w-auto">
												<Link href={routes.wallet}>Check my wallet history</Link>
											</Button>
										)
									) : (
										<Button className="h-12 px-6 sm:w-auto" onClick={() => setStep("review")}>
											Try again
										</Button>
									)}
									<Button asChild variant="ghost" className="h-12 px-6 sm:w-auto">
										<Link href={routes.project(slug)}>Back to project</Link>
									</Button>
								</div>
							</div>
						)}
					</div>
				)}
			</section>

			{walletId === "demo" && (
				<p className="mt-4 text-center text-xs text-white/45">
					Demo wallet: no real payment is made. Choose the outcome in the Demo panel (bottom-left).
				</p>
			)}
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
