"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Clock, Info, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { compare, formatAmount, isValidAmount, sum } from "@repo/domain/money";
import type { PreparedContribution, StellarAsset } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { useAccountSummary, useNetwork } from "@/lib/stellar/network";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { BackLink } from "@/components/BackLink";
import { EmptyState } from "@/components/States";
import { useProject } from "@/features/projects/hooks";
import { usePrepareContribution, useSubmitContribution } from "@/features/contributions/hooks";
import { signAny } from "@/features/wallet/connect";
import { useConnectedWallet, useRequireWallet } from "@/features/wallet/hooks";
import { isWalletDismissal, walletErrorMessage } from "@/features/wallet/kit";

/**
 * /projects/[slug]/contribute (backend guide, "Contributions"): Amount → Review → Sign, then the status page.
 * The API prepares the payment (direct, wallet to builder, in an accepted asset) after checking asset, trustlines
 * and balances; the wallet signs it; the API submits it to Stellar. A closed or declined wallet prompt is never
 * success, and a lost response after submitting is "check status" (the status page polls), never "send again".
 */

const QUICK = ["5", "10", "25", "50", "100"];
type Step = "amount" | "review" | "sign";
type Phase = "wallet" | "submit";

/** Every payment pays a small network fee in XLM; keep this much spare for it (display check only). */
const FEE_HEADROOM = "0.01";

