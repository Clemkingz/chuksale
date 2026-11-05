"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { explorer, shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";

/**
 * A Stellar address or transaction hash: short form, copy button and explorer link (PRD §13: short address +
 * copy + explorer). The full value is in the title and copied whole.
 */
export function AddressChip({
	value,
	kind = "account",
	head = 6,
	tail = 5,
	className,
	explorerLink = true,
	explorerBase,
}: {
	value: string;
	kind?: "account" | "tx";
	head?: number;
	tail?: number;
	className?: string;
	explorerLink?: boolean;
	/** The network's explorer (`/stellar/network` explorerUrl); Testnet's by default. */
	explorerBase?: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<span className={cn("inline-flex max-w-full items-center gap-1 font-mono text-[0.92em]", className)}>
			<span className="truncate" title={value}>
				{shortKey(value, head, tail)}
			</span>
			<button
				type="button"
				aria-label={`Copy ${kind === "tx" ? "transaction hash" : "address"}`}
				onClick={async (e) => {
					e.stopPropagation();
					try {
						await navigator.clipboard.writeText(value);
						setCopied(true);
						notify.success(kind === "tx" ? "Transaction hash copied" : "Address copied");
						setTimeout(() => setCopied(false), 1500);
					} catch {
						notify.error("Couldn’t copy", "Select it and copy it manually.");
					}
				}}
				className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
			>
				{copied ? <Check className="animate-pop size-3.5 text-success-200" /> : <Copy className="size-3.5" />}
			</button>
			{explorerLink && (
				<a
					href={kind === "tx" ? explorer.tx(value, explorerBase) : explorer.account(value, explorerBase)}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => e.stopPropagation()}
					aria-label="View on Stellar Expert (opens in a new tab)"
					className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
				>
					<ExternalLink className="size-3.5" />
				</a>
			)}
		</span>
	);
}
