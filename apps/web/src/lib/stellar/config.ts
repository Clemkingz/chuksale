/**
 * Stellar constants and display helpers. The network, its assets and the explorer come from the API at runtime
 * (`GET /stellar/network`, see `network.ts`); these are only the Testnet defaults used before it has loaded.
 */
export const STELLAR_NETWORK = "testnet" as const;

/** Testnet's network passphrase (default until /stellar/network answers). */
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const EXPLORER = "https://stellar.expert/explorer/testnet";

/** Explorer links; pass the network's `explorerUrl` when you have it. */
export const explorer = {
	tx: (hash: string, base = EXPLORER) => `${base}/tx/${hash}`,
	account: (address: string, base = EXPLORER) => `${base}/account/${address}`,
};

/** "GBC4BO…ZFGIE" for tight spaces; full values stay copyable (PRD §13). */
export function shortKey(value: string, head = 6, tail = 5) {
	return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

/** A Stellar public key (G…, 56 chars). Secret keys (S…) and muxed (M…) addresses are refused. */
export const isPublicKey = (v: string) => /^G[A-Z2-7]{55}$/.test(v.trim());
