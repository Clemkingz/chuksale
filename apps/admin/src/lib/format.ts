import { formatAmount } from "@repo/domain/money";

/** "2 mins ago", "3 hours ago", "4 days ago", then a date (design "Time added"). */
export function timeAgo(iso: string, now = Date.now()) {
	const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
	const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
	if (s < 45) return "just now";
	const m = Math.round(s / 60);
	if (m < 60) return plural(m, "min");
	const h = Math.round(m / 60);
	if (h < 24) return plural(h, "hour");
	const d = Math.round(h / 24);
	if (d < 14) return plural(d, "day");
	return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "GBC4BO…ZFGIE"; full values stay available in a title / copy. */
export function shortKey(value: string, head = 6, tail = 5) {
	return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

/** "12,450 XLM"; compact ("12.4k") for stat tiles. */
export const money = (amount: string, code = "XLM") => `${formatAmount(amount)} ${code}`;
export function compact(amount: string | number) {
	const n = typeof amount === "string" ? Number(amount) : amount;
	return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export const fullDate = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export const EXPLORER = "https://stellar.expert/explorer/testnet";
