import { useSyncExternalStore } from "react";

/**
 * Phones and tablets have no browser extensions: a wallet there is an app, reached over WalletConnect
 * (a deep link into the app). iPadOS reports a desktop Mac user agent, so it's caught by touch support.
 */
export function isPhone() {
	return (
		typeof navigator !== "undefined" &&
		(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
			(/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
	);
}

/** Which app store a phone uses. */
export function phoneStore(): "ios" | "android" {
	return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) ? "android" : "ios";
}

/** Which extension store a desktop browser uses (Edge, Brave, Opera and Arc install from the Chrome Web Store). */
export function extensionStore(): "firefox" | "chrome" {
	return typeof navigator !== "undefined" && /Firefox\//.test(navigator.userAgent) ? "firefox" : "chrome";
}

/** The page is open in the Varial app's own browser, which injects `window.stellar` (it still says "freighter"). */
export function isInVarialApp() {
	const stellar =
		typeof window !== "undefined" ? (window as { stellar?: { provider?: string; platform?: string } }).stellar : undefined;
	return stellar?.provider === "freighter" && stellar.platform === "mobile";
}

const noop = () => () => {};

/** `isPhone()` for rendering: false on the server and first paint, then the real answer. */
export function useIsPhone() {
	return useSyncExternalStore(noop, isPhone, () => false);
}

/** `isInVarialApp()` for rendering. */
export function useIsInVarialApp() {
	return useSyncExternalStore(noop, isInVarialApp, () => false);
}
