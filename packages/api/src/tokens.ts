import type { AuthTokens, Role, WalletToken } from "@repo/domain/types";

/**
 * Token storage, per the backend guide: the access token lives in memory only; the refresh token (single use,
 * 30 days) in localStorage so a reload stays signed in (the first call 401s, refreshes, retries). Wallet tokens
 * (12 h, no refresh) are stored with their expiry and address.
 *
 * Keys are per app: on Vercel the web and admin apps share one origin, and a builder's session must never be
 * mistaken for an admin's. Fine for staging; before launch, move refresh tokens to an httpOnly cookie.
 */

const storage = (): Storage | null => {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
};

type Listener = () => void;

export interface AccountTokenStore {
	readonly key: string;
	getAccessToken(): string | null;
	getRefreshToken(): string | null;
	/** The role from the last token pair (for routing); null when signed out. */
	getRole(): Role | null;
	hasSession(): boolean;
	save(tokens: AuthTokens): void;
	clear(): void;
	subscribe(listener: Listener): () => void;
}

export function createAccountTokenStore(app: "web" | "admin"): AccountTokenStore {
	const key = `chucksales.${app}.refreshToken`;
	const roleKey = `chucksales.${app}.role`;
	let accessToken: string | null = null;
	const listeners = new Set<Listener>();
	const emit = () => listeners.forEach((l) => l());

	// Another tab signed in or out: follow it.
	if (typeof window !== "undefined") {
		window.addEventListener("storage", (e) => {
			if (e.key !== key) return;
			accessToken = null;
			emit();
		});
	}

	return {
		key,
		getAccessToken: () => accessToken,
		getRefreshToken: () => storage()?.getItem(key) ?? null,
		getRole: () => (storage()?.getItem(roleKey) as Role | null) ?? null,
		hasSession: () => !!storage()?.getItem(key),
		save(tokens) {
			accessToken = tokens.accessToken;
			storage()?.setItem(key, tokens.refreshToken);
			storage()?.setItem(roleKey, tokens.role);
			emit();
		},
		clear() {
			const had = accessToken !== null || !!storage()?.getItem(key);
			accessToken = null;
			storage()?.removeItem(key);
			storage()?.removeItem(roleKey);
			if (had) emit();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export interface StoredWalletSession {
	walletToken: string;
	address: string;
	shortAddress: string;
	networkPassphrase: string;
	expiresAt: string;
}

const WALLET_KEY = "chucksales.walletToken";

/** The contributor's wallet session (SEP-10). Separate from builder/admin tokens: neither works for the other. */
export const walletTokenStore = {
	get(): StoredWalletSession | null {
		try {
			const raw = storage()?.getItem(WALLET_KEY);
			if (!raw) return null;
			const s = JSON.parse(raw) as StoredWalletSession;
			return Date.parse(s.expiresAt) > Date.now() ? s : null;
		} catch {
			return null;
		}
	},
	save(t: WalletToken) {
		const s: StoredWalletSession = {
			walletToken: t.walletToken,
			address: t.address,
			shortAddress: t.shortAddress,
			networkPassphrase: t.networkPassphrase,
			expiresAt: t.expiresAt,
		};
		storage()?.setItem(WALLET_KEY, JSON.stringify(s));
		return s;
	},
	clear() {
		storage()?.removeItem(WALLET_KEY);
	},
};
