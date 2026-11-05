import type {
	AdminAccount,
	AuditLog,
	BuilderProfile,
	Category,
	Contribution,
	ContributionIntent,
	Notification,
	Project,
	ProjectRevision,
	ProjectReview,
	ProjectUpdate,
	Report,
	Suggestion,
	User,
} from "@repo/domain/types";
import { buildSeed } from "./seed";

/**
 * The mock backend's data (pattern from stellance-v3): one JSON document in localStorage. Reads return deep
 * copies so handlers never mutate state by accident; `update` is the only way to write. `resetMockDb()`
 * restores the seed. Bump VERSION whenever the shape changes (old documents are re-seeded).
 */

/** A user plus what only the backend sees. `is_active` is what router.ts checks. */
export interface MockUser extends User {
	password: string;
	is_active: boolean;
	/** Admins sign in with a second factor (PRD §12); the mock's OTP is fixed per user. */
	mfa_code: string | null;
}

/** One-time codes (email verification, password reset). The mock "sends" them by returning `debug_code`. */
export interface MockOtp {
	email: string;
	purpose: "verify_email" | "reset_password";
	code: string;
	expires_at: number;
	attempts: number;
}

/** Stored notification: read state is per reader (`u:<userId>` / `w:<address>`), so broadcasts work too. */
export interface MockNotification extends Omit<Notification, "read_at"> {
	read_by: string[];
}

/** A contribution plus mock-only bookkeeping (simulated Demo-wallet payments, verification attempts). */
export interface MockContribution extends Contribution {
	/** Demo wallet: settles to this outcome at `settle_at` (no real transaction). */
	simulated?: { scenario: "confirmed" | "failed" | "delayed"; settle_at: number };
	/** Real Testnet payment: when Horizon was last checked, and how many times. */
	verify_attempts?: number;
	/** Set by the verifier when something didn't match (admin reconciliation). */
	reconcile_flag?: string | null;
}

export interface MockDb {
	version: number;
	/** When this document was last written (ms). Newest wins when the apps sync (mock-sync). */
	savedAt?: number;
	seededAt: string;
	users: MockUser[];
	profiles: BuilderProfile[];
	categories: Category[];
	projects: Project[];
	revisions: ProjectRevision[];
	reviews: ProjectReview[];
	updates: ProjectUpdate[];
	intents: ContributionIntent[];
	contributions: MockContribution[];
	suggestions: Suggestion[];
	reports: Report[];
	notifications: MockNotification[];
	otps: MockOtp[];
	/** Wallets that already got their demo history (handlers/notifications.ts). */
	seededWallets: string[];
	/** Wallets that already got a demo contribution history (handlers/contributions.ts). */
	seededContributionWallets: string[];
	audit: AuditLog[];
	/** Admin-only account details (Account settings), by user id. */
	adminAccounts: Record<string, Omit<AdminAccount, "email" | "mfa_enabled">>;
	/** Rate-limit buckets: key → timestamps (FR-SUG-04). */
	rateLimits: Record<string, number[]>;
}

const KEY = "csp-mock-db";
const VERSION = 8;

let memory: MockDb | null = null;

function storage(): Storage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

function load(): MockDb {
	if (memory) return memory;
	const raw = storage()?.getItem(KEY);
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as MockDb;
			if (parsed.version === VERSION) return (memory = parsed);
		} catch {
			// Corrupt or older document: fall through to a fresh seed.
		}
	}
	memory = buildSeed(VERSION);
	save(memory);
	return memory;
}

type SaveListener = (raw: string) => void;
const listeners = new Set<SaveListener>();

/** Runs after every local write (not after imports), with the whole document. Used to mirror it to the other app. */
export function onDbSaved(listener: SaveListener) {
	listeners.add(listener);
	return () => void listeners.delete(listener);
}

function save(db: MockDb, announce = true) {
	if (announce) db.savedAt = Date.now();
	memory = db;
	const raw = JSON.stringify(db);
	try {
		storage()?.setItem(KEY, raw);
	} catch {
		// Private mode or quota: keep working from memory.
	}
	if (announce) listeners.forEach((l) => l(raw));
}

/** The whole document, for mirroring to the other app (mock-sync). */
export function exportDb() {
	return JSON.stringify(load());
}

/** Takes a mirrored document if it's the same version and newer than ours. Returns whether it replaced ours. */
export function importDb(raw: string) {
	try {
		const doc = JSON.parse(raw) as MockDb;
		if (doc.version !== VERSION) return false;
		if ((doc.savedAt ?? 0) <= (load().savedAt ?? 0)) return false;
		save(doc, false);
		return true;
	} catch {
		return false;
	}
}

// Another tab of this app (or, on one domain, the other app) wrote the data: drop the cached copy.
if (typeof window !== "undefined")
	window.addEventListener("storage", (e) => {
		if (e.key === KEY) memory = null;
	});

/** A deep copy of the current data. */
export function read(): MockDb {
	return structuredClone(load());
}

/** Applies a change and persists it. */
export function update<T>(change: (db: MockDb) => T): T {
	const db = structuredClone(load());
	const result = change(db);
	save(db);
	return result;
}

/** Back to the seed ("Reset demo data"). */
export function resetMockDb() {
	memory = null;
	storage()?.removeItem(KEY);
	load();
}
