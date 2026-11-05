"use client";

import Link from "next/link";
import { Copy, ExternalLink, LogOut, Wallet as WalletIcon } from "lucide-react";
import { Button } from "@repo/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { explorer, shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { DEMO_WALLET, disconnectAnyWallet } from "@/features/wallet/connect";
import { useWalletDialog } from "@/features/wallet/dialog-store";
import { useConnectedWallet } from "@/features/wallet/hooks";
import { walletName } from "@/features/wallet/kit";

/**
 * Header wallet control (design: "Connect wallet" button). Connected: the short address with a Testnet dot, and a
 * menu to copy it, open it on Stellar Expert, or disconnect (PRD §6.5 step 8, §13 short address + copy + explorer).
 */
export function WalletButton({ className, block }: { className?: string; block?: boolean }) {
	const { ready, address, walletId } = useConnectedWallet();
	const show = useWalletDialog((s) => s.show);

	if (!ready)
		return <span className={cn("skeleton-shimmer h-11 w-[132px] rounded-lg", block && "w-full", className)} aria-hidden />;

	if (!address)
		return (
			<Button size="md" className={cn(block ? "w-full" : "min-w-[132px]", className)} onClick={() => show()}>
				Connect wallet
			</Button>
		);

	const name = walletId === "demo" ? DEMO_WALLET.name : walletName(walletId);

	async function copy() {
		try {
			await navigator.clipboard.writeText(address!);
			notify.success("Address copied");
		} catch {
			notify.error("Couldn’t copy. Select the address and copy it manually.");
		}
	}

	async function disconnect() {
		await disconnectAnyWallet();
		notify.info("Wallet disconnected");
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"animate-pop inline-flex h-11 items-center gap-2.5 rounded-lg border border-primary-500/60 bg-primary-500/10 px-3 text-sm text-white transition-colors hover:bg-primary-500/20 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none",
						block && "w-full justify-center",
						className,
					)}
					aria-label={`Wallet ${address}. Open wallet menu`}
				>
					<span className="relative flex size-2.5">
						<span className="absolute inset-0 rounded-full bg-success-200" />
					</span>
					<span className="font-medium tabular-nums">{shortKey(address, 4, 4)}</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64 border-white/10 bg-[#131318] text-white">
				<DropdownMenuLabel className="flex items-center gap-3 py-2">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={withBasePath(walletId === "demo" ? "/apple-icon.png" : `/images/wallets/${walletId}.png`)}
						alt=""
						width={32}
						height={32}
						className="size-8 rounded-md bg-white"
					/>
					<span className="min-w-0">
						<span className="block text-sm font-medium">{name}</span>
						<span className="block text-xs font-normal text-white/55">Stellar Testnet · {shortKey(address)}</span>
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="bg-white/10" />
				<DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
					<Link href={routes.wallet}>
						<WalletIcon className="size-4" /> My wallet &amp; contributions
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={copy} className="cursor-pointer focus:bg-white/10 focus:text-white">
					<Copy className="size-4" /> Copy address
				</DropdownMenuItem>
				<DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
					<a href={explorer.account(address)} target="_blank" rel="noreferrer">
						<ExternalLink className="size-4" /> View on Stellar Expert
					</a>
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-white/10" />
				<DropdownMenuItem
					onSelect={disconnect}
					className="cursor-pointer text-error-200 focus:bg-error-400/15 focus:text-error-100"
				>
					<LogOut className="size-4" /> Disconnect
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
