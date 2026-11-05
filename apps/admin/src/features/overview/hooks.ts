"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdminOverview } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

export type OverviewRange = AdminOverview["range"];

export function useOverview(range: OverviewRange) {
	return useQuery({
		queryKey: ["admin", "overview", range],
		queryFn: async () => unwrap<AdminOverview>(await api.get("/admin/overview", { params: { range } })),
		placeholderData: keepPreviousData,
		refetchInterval: 60_000,
	});
}
