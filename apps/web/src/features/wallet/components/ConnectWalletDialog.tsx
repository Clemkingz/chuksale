"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsRight, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/dialog";
import BtnLoader from "@repo/ui/btn-loader";
import { cn } from "@repo/ui/lib/utils";
import { USE_MOCK_API } from "@/lib/api/source";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { DEMO_WALLET, DemoWalletError, connectAnyWallet, type AnyWalletId } from "@/features/wallet/connect";
import { useIsPhone } from "@/features/wallet/device";
import { useWalletDialog } from "@/features/wallet/dialog-store";
import { WALLETS, cancelWalletPairing, installLink, openWalletApp, walletKind, type WalletId } from "@/features/wallet/kit";

/**
 * Connect Wallet (design: centred card, wallet list, "More wallet options", "or", "Continue with email").
 * Tailored to the PRD: Stellar wallets only (no MetaMask/Trust), Testnet, no contributor account. The email field is
 * the builder entry point (builders have accounts; contributors don't), so it goes to builder sign-in.
 *
 * States: idle → connecting (row spinner, other rows locked) → connected (tick, toast, dialog closes and the
 * pending action resumes) | declined | not installed (install link) | phone app didn't open (open again / install)
 * | wrong network | other error.
 */

type Row = { id: AnyWalletId; name: string; kind: string; icon: string };

const ICONS: Record<AnyWalletId, string> = {
	demo: "/apple-icon.png",
	freighter: "/images/wallets/freighter.png",
	lobstr: "/images/wallets/lobstr.png",
	xbull: "/images/wallets/xbull.png",
	albedo: "/images/wallets/albedo.png",
};

type Problem =
	| { kind: "declined"; message: string }
	| { kind: "not_installed"; message: string; walletId: WalletId | "demo" }
	| { kind: "app_missed"; walletId: WalletId }
	| { kind: "error"; message: string };

