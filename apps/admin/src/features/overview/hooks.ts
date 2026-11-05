"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdminOverview, AnalyticsSummary } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";
import { useAdminSignedIn } from "@/features/auth/session";

/** Admin home (backend guide, "Admin overview and analytics"). */

export function useOverview() {
	const signedIn = useAdminSignedIn();
	return useQuery({
		queryKey: ["admin", "overview"],
		enabled: !!signedIn,
		queryFn: async () => unwrap<AdminOverview>(await api.get("/admin/overview")),
		refetchInterval: 60_000,
	});
}

export type AnalyticsRange = 7 | 30 | 90;

/** `to` is exclusive; the API defaults to the last 30 days and refuses ranges over 366 days. */
function rangeDates(days: AnalyticsRange) {
	const to = new Date();
	to.setUTCHours(0, 0, 0, 0);
	to.setUTCDate(to.getUTCDate() + 1);
	const from = new Date(to);
	from.setUTCDate(from.getUTCDate() - days);
	return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function useAnalytics(days: AnalyticsRange) {
	return useQuery({
		queryKey: ["admin", "analytics", days],
		queryFn: async () => unwrap<AnalyticsSummary>(await api.get("/admin/analytics", { params: rangeDates(days) })),
		placeholderData: keepPreviousData,
	});
}

/** Rates run 0..1 or are null: show null as "–". */
export const rate = (r: number | null | undefined) => (r === null || r === undefined ? "–" : `${Math.round(r * 100)}%`);
