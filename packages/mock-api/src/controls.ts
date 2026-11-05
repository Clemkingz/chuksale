/**
 * Demo controls for the mock backend, set from the web app's Demo panel (mock mode only) and read by the adapter
 * and handlers on every request. Stored in localStorage so they survive reloads; never used in live mode.
 */

export type WalletScenario = "success" | "rejected" | "not_installed" | "wrong_network" | "slow";

/** What a Demo-wallet contribution does after it's "sent" (mock mode): verified, rejected by the network, or slow. */
export type PaymentScenario = "confirmed" | "failed" | "delayed";

export interface MockControls {
	/** "normal" ≈ 0.2–0.5 s per request; "slow" ≈ 2.5–3.5 s, to see loading states. */
	latency: "normal" | "slow";
	/** While on, every API request fails with a 500, to see error states (queries retry, so one failure isn't enough). */
	outage: boolean;
	/** What the Demo wallet does when you connect it. */
	walletScenario: WalletScenario;
	/** How Demo-wallet contributions settle. */
	paymentScenario: PaymentScenario;
}

const KEY = "csp-mock-controls";
const DEFAULTS: MockControls = { latency: "normal", outage: false, walletScenario: "success", paymentScenario: "confirmed" };

export function getControls(): MockControls {
	try {
		const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
		return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<MockControls>) } : DEFAULTS;
	} catch {
		return DEFAULTS;
	}
}

export function setControls(change: Partial<MockControls>) {
	const next = { ...getControls(), ...change };
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
		window.dispatchEvent(new CustomEvent("csp-mock-controls", { detail: next }));
	} catch {
		// Private mode: controls just don't persist.
	}
	return next;
}
