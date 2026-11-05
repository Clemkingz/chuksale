"use client";

import { useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { Category } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { api, unwrap } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { inputClass } from "@/components/forms/Field";
import { EmptyState, ErrorState, PageTitle, RowsSkeleton } from "@/components/ui";

/**
 * /categories (PRD P1): add, rename and switch categories on/off. Renaming keeps the slug so links keep working;
 * an inactive category disappears from filters and new submissions but existing projects keep it. Audit-logged.
 */

type Row = Category & { project_count: number };

export function CategoriesView() {
	const qc = useQueryClient();
	const q = useQuery({
		queryKey: ["admin", "categories"],
		queryFn: async () => unwrap<Row[]>(await api.get("/admin/categories")),
	});
	const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "categories"] });
	const add = useMutation({
		mutationFn: async (name: string) => unwrap<Category>(await api.post("/admin/categories", { name })),
		onSuccess: invalidate,
	});
	const patch = useMutation({
		mutationFn: async (v: { id: string; name?: string; is_active?: boolean }) =>
			unwrap<Category>(await api.patch(`/admin/categories/${v.id}`, v)),
		onSuccess: invalidate,
	});
	const [name, setName] = useState("");
	const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

	return (
		<div className="admin-container max-w-[900px] pt-2 md:pt-6">
			<PageTitle>Categories</PageTitle>
			<p className="mt-2 text-white/60">Builders pick one when they describe their project; contributors filter by them.</p>

			<form
				className="mt-7 flex flex-col gap-3 sm:flex-row"
				onSubmit={(e) => {
					e.preventDefault();
					if (name.trim().length < 2) return;
					add.mutate(name.trim(), {
						onSuccess: (c) => {
							notify.success("Category added", c.name);
							setName("");
						},
					});
				}}
			>
				<label className="flex-1">
					<span className="sr-only">New category name</span>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={40}
						placeholder="New category, e.g. Health"
						className={inputClass(add.isError)}
					/>
				</label>
				<Button
					type="submit"
					className="h-12 w-full gap-2 px-6 sm:w-auto"
					disabled={name.trim().length < 2}
					isLoading={add.isPending}
					loadingLabel="Adding"
				>
					<Plus className="size-4" /> Add category
				</Button>
			</form>
			{add.isError && <p className="animate-rise mt-2 text-sm text-error-200">{errorMessage(add.error)}</p>}

			<div className="admin-card mt-6 overflow-hidden">
				{q.isPending ? (
					<RowsSkeleton rows={4} cols={3} />
				) : q.isError ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
					</div>
				) : q.data.length === 0 ? (
					<EmptyState title="No categories yet" />
				) : (
					<ul className="divide-y divide-white/10">
						{q.data.map((c, i) => (
							<li
								key={c.id}
								data-reveal="up"
								style={{ "--d": i } as CSSProperties}
								className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-6"
							>
								{editing?.id === c.id ? (
									<form
										className="flex flex-1 items-center gap-2"
										onSubmit={(e) => {
											e.preventDefault();
											patch.mutate(
												{ id: c.id, name: editing.name.trim() },
												{
													onSuccess: () => (notify.success("Renamed"), setEditing(null)),
													onError: (err) => notify.fromError(err),
												},
											);
										}}
									>
										<input
											autoFocus
											value={editing.name}
											onChange={(e) => setEditing({ ...editing, name: e.target.value })}
											maxLength={40}
											aria-label="Category name"
											className={cn(inputClass(false), "h-10")}
										/>
										<Button
											type="submit"
											size="icon"
											className="size-10 shrink-0"
											aria-label="Save name"
											isLoading={patch.isPending}
										>
											<Check className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="size-10 shrink-0"
											aria-label="Cancel"
											onClick={() => setEditing(null)}
										>
											<X className="size-4" />
										</Button>
									</form>
								) : (
									<div className="min-w-0 flex-1">
										<p className={cn("text-lg", !c.is_active && "text-white/45")}>{c.name}</p>
										<p className="text-xs text-white/45">
											/{c.slug} · {c.project_count} project{c.project_count === 1 ? "" : "s"}
										</p>
									</div>
								)}
								{editing?.id !== c.id && (
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={() => setEditing({ id: c.id, name: c.name })}
											className="flex size-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
											aria-label={`Rename ${c.name}`}
										>
											<Pencil className="size-4" />
										</button>
										<button
											type="button"
											role="switch"
											aria-checked={c.is_active}
											aria-label={`${c.name} is ${c.is_active ? "active" : "inactive"}`}
											onClick={() =>
												patch.mutate(
													{ id: c.id, is_active: !c.is_active },
													{
														onSuccess: () =>
															notify.success(c.is_active ? "Category switched off" : "Category switched on", c.name),
														onError: (e) => notify.fromError(e),
													},
												)
											}
											className={cn(
												"relative h-7 w-12 rounded-full transition-colors",
												c.is_active ? "bg-primary-500" : "bg-white/20",
											)}
										>
											<span
												className={cn(
													"absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-200",
													c.is_active && "translate-x-5",
												)}
											/>
										</button>
									</div>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
