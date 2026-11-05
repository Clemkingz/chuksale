"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminCategory } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/** Categories (backend guide, "Categories"): deactivated, never deleted; slugs never change. */

export function useAdminCategories() {
	return useQuery({
		queryKey: ["admin", "categories"],
		queryFn: async () => unwrap<AdminCategory[]>(await api.get("/admin/categories")),
		staleTime: 60_000,
	});
}

export function useCreateCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { name: string; slug?: string; sortOrder?: number }) =>
			unwrap<AdminCategory>(await api.post("/admin/categories", v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
	});
}

export function useUpdateCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...v }: { id: string; name?: string; isActive?: boolean; sortOrder?: number }) =>
			unwrap<AdminCategory>(await api.patch(`/admin/categories/${id}`, v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
	});
}
