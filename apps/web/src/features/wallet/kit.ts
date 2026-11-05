"use client";

import type { StellarWalletsKit as Kit } from "@creit.tech/stellar-wallets-kit/sdk";
import type { ModuleInterface } from "@creit.tech/stellar-wallets-kit/types";
import { NETWORK_PASSPHRASE } from "@/lib/stellar/config";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { extensionStore, isInVarialApp, isPhone, phoneStore } from "@/features/wallet/device";
import { useWallet } from "@/features/wallet/store";

/**
 * The contributor's own Stellar wallet, through Stellar Wallets Kit (adapted from stellance-v3
 * `features/payer-wallet`): Varial (formerly Freighter: its browser extension, or its phone app over
 * WalletConnect on phones), Albedo's web wallet, xBull, and LOBSTR over WalletConnect. Loaded on first use.
 * The platform never sees a contributor's keys (PRD §12): the wallet signs; the backend (mock for now)
 * verifies the transaction before it counts. Wallet connection is NOT account auth (PRD §18 rule 6).
 */

/**
 * The wallets the payment page offers, in order. Varial keeps the id "freighter": it's the kit's module id,
 * Varial's SDK and WalletConnect listing are unchanged, and stored connections keep working.
 */
export const WALLETS = [
	{ id: "freighter", name: "Varial", kind: "Browser extension" },
	{ id: "lobstr", name: "LOBSTR", kind: "Mobile wallet" },
	{ id: "xbull", name: "xBull", kind: "Browser extension or app" },
	{ id: "albedo", name: "Albedo", kind: "Web wallet, no install" },
] as const;

export type WalletId = (typeof WALLETS)[number]["id"];

/** What the wallet row says: on a phone, Varial and LOBSTR are their apps (over WalletConnect). */
export function walletKind(id: WalletId, phone: boolean) {
	if (phone && hasApp(id)) return `${walletName(id)} app`;
	return WALLETS.find((w) => w.id === id)?.kind ?? "";
}

export function walletName(id: string | null) {
	return WALLETS.find((w) => w.id === id)?.name ?? "your wallet";
}

type Store = "chrome" | "firefox" | "ios" | "android";

const STORE_NAMES: Record<Store, string> = {
	chrome: "Chrome Web Store",
	firefox: "Firefox Add-ons",
	ios: "App Store",
	android: "Google Play",
};

/** Where each wallet is installed from: Varial's docs (extension) and the wallets' WalletConnect listings (apps). */
const INSTALL_LINKS: Partial<Record<WalletId, Partial<Record<Store, string>>>> = {
	freighter: {
		chrome: "https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk",
		firefox: "https://addons.mozilla.org/en-US/firefox/addon/freighter/",
		ios: "https://apps.apple.com/us/app/freighter/id6743947720",
		android: "https://play.google.com/store/apps/details?id=org.stellar.freighterwallet",
	},
	lobstr: {
		ios: "https://apps.apple.com/us/app/lobstr-stellar-wallet/id1404357892",
		android: "https://play.google.com/store/apps/details?id=com.lobstr.client",
	},
};

/** Where to get this wallet on this device: the phone's app store, or the browser's extension store. */
export function installLink(id: WalletId, phone: boolean) {
	const store = phone ? phoneStore() : extensionStore();
	const href = INSTALL_LINKS[id]?.[store];
	return href ? { href, store: STORE_NAMES[store] } : null;
}

/** The apps' WalletConnect links (their listings' `mobile_link`; AppKit appends `wc?uri=…`). Alone, it just opens the app. */
const APP_LINKS: Partial<Record<WalletId, string>> = {
	freighter: "freighterwallet://wc-redirect/",
	lobstr: "lobstr://",
};

/** Whether the wallet is a phone app the page can open. */
export function hasApp(id: WalletId) {
	return id in APP_LINKS;
}

/**
 * WalletConnect (Reown) project id: lets phone wallets pair with the page (a deep link on a phone, a QR code
 * on a laptop). Not a secret: it ships in the bundle, and the project's domain allowlist protects it, so
 * every deployed domain must be listed there. TODO: create our own Reown project id. NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID overrides it.
 */
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "b8cc56756132b11f2077932ac3d6f807";
const WALLETCONNECT_ID = "wallet_connect";