export function ConnectWalletDialog() {
	const { open, reason, close, resolve } = useWalletDialog();
	return (
		<Dialog open={open} onOpenChange={(next) => !next && close()}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[92dvh] w-full gap-0 overflow-y-auto rounded-2xl border border-white/5 bg-[#131318] p-6 text-white sm:max-w-[460px] sm:p-9"
			>
				{/* Remount per open so every visit starts clean. */}
				{open && <ConnectWalletBody reason={reason} onClose={close} onConnected={resolve} />}
			</DialogContent>
		</Dialog>
	);
}

function ConnectWalletBody({
	reason,
	onClose,
	onConnected,
}: {
	reason: string | null;
	onClose: () => void;
	onConnected: (address: string) => void;
}) {
	const router = useRouter();
	const phone = useIsPhone();
	const [busy, setBusy] = useState<AnyWalletId | null>(null);
	const [done, setDone] = useState<AnyWalletId | null>(null);
	const [problem, setProblem] = useState<Problem | null>(null);
	const [showMore, setShowMore] = useState(false);
	const [email, setEmail] = useState("");
	const [lastTried, setLastTried] = useState<AnyWalletId | null>(null);

	const rows: Row[] = [
		...(USE_MOCK_API ? [{ ...DEMO_WALLET, icon: ICONS.demo }] : []),
		...WALLETS.map((w) => ({ id: w.id, name: w.name, kind: walletKind(w.id, phone), icon: ICONS[w.id] })),
	];
	const visible = showMore ? rows : rows.slice(0, 3);

	async function connect(id: AnyWalletId) {
		setProblem(null);
		setBusy(id);
		setLastTried(id);
		try {
			const address = await connectAnyWallet(id, {
				onAppMissed: () => id !== "demo" && setProblem({ kind: "app_missed", walletId: id }),
			});
			setDone(id);
			notify.success("Wallet connected", `${shortKey(address)} · Stellar Testnet`);
			// Let the tick land before the dialog closes.
			setTimeout(() => onConnected(address), 650);
		} catch (error) {
			setProblem(toProblem(error, id));
			setBusy(null);
		}
	}

	function cancel() {
		cancelWalletPairing();
		setBusy(null);
		setProblem(null);
	}

	function continueWithEmail(event: React.FormEvent) {
		event.preventDefault();
		onClose();
		router.push(email ? `${routes.signIn}?email=${encodeURIComponent(email)}` : routes.signIn);
	}

	return (
		<div className="flex flex-col">
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full border-2 border-white/70 text-white/80 transition-colors hover:border-white hover:text-white sm:top-5 sm:right-5"
			>
				<X className="size-4" strokeWidth={2.5} />
			</button>

			<DialogTitle className="text-center font-display text-[26px] font-bold text-primary-500 sm:text-[30px]">
				Connect Wallet
			</DialogTitle>
			<DialogDescription className="mt-2 text-center text-[15px] leading-6 text-white/85">
				{reason ?? "Keep your secret key and recovery phrase safe. We’ll never ask for them, so never share them with anyone!"}
			</DialogDescription>

			{problem && <ProblemBanner problem={problem} phone={phone} onRetry={() => lastTried && connect(lastTried)} />}

			<ul className="mt-6 overflow-hidden rounded-xl bg-[#363636] sm:mt-7" aria-label="Wallets">
				{visible.map((row, i) => {
					const isBusy = busy === row.id;
					const isDone = done === row.id;
					return (
						<li
							key={row.id}
							className={cn(i > 0 && "border-t border-white/15", "animate-rise")}
							style={{ "--i": i } as React.CSSProperties}
						>
							<button
								type="button"
								onClick={() => connect(row.id)}
								disabled={!!busy || !!done}
								aria-busy={isBusy || undefined}
								className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
							>
								<span
									className={cn(
										"flex size-[42px] shrink-0 overflow-hidden rounded-lg bg-white text-primary-500",
										isBusy && "animate-signal",
									)}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={withBasePath(row.icon)} alt="" width={42} height={42} className="size-full object-cover" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-[17px] text-white">{row.name}</span>
									<span className="block truncate text-xs text-white/55">
										{isBusy ? "Approve the request in your wallet…" : row.kind}
									</span>
								</span>
								{isBusy && <BtnLoader className="size-5 text-primary-400" label={`Connecting ${row.name}`} />}
								{isDone && (
									<span className="animate-pop flex size-6 items-center justify-center rounded-full bg-success-300 text-white">
										<Check className="size-4" strokeWidth={3} aria-label="Connected" />
									</span>
								)}
							</button>
						</li>
					);
				})}
			</ul>

			{busy && !done ? (
				<button
					type="button"
					onClick={cancel}
					className="mx-auto mt-5 text-[15px] text-white/80 underline-offset-4 hover:text-white hover:underline"
				>
					Cancel
				</button>
			) : (
				rows.length > 3 && (
					<button
						type="button"
						onClick={() => setShowMore((v) => !v)}
						aria-expanded={showMore}
						className="mx-auto mt-6 text-[16px] text-white transition-colors hover:text-primary-400"
					>
						{showMore ? "Fewer wallet options" : "More wallet options"}
					</button>
				)
			)}

			<div className="mt-5 flex items-center gap-4 text-[15px] text-white/90" aria-hidden>
				<span className="h-px flex-1 bg-white/40" />
				or
				<span className="h-px flex-1 bg-white/40" />
			</div>

			<form onSubmit={continueWithEmail} className="mt-4">
				<label htmlFor="wallet-dialog-email" className="sr-only">
					Builder email address
				</label>
				<div className="flex items-center rounded-lg border border-primary-500 bg-transparent py-1.5 pr-1.5 pl-4 focus-within:ring-2 focus-within:ring-primary-500/40">
					<input
						id="wallet-dialog-email"
						type="email"
						inputMode="email"
						autoComplete="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Continue with email"
						className="h-9 min-w-0 flex-1 bg-transparent text-[16px] text-white placeholder:text-white focus:outline-none"
					/>
					<button
						type="submit"
						aria-label="Continue with email"
						className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-500 text-white transition-colors hover:bg-primary-600"
					>
						<ChevronsRight className="size-5" />
					</button>
				</div>
				<p className="mt-2 text-center text-xs text-white/50">
					For builders submitting a project. Contributing only needs a wallet.
				</p>
			</form>
		</div>
	);
}

function toProblem(error: unknown, id: AnyWalletId): Problem {
	const message = error instanceof Error ? error.message : ((error as { message?: string })?.message ?? "");
	if (error instanceof DemoWalletError) {
		if (error.kind === "not_installed") return { kind: "not_installed", message, walletId: "demo" };
		if (error.kind === "rejected") return { kind: "declined", message: "You declined the request. You can try again any time." };
		return { kind: "error", message };
	}
	if (error && typeof error === "object" && "walletId" in error)
		return { kind: "not_installed", message, walletId: id as WalletId };
	if (/declin|reject|cancel|denied|closed/i.test(message))
		return { kind: "declined", message: "You declined the request. You can try again any time." };
	return { kind: "error", message: message || "The wallet didn’t complete the request. Please try again." };
}

function ProblemBanner({ problem, phone, onRetry }: { problem: Problem; phone: boolean; onRetry: () => void }) {
	const tone =
		problem.kind === "declined"
			? "border-white/15 bg-white/5 text-white/85"
			: "border-warning-500/30 bg-warning-500/10 text-warning-200";
	let body: React.ReactNode;
	if (problem.kind === "not_installed") {
		const link = problem.walletId === "demo" ? null : installLink(problem.walletId, phone);
		body = (
			<>
				<p>{problem.message}</p>
				{link && (
					<a
						href={link.href}
						target="_blank"
						rel="noreferrer"
						className="mt-1 inline-flex items-center gap-1 font-medium text-primary-300 underline-offset-4 hover:underline"
					>
						Get it from the {link.store} <ExternalLink className="size-3.5" />
					</a>
				)}
			</>
		);
	} else if (problem.kind === "app_missed") {
		const link = installLink(problem.walletId, true);
		body = (
			<>
				<p>The wallet app didn’t open. Is it installed?</p>
				<div className="mt-1 flex flex-wrap gap-x-4">
					<button
						type="button"
						onClick={() => openWalletApp(problem.walletId)}
						className="font-medium text-primary-300 underline-offset-4 hover:underline"
					>
						Open again
					</button>
					{link && (
						<a
							href={link.href}
							target="_blank"
							rel="noreferrer"
							className="font-medium text-primary-300 underline-offset-4 hover:underline"
						>
							Get it from the {link.store}
						</a>
					)}
				</div>
			</>
		);
	} else {
		body = (
			<p>
				{problem.message}{" "}
				{problem.kind === "error" && (
					<button type="button" onClick={onRetry} className="font-medium text-primary-300 underline-offset-4 hover:underline">
						Try again
					</button>
				)}
			</p>
		);
	}
	return (
		<div role="alert" className={cn("animate-pop mt-5 rounded-lg border px-4 py-3 text-sm leading-6", tone)}>
			{body}
		</div>
	);
}
