/**
 * Where the app's data comes from (same switch as stellance-v3, but MOCK is the default here: there is no
 * backend yet).
 *
 * - "mock" (default): the in-browser backend in `@repo/mock-api`, installed as an axios adapter. Same URLs,
 *   envelopes and errors a real API will use (docs/API.md), so hooks never know. Data lives in localStorage
 *   (`csp-mock-db`); "Reset demo data" restores the seed.
 * - "live" (`NEXT_PUBLIC_API_SOURCE=live`): the real API, once it exists.
 */
export const API_SOURCE: "mock" | "live" = process.env.NEXT_PUBLIC_API_SOURCE === "live" ? "live" : "mock";

export const USE_MOCK_API = API_SOURCE === "mock";

/** Demo accounts the mock backend seeds. */
export const DEMO_ACCOUNTS = {
	builder: { email: "builder@demo.local", password: "Password1" },
	admin: { email: "admin@demo.local", password: "Password1" },
} as const;

/** Restores the seed data (mock mode only). */
export async function resetDemoData() {
	const { resetMockDb } = await import("@repo/mock-api/db");
	resetMockDb();
}
