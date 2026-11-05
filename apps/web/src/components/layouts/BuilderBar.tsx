"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LayoutDashboard, LogOut, PenLine, Plus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { Logo } from "@/components/Logo";
import { useMe, useSignOut } from "@/features/builder-auth/hooks";
import { NotificationPanel } from "@/features/notifications/components/NotificationPanel";

/**
 * Builder pages (/builder/*) use this slim bar instead of the public site header: logo, the notification bell
 * (rejections and change requests show their reason there) and the builder's menu. No public nav or wallet button.
 */
export function BuilderBar() {
	const router = useRouter();
	const me = useMe();
	const signOut = useSignOut();
	const name = me.data?.profile?.displayName || me.data?.name || "Builder";
	const initials = name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

	return (
		<header className="sticky top-0 z-40 border-b border-white/5 bg-surface-900/85 backdrop-blur-md">
			<div className="app-container flex h-16 items-center justify-between gap-4 md:h-[72px]">
				<Logo />
				<div className="flex items-center gap-3">
					<NotificationPanel />
					<DropdownMenu>
						<DropdownMenuTrigger
							className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none sm:pr-3"
							aria-label={`Account menu for ${name}`}
						>
							<span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-xs font-bold">
								{initials}
							</span>
							<span className="hidden max-w-[160px] truncate text-sm sm:block">{name}</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							sideOffset={8}
							className="w-60 rounded-xl border-white/10 bg-[#131318] p-1.5 text-white"
						>
							<DropdownMenuLabel className="px-2.5 py-2">
								<span className="block truncate text-sm">{name}</span>
								<span className="block truncate text-xs font-normal text-white/50">{me.data?.email}</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator className="bg-white/10" />
							{[
								{ href: routes.dashboard, label: "Dashboard", Icon: LayoutDashboard },
								{ href: routes.newProject, label: "Add project", Icon: Plus },
								{ href: routes.editProfile, label: "Edit profile", Icon: PenLine },
								{ href: routes.projects, label: "Public site", Icon: ExternalLink },
							].map(({ href, label, Icon }) => (
								<DropdownMenuItem
									key={href}
									asChild
									className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white"
								>
									<Link href={href}>
										<Icon className="size-4 text-white/60" /> {label}
									</Link>
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator className="bg-white/10" />
							<DropdownMenuItem
								onSelect={() => {
									signOut.mutate(undefined, {
										onSettled: () => {
											notify.info("Signed out");
											router.replace(routes.signIn);
										},
									});
								}}
								className="cursor-pointer gap-2.5 rounded-lg p-2.5 text-error-200 focus:bg-error-400/10 focus:text-error-100"
							>
								<LogOut className="size-4" /> Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
