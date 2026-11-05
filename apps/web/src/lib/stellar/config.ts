import type { AcceptedAsset } from "@repo/domain/types";

/**
 * Stellar network constants. Testnet only until the mainnet release gate (PRD §8, §18 rule 15).
 */
export const STELLAR_NETWORK = "testnet" as const;

/** Testnet's network passphrase: what a wallet signs for. */
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/** Horizon on Testnet: where contributions are built, submitted, and (in mock mode) verified. */
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";

/**
 * The asset allowlist (PRD §8.4, decision D2 in docs/DECISIONS.md). Issuer is always shown next to the code
 * to prevent lookalike-asset confusion.
 */
export const ASSETS = {
	XLM: { id: "xlm", code: "XLM", issuer: null, label: "XLM (Testnet)" },
	USDC: {
		id: "usdc",
		code: "USDC",
		issuer: process.env.NEXT_PUBLIC_USDC_ISSUER || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
		label: "USDC (Testnet)",
	},
} as const satisfies Record<string, AcceptedAsset>;

export const ACCEPTED_ASSETS: AcceptedAsset[] = Object.values(ASSETS);

const EXPLORER = "https://stellar.expert/explorer/testnet";

export const explorer = {
	tx: (hash: string) => `${EXPLORER}/tx/${hash}`,
	account: (address: string) => `${EXPLORER}/account/${address}`,
};

/** "GBC4BO…ZFGIE" for tight spaces; full values stay copyable (PRD §13). */
export function shortKey(value: string, head = 6, tail = 5) {
	return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}
