"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import { routes } from "@/lib/routes";
import { LANDING_URL } from "@/lib/site";
import { notify } from "@/lib/use-toast";
import { Logo } from "@/components/Logo";
import { useSignOut } from "@/features/builder-auth/hooks";
import { useSignedIn } from "@/features/builder-auth/session";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { WalletButton } from "@/features/wallet/components/WalletButton";
import { useConnectedWallet } from "@/features/wallet/hooks";

const NAV = [
	{ label: "How it works", href: `${LANDING_URL}/#how-it-works`, external: true },
	{ label: "Projects", href: routes.projects },
	{ label: "FAQs", href: routes.faq },
] as const;

/** Design header: logo, three links, bell, Connect wallet. Mobile: bell + menu sheet. */
export function SiteHeader() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const token = useSignedIn();
	const signOut = useSignOut();
	const wallet = useConnectedWallet().address;

	const link = (item: (typeof NAV)[number], mobile = false) => {
		const active = !("external" in item) && pathname.startsWith(item.href);
		const className = cn(
			"transition-colors hover:text-primary-400",
			active ? "text-primary-400" : mobile ? "text-white" : "text-white/90",
			mobile && "block rounded-lg px-2 py-3 text-lg hover:bg-white/5",
		);
		return "external" in item ? (
			<a href={item.href} className={className} onClick={() => setOpen(false)}>
				{item.label}
			</a>
		) : (
			<Link href={item.href} className={className} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
				{item.label}
			</Link>
		);
	};

	return (
		<header className="sticky top-0 z-40 border-b border-white/5 bg-surface-900/85 backdrop-blur-md">
			<div className="app-container flex h-[68px] items-center justify-between gap-4 md:h-[90px]">
				<div className="flex items-center gap-10 lg:gap-14">
					<Logo />
					<nav aria-label="Main" className="hidden md:block">
						<ul className="flex items-center gap-8 text-sm lg:gap-10">
							{NAV.map((item) => (
								<li key={item.label}>{link(item)}</li>
							))}
							{wallet && (
								<li>
									<Link
										href={routes.wallet}
										aria-current={pathname.startsWith(routes.wallet) ? "page" : undefined}
										className={cn(
											"transition-colors hover:text-primary-400",
											pathname.startsWith(routes.wallet) ? "text-primary-400" : "text-white/90",
										)}
									>
										My wallet
									</Link>
								</li>
							)}
							{token && (
								<li>
									<Link href={routes.dashboard} className="text-white/90 transition-colors hover:text-primary-400">
										Dashboard
									</Link>
								</li>
							)}
						</ul>
					</nav>
				</div>

				<div className="flex items-center gap-3 md:gap-4">
					{(token || wallet) && <NotificationBell />}
					<WalletButton className="hidden md:inline-flex" />

					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							className="flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
							aria-label="Open menu"
						>
							<Menu className="size-6" />
						</SheetTrigger>
						<SheetContent side="right" className="w-[86%] rounded-none border-white/10 bg-[#131318] p-6 text-white">
							<SheetTitle className="sr-only">Menu</SheetTitle>
							<Logo />
							<nav aria-label="Mobile" className="mt-8">
								<ul className="flex flex-col gap-1">
									{NAV.map((item) => (
										<li key={item.label}>{link(item, true)}</li>
									))}
									{wallet && (
										<li>
											<Link
												href={routes.wallet}
												onClick={() => setOpen(false)}
												className="block rounded-lg px-2 py-3 text-lg text-white hover:bg-white/5"
											>
												My wallet
											</Link>
										</li>
									)}
								</ul>
							</nav>
							<div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-6">
								<WalletButton block />
								{token ? (
									<>
										<Link
											href={routes.dashboard}
											onClick={() => setOpen(false)}
											className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 text-sm hover:bg-white/5"
										>
											<LayoutDashboard className="size-4" /> Builder dashboard
										</Link>
										<button
											type="button"
											onClick={() => {
												signOut.mutate();
												setOpen(false);
												notify.info("Signed out");
											}}
											className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm text-white/70 hover:bg-white/5"
										>
											<LogOut className="size-4" /> Sign out
										</button>
									</>
								) : (
									<Link
										href={routes.signIn}
										onClick={() => setOpen(false)}
										className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 text-sm hover:bg-white/5"
									>
										<LogIn className="size-4" /> Builder sign in
									</Link>
								)}
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