/** How long a browser-extension wallet gets to answer "are you there?". */
const EXTENSION_CHECK_MS = 3000;

/** How long a phone gets to switch to the wallet app before the page offers to install it. */
const APP_OPEN_MS = 2500;

/** WalletConnect explorer ids of the Stellar wallets that pair over WalletConnect. */
const STELLAR_WALLETCONNECT_IDS = [
	"997a355c8f682468706a76cff1b004a7115f505fb962dac54b6e9b442dd1c380", // Varial (listed as Freighter)
	"76a3d548a08cf402f5c7d021f24fd2881d767084b387a5325df88bc3d4b6f21b", // LOBSTR
];

/** Varial on a phone is the Varial app, paired over WalletConnect; LOBSTR always pairs that way. */
function moduleFor(walletId: string) {
	if (walletId === "freighter" && isPhone()) return WALLETCONNECT_ID;
	if (walletId === "lobstr") return WALLETCONNECT_ID;
	return walletId;
}

/** A phone opens the chosen app itself; in Varial's own browser the kit pairs in place. */
function opensAppDirectly(moduleId: string) {
	return moduleId === WALLETCONNECT_ID && isPhone() && !isInVarialApp();
}

/** The desktop wallet that needs its browser extension (xBull falls back to its web wallet without one). */
export function needsExtension(id: WalletId, phone: boolean) {
	return id === "freighter" && !phone;
}

/** Thrown when the chosen wallet's extension isn't in this browser; the page offers the install link. */
export class WalletNotInstalledError extends Error {
	constructor(readonly walletId: WalletId) {
		super(`${walletName(walletId)} isn’t installed in this browser.`);
	}
}

/** AppKit's modal (WalletConnect): to notice when the person closes it, and to route its pairing link. */
type AppKitLike = {
	open: (options?: { uri?: string }) => unknown;
	subscribeState?: (callback: (state: { open: boolean }) => void) => () => void;
};

let kitPromise: Promise<typeof Kit> | null = null;
let kitModules: ModuleInterface[] = [];

/** Set while a phone pairs with one chosen app: WalletConnect's link goes straight to that app, not AppKit's list. */
let pairWith: ((uri: string) => void) | null = null;

/** Sends the kit's "show the pairing link" to `pairWith` when one is set. */
function routePairing(module: unknown) {
	const modal = (module as { modal?: AppKitLike }).modal;
	if (!modal) return;
	const open = modal.open.bind(modal);
	modal.open = (options) => {
		if (options?.uri && pairWith) return pairWith(options.uri);
		return open(options);
	};
}

/** Loaded on first use: it's large and touches the DOM, so it never runs on the server. */
function loadKit(): Promise<typeof Kit> {
	kitPromise ??= (async () => {
		const [{ StellarWalletsKit }, { defaultModules }, { Networks }, { WalletConnectModule, WalletConnectTargetChain }] =
			await Promise.all([
				import("@creit.tech/stellar-wallets-kit/sdk"),
				import("@creit.tech/stellar-wallets-kit/modules/utils"),
				import("@creit.tech/stellar-wallets-kit/types"),
				import("@creit.tech/stellar-wallets-kit/modules/wallet-connect"),
			]);
		const origin = window.location.origin;
		const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
		const walletConnect = new WalletConnectModule({
			projectId: WALLETCONNECT_PROJECT_ID,
			metadata: {
				name: SITE_NAME,
				description: SITE_TAGLINE,
				url: origin,
				icons: [`${origin}${base}/apple-icon.png`],
			},
			allowedChains: [WalletConnectTargetChain.TESTNET],
			// Only Stellar wallets. TODO(Phase 1): match the design tokens.
			appKitOptions: {
				includeWalletIds: STELLAR_WALLETCONNECT_IDS,
				featuredWalletIds: STELLAR_WALLETCONNECT_IDS,
				themeMode: "light",
				themeVariables: {
					"--w3m-accent": "#000C3B",
					"--w3m-font-family": "Satoshi, system-ui, sans-serif",
					"--w3m-border-radius-master": "4px",
				},
			} as never,
		});
		routePairing(walletConnect);
		kitModules = [...defaultModules(), walletConnect];
		// Preselect the stored wallet: after a reload, signing needs a module before any connect.
		const stored = useWallet.getState().walletId;
		StellarWalletsKit.init({
			modules: kitModules,
			network: Networks.TESTNET,
			selectedWalletId: stored && stored !== "demo" ? moduleFor(stored) : undefined,
		});
		return StellarWalletsKit;
	})();
	return kitPromise;
}

