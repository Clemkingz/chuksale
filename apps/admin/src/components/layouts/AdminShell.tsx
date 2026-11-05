"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	type LucideIcon,
	Bell,
	FileClock,
	FolderKanban,
	Hexagon,
	Layers,
	LogOut,
	Menu,
	MessageSquareText,
	Receipt,
	Search,
	Tags,
	UserRoundCog,
	UsersRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { useMe, useSignOut } from "@/features/auth/hooks";
import { useOverview } from "@/features/overview/hooks";

/**
 * Designs "admin page 1–8": fixed sidebar (Dashboard, Projects, Developers→Builders, User→Contributors, Settings,
 * Logout at the bottom) and a top bar (search, bell, the admin's photo, name and email). The PRD's other admin
 * areas (suggestions, contributions, categories, audit log) sit in a smaller "Moderation" group.
 * Below lg the sidebar becomes a drawer.
 */

const NAV = [
	{ href: routes.overview, label: "Dashboard", icon: Layers },
	{ href: routes.projects, label: "Projects", icon: FolderKanban },
	{ href: routes.builders, label: "Users", icon: UserRoundCog },
	{ href: routes.contributors, label: "Contributors", icon: UsersRound },
	{ href: routes.settings, label: "Settings", icon: Hexagon },
];
const MORE = [
	{ href: routes.suggestions, label: "Suggestions & reports", icon: MessageSquareText },
	{ href: routes.contributions, label: "Contributions", icon: Receipt },
	{ href: routes.categories, label: "Categories", icon: Tags },
	{ href: routes.auditLog, label: "Audit log", icon: FileClock },
];

function isActive(pathname: string, href: string) {
	return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();
	const router = useRouter();
	const signOut = useSignOut();

	const item = (n: { href: string; label: string; icon: LucideIcon }, small = false) => {
		const active = isActive(pathname, n.href);
		const Icon = n.icon;
		return (
			<li key={n.href}>
				<Link
					href={n.href}
					onClick={onNavigate}
					aria-current={active ? "page" : undefined}
					className={cn(
						"group flex items-center gap-4 rounded-lg px-4 transition-colors duration-200",
						small ? "h-10 text-[15px]" : "h-[52px] text-[17px]",
						active
							? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
							: "text-white/80 hover:bg-white/5 hover:text-white",
					)}
				>
					<Icon
						className={cn("shrink-0 transition-transform duration-200 group-hover:scale-110", small ? "size-[18px]" : "size-6")}
						aria-hidden
					/>
					{n.label}
				</Link>
			</li>
		);
	};

	return (
		<div className="flex h-full flex-col">
			<nav aria-label="Console" className="flex-1">
				<ul className="flex flex-col gap-2">{NAV.map((n) => item(n))}</ul>
				<p className="mt-8 mb-2 px-4 text-xs tracking-wide text-white/40 uppercase">Moderation</p>
				<ul className="flex flex-col gap-0.5">{MORE.map((n) => item(n, true))}</ul>
			</nav>
			<button
				type="button"
				onClick={() => {
					signOut.mutate();
					onNavigate?.();
					router.replace(routes.signIn);
				}}
				className="mt-6 flex h-12 items-center gap-4 rounded-lg px-4 text-[17px] text-primary-400 transition-colors hover:bg-primary-500/10"
			>
				<LogOut className="size-6" aria-hidden /> Logout
			</button>
		</div>
	);
}

function TopSearch() {
	const router = useRouter();
	const [q, setQ] = useState("");
	return (
		<form
			role="search"
			onSubmit={(e) => {
				e.preventDefault();
				if (q.trim()) router.push(`${routes.projects}?q=${encodeURIComponent(q.trim())}`);
			}}
			className="group relative w-full max-w-[410px]"
		>
			<label htmlFor="console-search" className="sr-only">
				Search projects by title or owner
			</label>
			<Search
				className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-white/60 transition-colors group-focus-within:text-primary-300"
				aria-hidden
			/>
			<input
				id="console-search"
				type="search"
				value={q}
				onChange={(e) => setQ(e.target.value)}
				placeholder="Search"
				className="h-12 w-full rounded-lg border border-primary-500/50 bg-transparent pr-4 pl-12 text-base text-white outline-none placeholder:text-white/55 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 md:h-[60px] [&::-webkit-search-cancel-button]:hidden"
			/>
		</form>
	);
}

/** Bell: projects waiting for review (the admin's to-do, from `/admin/overview`), linking to the queue. */
function ReviewBell() {
	const overview = useOverview();
	const n = overview.data?.queue.projectsAwaitingReview ?? 0;
	return (
		<Link
			href={`${routes.projects}?tab=submitted`}
			aria-label={n ? `${n} projects waiting for review` : "No projects waiting for review"}
			className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
		>
			<Bell className="size-5" />
			{n > 0 && (
				<span className="animate-pop absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-medium ring-2 ring-surface-900">
					{n > 99 ? "99+" : n}
				</span>
			)}
		</Link>
	);
}

function Me() {
	const me = useMe();
	const display = me.data?.name ?? "Admin";
	return (
		<Link
			href={routes.settings}
			className="flex min-w-0 items-center gap-3 rounded-full transition-opacity hover:opacity-90 md:gap-4"
		>
			<Avatar name={display} className="size-11 text-sm md:size-14 md:text-base" />
			<span className="hidden min-w-0 flex-col sm:flex">
				<span className="truncate font-display text-lg font-bold md:text-xl">{display}</span>
				<span className="truncate text-sm text-white/85">{me.data?.email ?? " "}</span>
			</span>
		</Link>
	);
}

export function AdminShell({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="min-h-dvh lg:pl-[300px]">
			<aside className="fixed inset-y-0 left-0 hidden w-[300px] flex-col px-6 pt-[52px] pb-10 lg:flex">
				<Logo className="ml-4" />
				<div className="mt-[88px] flex-1">
					<SidebarNav />
				</div>
			</aside>

			<header className="sticky top-0 z-30 bg-surface-900/85 backdrop-blur-md">
				<div className="admin-container flex h-[76px] items-center gap-3 md:h-[120px] md:gap-6">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden"
							aria-label="Open menu"
						>
							<Menu className="size-6" />
						</SheetTrigger>
						<SheetContent side="left" className="w-[290px] rounded-none border-white/10 bg-[#090B12] px-5 pt-8 pb-8 text-white">
							<SheetTitle className="sr-only">Menu</SheetTitle>
							<Logo className="ml-3" />
							<div className="mt-10 h-[calc(100%-5rem)]">
								<SidebarNav onNavigate={() => setOpen(false)} />
							</div>
						</SheetContent>
					</Sheet>
					<div className="hidden flex-1 sm:block">
						<TopSearch />
					</div>
					<div className="ml-auto flex items-center gap-3 md:gap-8">
						<ReviewBell />
						<Me />
					</div>
				</div>
				<div className="admin-container pb-3 sm:hidden">
					<TopSearch />
				</div>
			</header>

			<main className="min-w-0 pb-16">{children}</main>
		</div>
	);
}
