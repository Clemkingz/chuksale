/** Circle's Testnet USDC, the asset the API's wallets trust. */
export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/** Small helpers shared by the seed and the handlers. */

/** Deterministic PRNG (mulberry32): the seed looks the same on every machine. */
export function random(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

let fallback = random(Date.now());

export function uuid(rand: () => number = fallback) {
	const hex = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function hex(length: number, rand: () => number = fallback) {
	return Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join("");
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** A Stellar-looking public key (G + 55 base32 chars). Display only: not a real account. */
export function stellarAddress(rand: () => number = fallback) {
	return "G" + Array.from({ length: 55 }, () => BASE32[Math.floor(rand() * 32)]).join("");
}

/** A Horizon-style operation id (a long decimal string). */
export function operationId(rand: () => number = fallback) {
	return String(1_000_000_000 + Math.floor(rand() * 8_999_999_999)) + String(Math.floor(rand() * 1e9)).padStart(9, "0");
}

export function resetFallbackRandom() {
	fallback = random(Date.now());
}

export const DAY = 86_400_000;

export const iso = (ms: number) => new Date(ms).toISOString();

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function paginate<T>(list: T[], page: number, limit: number) {
	const safeLimit = Math.max(1, limit || 10);
	const total = list.length;
	const total_pages = Math.max(1, Math.ceil(total / safeLimit));
	const current = Math.min(Math.max(1, page || 1), total_pages);
	return {
		items: list.slice((current - 1) * safeLimit, current * safeLimit),
		page: current,
		limit: safeLimit,
		total,
		total_pages,
	};
}
