/**
 * Where the app's data comes from.
 *
 * - "live" (default): the ChuckSales API at NEXT_PUBLIC_API_URL (staging: https://chucksale-backend.onrender.com/api/v1),
 *   called from the browser (the API rate-limits per client IP, so never through a Next.js proxy).
 * - "mock" (`NEXT_PUBLIC_API_SOURCE=mock`): the in-browser backend in `@repo/mock-api`, installed as an axios
 *   adapter. Same routes, envelopes and errors as the live API; adds the Demo panel and demo accounts.
 */
export const API_SOURCE: "mock" | "live" = process.env.NEXT_PUBLIC_API_SOURCE === "mock" ? "mock" : "live";

export const USE_MOCK_API = API_SOURCE === "mock";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chucksale-backend.onrender.com/api/v1";

/** Demo accounts the mock backend seeds (mock mode only). */
export const DEMO_ACCOUNTS = {
	builder: { email: "builder@demo.local", password: "Password1" },
	admin: { email: "admin@demo.local", password: "Password1" },
} as const;

/** Restores the seed data (mock mode only). */
export async function resetDemoData() {
	const { resetMockDb } = await import("@repo/mock-api/db");
	resetMockDb();
}
