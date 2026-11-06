"use client";

import { BadgeCheck, Link2, Unlink, Wallet } from "lucide-react";
import { walletTokenStore } from "@repo/api/tokens";
import type { Me } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { useLinkWallet, useUnlinkWallet } from "@/features/builder-auth/hooks";
import { useRequireWallet } from "@/features/wallet/hooks";
import { useWallet } from "@/features/wallet/store";

/**
 * The builder's verified wallet (`PUT /auth/me/wallet`). Linking proves control: the wallet signs the usual SEP-10
 * challenge (Connect wallet), and its live wallet token is sent with the builder's own token. Never a secret key.
 */
export function WalletLinkCard({ me }: { me: Me }) {
	const link = useLinkWallet();
	const unlink = useUnlinkWallet();
	const requireWallet = useRequireWallet();
	const connected = useWallet((s) => s.address);
	const linked = me.profile?.walletAddress ?? null;

	const linkConnected = () =>
		requireWallet(() => {
			const token = walletTokenStore.get()?.walletToken;
			if (!token) return notify.error("Connect your wallet again, then link it.");
			link.mutate(token, {
				onSuccess: () => notify.success("Wallet verified", "It now shows on your profile and project pages."),
				onError: (e) =>
					notify.error(
						errorStatus(e) === 409
							? "That wallet is linked to another builder"
							: errorStatus(e) === 401
								? "Your wallet session ended. Connect it again."
								: errorMessage(e),
					),
			});
		}, "Connect the wallet you want to show on your profile. You’ll sign a message to prove it’s yours; no funds move.");

	return (
		<div>
			<p className="flex items-center gap-2 text-base">
				<Wallet className="size-4 text-primary-300" aria-hidden /> Verified wallet{" "}
				<span className="text-white/45">(optional)</span>
			</p>
			<p className="mt-1 text-sm leading-6 text-white/55">
				Show supporters the Stellar wallet you control. It’s also offered as the payout wallet when you set up fundraising.
			</p>
			{linked ? (
				<div className="mt-4 flex flex-col gap-3 rounded-xl border border-success-400/25 bg-success-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<p className="flex items-center gap-1.5 text-sm text-success-100">
							<BadgeCheck className="size-4" aria-hidden /> Verified
						</p>
						<AddressChip value={linked} className="mt-1 text-white/90" />
					</div>
					<div className="flex shrink-0 flex-wrap gap-2">
						{connected && connected !== linked && (
							<Button
								variant="outline"
								className="h-10 w-auto gap-2 px-3.5"
								isLoading={link.isPending}
								loadingLabel="Linking"
								onClick={linkConnected}
							>
								<Link2 className="size-4" /> Use connected wallet
							</Button>
						)}
						<Button
							variant="ghost"
							className="h-10 w-auto gap-2 px-3 text-white/70"
							isLoading={unlink.isPending}
							loadingLabel="Unlinking"
							onClick={() =>
								unlink.mutate(undefined, {
									onSuccess: () => notify.info("Wallet unlinked", "Your projects’ payout wallets didn’t change."),
									onError: (e) => notify.fromError(e),
								})
							}
						>
							<Unlink className="size-4" /> Unlink
						</Button>
					</div>
				</div>
			) : (
				<Button
					className="mt-4 w-auto gap-2 px-5"
					isLoading={link.isPending}
					loadingLabel="Linking your wallet"
					onClick={linkConnected}
				>
					<Link2 className="size-4" /> {connected ? "Verify connected wallet" : "Connect and verify wallet"}
				</Button>
			)}
		</div>
	);
}
