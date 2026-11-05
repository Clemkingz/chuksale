import type { Amount } from "./types";

/**
 * Exact money math (PRD §9: no floating point). Amounts are decimal strings; arithmetic happens in stroops
 * (1 unit = 10^7 stroops, Stellar's base unit) as BigInt.
 */

export const DECIMALS = 7;
const SCALE = 10n ** BigInt(DECIMALS);
const AMOUNT_RE = /^\d+(\.\d{1,7})?$/;

/** Is this a valid positive Stellar amount string with at most 7 decimals? */
export function isValidAmount(value: string) {
	return AMOUNT_RE.test(value.trim()) && toStroops(value) > 0n;
}

export function toStroops(value: Amount): bigint {
	const v = value.trim();
	if (!/^\d+(\.\d+)?$/.test(v)) throw new Error(`Not an amount: "${value}"`);
	const [whole, frac = ""] = v.split(".");
	if (frac.length > DECIMALS) throw new Error(`More than ${DECIMALS} decimal places: "${value}"`);
	return BigInt(whole!) * SCALE + BigInt(frac.padEnd(DECIMALS, "0"));
}

export function fromStroops(stroops: bigint): Amount {
	const negative = stroops < 0n;
	const abs = negative ? -stroops : stroops;
	const whole = abs / SCALE;
	const frac = (abs % SCALE).toString().padStart(DECIMALS, "0");
	return `${negative ? "-" : ""}${whole}.${frac}`;
}

export function sum(values: Amount[]): Amount {
	return fromStroops(values.reduce((acc, v) => acc + toStroops(v), 0n));
}

/** a − b, floored at zero (balances never show negative). */
export function subtract(a: Amount, b: Amount): Amount {
	const d = toStroops(a) - toStroops(b);
	return fromStroops(d < 0n ? 0n : d);
}

export function compare(a: Amount, b: Amount): -1 | 0 | 1 {
	const x = toStroops(a);
	const y = toStroops(b);
	return x < y ? -1 : x > y ? 1 : 0;
}

/** Progress toward a target as a whole percent, capped at 100 for the bar (the number itself may exceed it). */
export function progressPercent(raised: Amount, target: Amount | null) {
	if (!target) return null;
	const t = toStroops(target);
	if (t === 0n) return null;
	return Number((toStroops(raised) * 100n) / t);
}

/** Display: "1,250.5" (trims trailing zeros, keeps up to `maxDecimals`). Display only, never for math. */
export function formatAmount(value: Amount, maxDecimals = 2) {
	const [whole, frac = ""] = fromStroops(toStroops(value)).split(".");
	const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, "");
	const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return trimmed ? `${grouped}.${trimmed}` : grouped;
}
