"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminContribution, ContributionStatus, Page } from "@repo/domain/types";
import { api, cleanParams, unwrap } from "@/lib/api/client";

/** Contribution monitor (backend guide, "Contributions": builder and admin). */

export type ContributionFilters = {
	status: ContributionStatus | "";
	projectId?: string;
	address?: string;
	limit: number;
	offset: number;
};

export function useAdminContributions(f: ContributionFilters, poll = false) {
	return useQuery({
		queryKey: ["admin", "contributions", f],
		queryFn: async () => unwrap<Page<AdminContribution>>(await api.get("/admin/contributions", { params: cleanParams(f) })),
		placeholderData: keepPreviousData,
		refetchInterval: poll ? 15_000 : false,
	});
}

/** Re-checks one contribution on the network (audit-logged). */
export function useReconcile() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => unwrap<AdminContribution>(await api.post(`/admin/contributions/${id}/reconcile`)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "contributions"] }),
	});
}