export function ContributeView({ slug }: { slug: string }) {
	const router = useRouter();
	const project = useProject(slug);
	const network = useNetwork();
	const { address, walletId } = useConnectedWallet();
	const requireWallet = useRequireWallet();
	const account = useAccountSummary(address);
	const prepare = usePrepareContribution(slug);
	const submit = useSubmitContribution();

	const p = project.data;
	const accepted = p?.funding?.acceptedAssets ?? [];
	const [step, setStep] = useState<Step>("amount");
	const [assetId, setAssetId] = useState<string | null>(null);
	const [amount, setAmount] = useState("");
	const [touched, setTouched] = useState(false);
	const [agreed, setAgreed] = useState(false);
	const [phase, setPhase] = useState<Phase>("wallet");
	const [prepared, setPrepared] = useState<PreparedContribution | null>(null);
	const [failure, setFailure] = useState<string | null>(null);

	const asset: StellarAsset | undefined = accepted.find((a) => a.id === assetId) ?? accepted[0];
	const trimmed = amount.trim();
	const amountError = !trimmed
		? "Enter an amount."
		: !isValidAmount(trimmed)
			? "Use numbers only, with up to 7 decimal places, above 0."
			: null;

	// The guide's pre-sign checks, in order, from the account lookup (the API re-checks them all on prepare).
	const summary = account.data;
	const held = summary?.assets.find((a) => a.id === asset?.id);
	const xlm = summary?.assets.find((a) => a.native);
	const check: string | null = !summary
		? null
		: !summary.exists
			? "This wallet isn’t activated yet. On Testnet, fund it with Friendbot at lab.stellar.org."
			: asset && !asset.native && !held?.trusted
				? `Add ${asset.code} to your wallet first (its add-asset screen, issuer ${asset.issuer?.slice(0, 4)}…${asset.issuer?.slice(-4)}).`
				: !amountError && held?.balance != null && compare(trimmed, held.balance) > 0
					? `Not enough ${asset?.code}: this wallet holds ${formatAmount(held.balance, 7)}.`
					: !xlm?.balance || compare(xlm.balance, asset?.native && !amountError ? sum([trimmed, FEE_HEADROOM]) : FEE_HEADROOM) < 0
						? "Keep a little XLM in this wallet: every payment pays a small network fee in XLM."
						: null;

	if (project.isError || (p && (!p.fundraisingEnabled || !p.funding || !accepted.length || p.funding.ended)))
		return (
			<div className="app-container py-16">
				<BackLink href={p ? routes.project(slug) : routes.projects} label={p ? "Back to project" : "All projects"} />
				<EmptyState
					className="mt-6"
					title={p?.funding?.ended ? "Funding for this project has ended" : "This project isn’t accepting contributions"}
					description={
						p?.funding?.ended
							? "Its funding deadline has passed, so new contributions are closed. You can still suggest improvements."
							: "It may not be listed, or fundraising is off."
					}
					action={
						<Button asChild className="w-auto px-6">
							<Link href={p ? routes.project(slug) : routes.projects}>{p ? "View project" : "Explore projects"}</Link>
						</Button>
					}
				/>
			</div>
		);

	/** Step 1 → 2: the API prepares the payment (needs the wallet token). */
	async function toReview() {
		if (!asset) return;
		setFailure(null);
		try {
			const prep = await prepare.mutateAsync({ assetId: asset.id, amount: trimmed });
			setPrepared(prep);
			setAgreed(false);
			setStep("review");
		} catch (e) {
			setFailure(errorMessage(e));
		}
	}

	/** Step 3: sign in the wallet, then submit. */
	async function signAndSubmit(prep: PreparedContribution) {
		if (!walletId) return;
		setStep("sign");
		setFailure(null);
		setPhase("wallet");
		let signed: string;
		try {
			signed = await signAny(walletId, prep.transaction, prep.contributorAddress, prep.networkPassphrase);
		} catch (e) {
			if (isWalletDismissal(e)) {
				// Declining is a choice, not a failure: nothing was sent.
				notify.info("Nothing was sent", "You closed or declined the wallet request.");
				setStep("review");
				return;
			}
			setFailure(walletErrorMessage(e));
			return;
		}
		setPhase("submit");
		try {
			const c = await submit.mutateAsync({ id: prep.id, transaction: signed });
			router.replace(routes.contribution(c.id));
		} catch (e) {
			// No answer (timeout, network): the payment may have gone through. The status page checks; never resend.
			if (!errorStatus(e)) {
				notify.info("Checking your payment", "We didn’t hear back in time. This page checks Stellar for it.");
				router.replace(routes.contribution(prep.id));
				return;
			}
			setFailure(errorMessage(e));
		}
	}

	const steps: Step[] = ["amount", "review", "sign"];
	const stepIndex = steps.indexOf(step);

	return (
		<div className="app-container max-w-[760px] py-10 md:py-14">
			<BackLink href={routes.project(slug)} label="Back to project" />

			<div className="mt-5 flex items-center gap-4">
				{p ? (
					<ProjectLogo title={p.title} src={p.logoUrl} className="size-12 text-sm" />
				) : (
					<span className="skeleton-shimmer block size-12 rounded-full" />
				)}
				<div className="min-w-0">
					<p className="text-sm text-white/55">Contribute to</p>
					<h1 className="truncate font-display text-2xl font-bold md:text-[28px]">{p?.title ?? " "}</h1>
				</div>
			</div>

			<ol aria-label="Steps" className="mt-8 grid grid-cols-3 gap-2">
				{steps.map((s, i) => {
					const done = i < stepIndex;
					const active = i === stepIndex;
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
								{!p
									? [0, 1].map((k) => <span key={k} className="skeleton-shimmer block h-[70px] rounded-xl" />)
									: accepted.map((a) => (
											<label
												key={a.id}
												className={cn(
													"flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40",
													asset?.id === a.id ? "border-primary-500 bg-primary-500/10" : "border-white/15 hover:border-white/30",
												)}
											>
												<input
													type="radio"
													name="asset"
													className="sr-only"
													checked={asset?.id === a.id}
													onChange={() => setAssetId(a.id)}
												/>
												<AssetIcon asset={a} />
												<span className="min-w-0">
													<span className="block font-medium">{a.code}</span>
													<span className="block truncate text-xs text-white/55">
														{a.issuer ? `Issuer ${a.issuer.slice(0, 5)}…${a.issuer.slice(-5)}` : "Native Stellar asset"}
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
							<span className="absolute top-1/2 right-5 -translate-y-1/2 text-lg text-white/60">{asset?.code}</span>
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
									{q} {asset?.code}
								</button>
							))}
						</div>
						<p
							id="amount-help"
							className={cn(
								"mt-3 text-sm",
								touched && amountError ? "text-error-200" : check ? "text-warning-200" : "text-white/55",
							)}
						>
							{touched && amountError
								? amountError
								: check
									? check
									: held?.balance
										? `Available: ${formatAmount(held.balance, 7)} ${asset?.code}`
										: "Up to 7 decimal places."}
						</p>

						{failure && (
							<p
								role="alert"
								className="animate-pop mt-5 rounded-lg border border-error-400/30 bg-error-400/10 px-4 py-3 text-sm text-error-100"
							>
								{failure}
							</p>
						)}

						<Button
							size="lg"
							className="mt-8 h-14 w-full gap-2 text-base"
							isLoading={prepare.isPending}
							loadingLabel="Preparing your contribution"
							disabled={!p}
							onClick={() => {
								setTouched(true);
								if (amountError) return;
								requireWallet(() => void toReview(), "Connect the wallet you want to contribute from.");
							}}
						>
							{!address && <Wallet className="size-4" />} {address ? "Continue" : "Connect wallet and continue"}
						</Button>
					</div>
				)}

				{step === "review" && p && prepared && (
					<ReviewStep
						prepared={prepared}
						explorerUrl={network.data?.explorerUrl}
						agreed={agreed}
						setAgreed={setAgreed}
						onBack={() => setStep("amount")}
						onSign={() => void signAndSubmit(prepared)}
						onExpired={() => {
							notify.info("That took a while", "The payment expired before it was signed. Prepare it again.");
							setPrepared(null);
							setStep("amount");
						}}
					/>
				)}

				{step === "sign" && (
					<div className="animate-page" aria-live="polite">
						{!failure ? (
							<>
								<div className="flex flex-col items-center text-center">
									<span className="animate-signal flex size-16 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
										<Wallet className="size-7" aria-hidden />
									</span>
									<h2 className="mt-5 font-display text-xl font-bold text-balance">
										{phase === "wallet" ? "Approve in your wallet" : "Sending to Stellar…"}
									</h2>
									<p className="mt-1.5 max-w-[380px] text-sm text-white/60">
										{phase === "wallet"
											? "Check your wallet: it’s asking you to approve this payment."
											: "Don’t close this page."}
									</p>
								</div>
								<ol className="mx-auto mt-7 flex max-w-[420px] flex-col gap-3">
									{(
										[
											{ id: "wallet", label: "Waiting for you to approve in your wallet" },
											{ id: "submit", label: "Submitting to Stellar and confirming" },
										] as const
									).map((ph, i) => {
										const order = phase === "wallet" ? 0 : 1;
										return (
											<li
												key={ph.id}
												className={cn(
													"flex items-start gap-3 text-sm leading-5 transition-colors",
													i < order ? "text-success-200" : i === order ? "text-white" : "text-white/40",
												)}
											>
												{i < order ? (
													<Check className="mt-0.5 size-4 shrink-0" />
												) : i === order ? (
													<Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
												) : (
													<span className="mt-0.5 size-4 shrink-0 rounded-full border border-white/25" />
												)}
												{ph.label}
											</li>
										);
									})}
								</ol>
							</>
						) : (
							<div className="flex flex-col items-center text-center">
								<span className="animate-pop flex size-16 items-center justify-center rounded-full bg-error-400/15 text-error-200">
									<AlertTriangle className="size-7" aria-hidden />
								</span>
								<h2 className="mt-5 font-display text-xl font-bold">That didn’t go through</h2>
								<p className="mt-2 max-w-[440px] text-sm leading-6 text-white/70">{failure}</p>
								<div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
									<Button
										className="h-12 w-full px-6 sm:w-auto"
										onClick={() => {
											setFailure(null);
											setPrepared(null);
											setStep("amount");
										}}
									>
										Start again
									</Button>
									{prepared && (
										<Button asChild variant="ghost" className="h-12 w-full px-6 sm:w-auto">
											<Link href={routes.contribution(prepared.id)}>Check its status</Link>
										</Button>
									)}
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

function ReviewStep({
	prepared: c,
	explorerUrl,
	agreed,
	setAgreed,
	onBack,
	onSign,
	onExpired,
}: {
	prepared: PreparedContribution;
	explorerUrl?: string;
	agreed: boolean;
	setAgreed: (v: boolean) => void;
	onBack: () => void;
	onSign: () => void;
	onExpired: () => void;
}) {
	const left = useSecondsLeft(c.expiresAt);
	useEffect(() => {
		if (left === 0) onExpired();
	}, [left, onExpired]);

	return (
		<div className="animate-page">
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
				<h2 className="font-display text-xl font-bold">Review your contribution</h2>
				{left !== null && (
					<span
						className={cn(
							"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs tabular-nums",
							left < 60 ? "bg-warning-400/15 text-warning-200" : "bg-white/5 text-white/70",
						)}
					>
						<Clock className="size-3.5" aria-hidden /> Sign within {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
					</span>
				)}
			</div>
			<dl className="mt-5 divide-y divide-white/10 rounded-xl border border-white/10">
				<Row label="Project">{c.project.title}</Row>
				<Row label="Amount">
					<span className="font-display text-xl font-bold">
						{formatAmount(c.amount, 7)} {c.asset.code}
					</span>
				</Row>
				<Row label="Asset">
					{c.asset.code}
					{c.asset.issuer && (
						<AddressChip
							value={c.asset.issuer}
							head={5}
							tail={5}
							explorerBase={explorerUrl}
							className="mt-0.5 block text-xs text-white/60"
						/>
					)}
				</Row>
				<Row label="To (the builder’s wallet)">
					<AddressChip value={c.destination} head={8} tail={6} explorerBase={explorerUrl} className="text-sm" />
				</Row>
				<Row label="From (your wallet)">
					<AddressChip value={c.contributorAddress} head={8} tail={6} explorerBase={explorerUrl} className="text-sm" />
				</Row>
				<Row label="Network">Stellar {c.network === "testnet" ? "Testnet" : "Mainnet"}</Row>
				<Row label="Network fee">{formatAmount(c.fee, 7)} XLM, paid from your wallet</Row>
				<Row label="Memo">
					<span className="font-mono text-sm">{c.memo}</span>
				</Row>
			</dl>
			<ul className="mt-5 flex flex-col gap-2.5 text-sm leading-6 text-white/75">
				<li className="flex gap-2.5">
					<ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-300" aria-hidden /> The payment goes straight from your
					wallet to the builder. Chucksales never holds funds.
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
			{/* Phones: Back and Confirm side by side in a bar pinned to the bottom of the screen while the review scrolls.
			    From sm up: the original row inside the card. */}
			<div className="sticky bottom-0 z-10 -mx-5 mt-7 -mb-7 flex items-center gap-3 rounded-b-[24px] border-t border-white/10 bg-[#16161B] px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_24px_-12px_rgb(0_0_0/0.6)] sm:static sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
				<Button variant="ghost" className="h-12 w-auto shrink-0 px-4 sm:h-14 sm:w-40" onClick={onBack}>
					Back
				</Button>
				<Button size="lg" className="h-12 min-w-0 flex-1 gap-2 text-base sm:h-14" disabled={!agreed} onClick={onSign}>
					<Wallet className="size-4 shrink-0" /> <span className="truncate">Confirm and sign</span>
				</Button>
			</div>
		</div>
	);
}

/** Seconds until `iso`, ticking; null before mount. */
function useSecondsLeft(iso: string) {
	const [left, setLeft] = useState<number | null>(null);
	useEffect(() => {
		const tick = () => setLeft(Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000)));
		const first = setTimeout(tick, 0);
		const t = setInterval(tick, 1000);
		return () => {
			clearTimeout(first);
			clearInterval(t);
		};
	}, [iso]);
	return left;
}

export function AssetIcon({ asset, className }: { asset: Pick<StellarAsset, "code" | "native">; className?: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
				asset.native ? "bg-white text-black" : asset.code === "USDC" ? "bg-[#2775CA] text-white" : "bg-primary-500 text-white",
				className,
			)}
		>
			{asset.native ? "✦" : asset.code === "USDC" ? "$" : asset.code.slice(0, 1)}
		</span>
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
