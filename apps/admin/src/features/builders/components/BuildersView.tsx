"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ShieldCheck, UserPlus, UserX, UsersRound } from "lucide-react";
import type { Role } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { Field } from "@/components/forms/Field";
import { EmptyState, ErrorState, IconStat, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";
import { USERS_PAGE, useCreateAdmin, useUserCount, useUsers, type UserFilters } from "@/features/builders/hooks";
import { BuilderActions } from "@/features/builders/components/BuilderActions";

/**
 * Design "admin developer D1", tailored to `GET /admin/users`: builders and admins (tabs), search by name or email,
 * suspended / unverified filters, suspend or restore, and "Add admin" (admins can't sign up; the new admin gets a
 * password setup code by email). Filters live in the URL.
 */

const TABS: { id: Role | "all"; label: string }[] = [
	{ id: "builder", label: "Builders" },
	{ id: "admin", label: "Admins" },
	{ id: "all", label: "Everyone" },
];

export function BuildersView() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const roleParam = params.get("role");
	const role: Role | "all" = roleParam === "admin" || roleParam === "all" ? roleParam : "builder";
	const f: UserFilters = {
		role: role === "all" ? "" : role,
		q: params.get("q") ?? "",
		suspended: params.get("suspended") === "true" ? "true" : "",
		emailVerified: params.get("unverified") === "1" ? "false" : "",
		page: Math.max(1, Number(params.get("page")) || 1),
	};
	const set = (next: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === "" || (k === "role" && v === "builder") || (k === "page" && v === 1)) sp.delete(k);
			else sp.set(k, String(v));
		}
		router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false });
	};

	const q = useUsers(f);
	const builders = useUserCount({ role: "builder" });
	const suspended = useUserCount({ suspended: true });
	const admins = useUserCount({ role: "admin" });
	const [adding, setAdding] = useState(false);
	const [search, setSearch] = useState(f.q);
	const d = q.data;
	const pages = d ? Math.max(1, Math.ceil(d.paginationMeta.totalCount / USERS_PAGE)) : 1;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle
				actions={
					<Button className="h-11 w-auto gap-2 px-5" onClick={() => setAdding(true)}>
						<UserPlus className="size-4" /> Add admin
					</Button>
				}
			>
				Users
			</PageTitle>
			<ul className="mt-6 grid gap-4 sm:grid-cols-3 md:gap-7">
				<IconStat i={0} icon={<UsersRound className="size-7" />} value={builders.data} label="Builders" />
				<IconStat i={1} icon={<ShieldCheck className="size-7" />} value={admins.data} label="Admins" />
				<IconStat i={2} icon={<UserX className="size-7" />} value={suspended.data} label="Suspended" hint="Can’t sign in until restored" />
			</ul>

			<div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<UnderlineTabs label="Role" size="md" tabs={TABS} value={role} onChange={(r) => set({ role: r, page: 1 })} />
				<div className="flex flex-wrap items-center gap-2">
					<form
						role="search"
						onSubmit={(e) => {
							e.preventDefault();
							set({ q: search.trim(), page: 1 });
						}}
						className="relative"
					>
						<label htmlFor="user-search" className="sr-only">
							Search by name or email
						</label>
						<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50" aria-hidden />
						<input
							id="user-search"
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Name or email"
							className="h-10 w-56 rounded-lg border border-white/15 bg-transparent pr-3 pl-9 text-sm outline-none focus:border-primary-500"
						/>
					</form>
					<Toggle on={f.suspended === "true"} onClick={() => set({ suspended: f.suspended ? null : "true", page: 1 })}>
						Suspended
					</Toggle>
					<Toggle on={f.emailVerified === "false"} onClick={() => set({ unverified: f.emailVerified ? null : "1", page: 1 })}>
						Unverified email
					</Toggle>
				</div>
			</div>

			<section
				data-reveal="up"
				aria-label="Accounts"
				className={cn("admin-card mt-6 overflow-hidden transition-opacity", q.isPlaceholderData && "opacity-60")}
			>
				{q.isPending ? (
					<RowsSkeleton rows={7} cols={4} />
				) : q.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
					</div>
				) : d && d.result.length === 0 ? (
					<EmptyState title="No accounts match" description="Try another search or fewer filters." />
				) : d ? (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[720px] table-fixed text-left">
							<thead className="text-base">
								<tr>
									<th scope="col" className="w-[40%] px-6 py-5 font-normal">
										Account
									</th>
									<th scope="col" className="w-[16%] px-3 py-5 font-normal">
										Role
									</th>
									<th scope="col" className="w-[22%] px-3 py-5 font-normal">
										Status
									</th>
									<th scope="col" className="w-[14%] px-3 py-5 font-normal">
										Joined
									</th>
									<th scope="col" className="w-[8%] px-3 py-5 text-center font-normal">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{d.result.map((u, i) => (
									<tr key={u.id} data-reveal="up" style={{ "--d": i } as CSSProperties} className="border-t border-white/10 hover:bg-white/[0.025]">
										<td className="px-6 py-4">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar name={u.name} className="size-10 text-xs" />
												<div className="min-w-0">
													<Link href={routes.builder(u.id)} className="block truncate text-base hover:text-primary-300">
														{u.name}
													</Link>
													<p className="truncate text-[13px] text-white/55">{u.email}</p>
												</div>
											</div>
										</td>
										<td className="px-3 capitalize">{u.role}</td>
										<td className="px-3">
											{u.suspended ? (
												<span className="rounded-full bg-error-400/15 px-2.5 py-0.5 text-xs text-error-200">Suspended</span>
											) : (
												<span className="rounded-full bg-success-400/10 px-2.5 py-0.5 text-xs text-success-200">Active</span>
											)}
											{!u.emailVerified && <span className="ml-1.5 text-xs text-warning-200">Email unverified</span>}
										</td>
										<td className="px-3" title={fullDate(u.createdAt)}>
											{timeAgo(u.createdAt)}
										</td>
										<td className="px-3 text-center">
											<BuilderActions builder={u} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>
			{d && pages > 1 && <Pager page={f.page} pages={pages} onPage={(page) => set({ page })} />}
			{adding && <AddAdminDialog onClose={() => setAdding(false)} />}
		</div>
	);
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={onClick}
			className={cn(
				"h-10 rounded-lg border px-3.5 text-sm transition-colors",
				on ? "border-primary-500 bg-primary-500/15 text-white" : "border-white/15 text-white/70 hover:text-white",
			)}
		>
			{children}
		</button>
	);
}

function AddAdminDialog({ onClose }: { onClose: () => void }) {
	const create = useCreateAdmin();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [touched, setTouched] = useState(false);
	const errs = create.isError ? detailsByField(create.error) : {};
	const nameError = touched && !name.trim() ? "Enter their name." : errs.name;
	const emailError = touched && !/^\S+@\S+\.\S+$/.test(email.trim()) ? "Enter a valid email address." : errs.email;
	return (
		<Dialog open onOpenChange={(o) => !o && !create.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[460px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Add an admin</DialogTitle>
					<DialogDescription className="text-white/65">
						They get an email with a code to set their password, then sign in here. Every admin action is in the audit log.
					</DialogDescription>
				</DialogHeader>
				<form
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						setTouched(true);
						if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return;
						create.mutate(
							{ name: name.trim(), email: email.trim() },
							{
								onSuccess: (a) => {
									notify.success("Admin added", `${a.email} will get a setup code by email.`);
									onClose();
								},
							},
						);
					}}
					className="flex flex-col gap-4"
				>
					<Field label="Name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoFocus />
					<Field label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
					{create.isError && !errs.name && !errs.email && (
						<p className="text-sm text-error-200">
							{errorStatus(create.error) === 409 ? "An account with that email already exists." : errorMessage(create.error)}
						</p>
					)}
					<DialogFooter className="gap-2 sm:gap-2">
						<Button type="button" variant="ghost" className="w-auto px-5" onClick={onClose} disabled={create.isPending}>
							Cancel
						</Button>
						<Button type="submit" className="w-auto px-5" isLoading={create.isPending} loadingLabel="Adding admin">
							Add admin
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
