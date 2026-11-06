"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { getControls, setControls, type MockControls, type WalletScenario } from "@repo/mock-api/controls";
import { Button } from "@repo/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { cn } from "@repo/ui/lib/utils";
import { accountTokens, builderApi, walletApi } from "@/lib/api/client";
import { resetDemoData } from "@/lib/api/source";
import { clearSavedQueryCache } from "@/lib/query-cache";
import { notify } from "@/lib/use-toast";
import { useWallet } from "@/features/wallet/store";

/**
 * Mock mode only (rendered by the root layout when USE_MOCK_API). Simulates what the backend and wallets would do,
 * so every state can be seen before the real API exists. Nothing here ships in live mode.
 */

const WALLET_OUTCOMES: { id: WalletScenario; label: string }[] = [
	{ id: "success", label: "Connects" },
	{ id: "rejected", label: "User declines" },
	{ id: "not_installed", label: "Not installed" },
	{ id: "wrong_network", label: "Wrong network" },
	{ id: "slow", label: "Slow (6 s)" },
];

export function DemoControls() {
	const qc = useQueryClient();
	const [controls, setLocal] = useState<MockControls>(() => getControls());
	const [pushing, setPushing] = useState(false);
	const update = (change: Partial<MockControls>) => setLocal(setControls(change));

	async function push() {
		setPushing(true);
		try {
			// To the builder inbox when signed in, and to the connected wallet's inbox.
			const signedIn = accountTokens.hasSession();
			const wallet = !!useWallet.getState().address;
			if (!signedIn && !wallet) return notify.info("Sign in as a builder or connect a wallet first");
			if (signedIn) await builderApi.post("/mock/notifications/push");
			if (wallet) await walletApi.post("/mock/wallet-notifications/push");
			await qc.invalidateQueries({ queryKey: ["notifications"] });
		} catch (e) {
			notify.fromError(e);
		} finally {
			setPushing(false);
		}
	}

	async function reset() {
		await resetDemoData();
		accountTokens.clear();
		useWallet.getState().clear();
		qc.clear();
		clearSavedQueryCache();
		notify.success("Demo data reset", "Signed out and wallet disconnected.");
		// Full reload: every store and query starts from the fresh seed.
		setTimeout(() => window.location.reload(), 600);
	}

	function previewToasts() {
		notify.success("Contribution confirmed", "50 XLM to Solar Schools Initiative · verified on Stellar");
		setTimeout(() => notify.error("Transaction failed", "Not enough XLM in this wallet. Nothing was sent."), 350);
		setTimeout(() => {
			const id = notify.loading("Waiting for your wallet…", "Approve the transaction in Freighter.");
			setTimeout(() => notify.dismiss(id), 3500);
		}, 700);
		setTimeout(() => notify.info("Suggestion submitted", "It’ll be public once a moderator approves it."), 1050);
	}

	return (
		<Popover>
			<PopoverTrigger
				className="fixed bottom-16 left-4 z-50 flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-primary-500/50 bg-[#131318]/95 px-4 text-sm text-primary-300 shadow-lg backdrop-blur hover:bg-[#1b1b22] max-sm:px-0"
				aria-label="Open demo controls"
			>
				<FlaskConical className="size-4" /> <span className="hidden sm:inline">Demo</span>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="start"
				className="w-[min(340px,calc(100vw-2rem))] border-white/10 bg-[#131318] p-4 text-white"
			>
				<p className="text-sm font-medium">Demo controls</p>
				<p className="mt-1 text-xs text-white/55">Mock mode: simulate wallets, the network and the backend.</p>

				<Section title="Demo wallet outcome">
					<Chips
						options={WALLET_OUTCOMES}
						value={controls.walletScenario}
						onChange={(walletScenario) => update({ walletScenario })}
					/>
				</Section>

				<Section title="Demo payment outcome">
					<Chips
						options={[
							{ id: "confirmed", label: "Confirms" },
							{ id: "failed", label: "Fails" },
							{ id: "delayed", label: "Slow (25 s)" },
						]}
						value={controls.paymentScenario}
						onChange={(paymentScenario) => update({ paymentScenario })}
					/>
				</Section>

				<Section title="Network speed">
					<Chips
						options={[
							{ id: "normal", label: "Normal" },
							{ id: "slow", label: "Slow (≈3 s)" },
						]}
						value={controls.latency}
						onChange={(latency) => update({ latency })}
					/>
				</Section>

				<div className="mt-4 grid grid-cols-2 gap-2">
					<Button
						size="sm"
						variant={controls.outage ? "destructive" : "outline"}
						aria-pressed={controls.outage}
						onClick={() => {
							update({ outage: !controls.outage });
							// Refetch now, so the screen shows the outage (or recovers) straight away.
							void qc.invalidateQueries();
						}}
					>
						{controls.outage ? "End outage" : "Simulate outage"}
					</Button>
					<Button size="sm" variant="outline" onClick={push} isLoading={pushing}>
						Push notification
					</Button>
					<Button size="sm" variant="outline" onClick={previewToasts}>
						Preview toasts
					</Button>
					<Button size="sm" variant="ghost" className="text-error-200" onClick={reset}>
						Reset demo data
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mt-4">
			<p className="mb-2 text-xs tracking-wide text-white/50 uppercase">{title}</p>
			{children}
		</div>
	);
}

function Chips<T extends string>({
	options,
	value,
	onChange,
}: {
	options: { id: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1.5" role="radiogroup">
			{options.map((o) => (
				<button
					key={o.id}
					type="button"
					role="radio"
					aria-checked={value === o.id}
					onClick={() => onChange(o.id)}
					className={cn(
						"rounded-md border px-2.5 py-1 text-xs transition-colors",
						value === o.id ? "border-primary-500 bg-primary-500/15 text-white" : "border-white/15 text-white/70 hover:text-white",
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}