/** Starts loading the kit (and WalletConnect's relay connection) ahead of the first tap. */
export function preloadWallets() {
	void loadKit().catch(() => undefined);
}

/** Whether this browser has the wallet's extension. Without one, Varial's own check never answers: 3 s, then no. */
export async function isExtensionInstalled(walletId: WalletId) {
	await loadKit();
	const extension = kitModules.find((m) => m.productId === walletId);
	if (!extension) return false;
	return Promise.race([
		extension.isAvailable().catch(() => false),
		new Promise<boolean>((resolve) => setTimeout(() => resolve(false), EXTENSION_CHECK_MS)),
	]);
}

/** WalletConnect's client reaches its relay a moment after the kit loads; wait for it (up to 15 s) before asking. */
async function walletConnectReady(kit: typeof Kit) {
	const deadline = Date.now() + 15_000;
	while (!(await kit.selectedModule.isAvailable().catch(() => false))) {
		if (Date.now() > deadline)
			throw new Error("Phone wallets couldn’t be reached (WalletConnect didn’t start). Check your connection and try again.");
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
}

/** The kit waits forever if the WalletConnect modal is closed; a close with no approval right after rejects as a dismissal. */
async function fetchViaWalletConnect(kit: typeof Kit) {
	const modal = (kit.selectedModule as unknown as { modal?: AppKitLike }).modal;
	let unsubscribe = () => {};
	const closed = new Promise<never>((_, reject) => {
		let wasOpen = false;
		unsubscribe =
			modal?.subscribeState?.((state) => {
				if (state.open) wasOpen = true;
				else if (wasOpen) setTimeout(() => reject({ code: -1, message: "The wallet modal was closed." }), 1500);
			}) ?? (() => {});
	});
	try {
		return await Promise.race([kit.fetchAddress(), closed]);
	} finally {
		unsubscribe();
	}
}

/**
 * Opens the wallet's app (with a WalletConnect pairing link, or just the app). A web page can't ask whether an
 * app is installed, so if the page is still in front 2.5 s later, `onMissed` runs: the app isn't installed, or
 * the browser held the link back. Returns false when the wallet has no app link.
 */
export function openWalletApp(
	walletId: WalletId,
	onMissed?: () => void,
	uri = lastPairing?.walletId === walletId ? lastPairing.uri : undefined,
) {
	const base = APP_LINKS[walletId];
	if (!base) return false;
	let left = false;
	const onHide = () => {
		if (document.visibilityState === "hidden") left = true;
	};
	const onPageHide = () => {
		left = true;
	};
	document.addEventListener("visibilitychange", onHide);
	window.addEventListener("pagehide", onPageHide);
	window.location.href = uri ? `${base}wc?uri=${encodeURIComponent(uri)}` : base;
	setTimeout(() => {
		document.removeEventListener("visibilitychange", onHide);
		window.removeEventListener("pagehide", onPageHide);
		if (!left && document.visibilityState === "visible") onMissed?.();
	}, APP_OPEN_MS);
	return true;
}

/** The pairing link of the current phone connection, so "Open again" reuses it. */
let lastPairing: { walletId: WalletId; uri: string } | null = null;
let cancelPairing: (() => void) | null = null;

/** Stops waiting for a phone app to approve the connection (the page's Cancel). */
export function cancelWalletPairing() {
	cancelPairing?.();
}

/** On a phone, pairs straight with the chosen app instead of showing AppKit's wallet list. */
async function pairOnPhone(kit: typeof Kit, walletId: WalletId, onAppMissed?: () => void) {
	pairWith = (uri) => {
		// The kit shows the same link twice (once per event); open the app once.
		if (lastPairing?.uri === uri) return;
		lastPairing = { walletId, uri };
		openWalletApp(walletId, onAppMissed, uri);
	};
	const cancelled = new Promise<never>((_, reject) => {
		cancelPairing = () => reject({ code: -1, message: "Cancelled by user." });
	});
	try {
		return await Promise.race([kit.fetchAddress(), cancelled]);
	} finally {
		pairWith = null;
		cancelPairing = null;
		lastPairing = null;
	}
}

/**
 * Connects one wallet and remembers it; resolves with the contributor's public address. On a phone, `onAppMissed`
 * runs if the wallet's app didn't open (the connection keeps waiting, so "Open again" can still finish it).
 */
export async function connectWallet(walletId: WalletId, { onAppMissed }: { onAppMissed?: () => void } = {}) {
	const kit = await loadKit();
	const moduleId = moduleFor(walletId);
	kit.setWallet(moduleId);
	if (needsExtension(walletId, isPhone()) && !(await isExtensionInstalled(walletId))) throw new WalletNotInstalledError(walletId);
	let address: string;
	if (moduleId === WALLETCONNECT_ID) {
		await walletConnectReady(kit);
		({ address } = opensAppDirectly(moduleId) ? await pairOnPhone(kit, walletId, onAppMissed) : await fetchViaWalletConnect(kit));
	} else {
		({ address } = await kit.fetchAddress());
	}
	// Varial's extension follows the person's own network setting; the others are pinned to Testnet by the kit.
	if (moduleId === "freighter") {
		const { networkPassphrase } = await kit.getNetwork();
		if (networkPassphrase !== NETWORK_PASSPHRASE)
			throw new Error("Switch Varial to Testnet (Settings → Network), then try again.");
	}
	useWallet.getState().setConnected(address, walletId);
	return address;
}

/** The kit's selected module id; reading `selectedModule` throws when none is set yet. */
function selectedModuleId(kit: typeof Kit) {
	try {
		return kit.selectedModule?.productId;
	} catch {
		return undefined;
	}
}

/** Has the contributor's wallet sign a transaction (base64 XDR); resolves with the signed XDR. On a phone, its app opens. */
export async function signWithWallet(walletId: WalletId, xdr: string, address: string) {
	const kit = await loadKit();
	const moduleId = moduleFor(walletId);
	if (selectedModuleId(kit) !== moduleId) kit.setWallet(moduleId);
	if (moduleId === WALLETCONNECT_ID) await walletConnectReady(kit);
	const request = kit.signTransaction(xdr, { address, networkPassphrase: NETWORK_PASSPHRASE });
	// Give the request a moment to reach the relay, then bring the app up to approve it.
	if (opensAppDirectly(moduleId)) setTimeout(() => openWalletApp(walletId), 400);
	const { signedTxXdr } = await request;
	return signedTxXdr;
}

export async function disconnectWallet() {
	useWallet.getState().clear();
	if (!kitPromise) return;
	const kit = await kitPromise;
	await kit.disconnect().catch(() => undefined);
}

/** Wallets reject with `{ code, message }` objects, not Errors. */
export function walletErrorMessage(error: unknown, fallback = "The wallet didn’t complete the request.") {
	let message = "";
	if (error instanceof Error) message = error.message;
	else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") message = error.message;
	// A bad WalletConnect project id surfaces as a relay socket error; an unlisted domain as an origin error.
	if (/project not found|unauthorized: invalid key/i.test(message)) {
		return "Phone wallets aren’t available right now (WalletConnect isn’t set up). Try Albedo or a browser extension.";
	}
	if (/origin not allowed|not allowed origin|unauthorized origin/i.test(message)) {
		return "This site isn’t on the WalletConnect project’s allowed domains yet. Try Albedo or a browser extension.";
	}
	return message || fallback;
}

/** Closing the picker or declining a prompt is a choice, not a failure. */
export function isWalletDismissal(error: unknown) {
	const message = walletErrorMessage(error, "");
	return (
		!message || /declin|reject|cancel|denied|(modal|popup|window) (was )?closed|user closed|closed by (the )?user/i.test(message)
	);
}
