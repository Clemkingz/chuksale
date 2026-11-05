"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, LogIn, Menu, UserPlus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { HEADER_CTA, NAV_LINKS } from "@/features/landing/content";
import { Logo } from "@/features/landing/components/Logo";

const OPTION_ICON = { "sign-up": UserPlus, "sign-in": LogIn } as const;

/**
 * Design: logo, three links, then the CTAs. Instead of one "Launch app" there is one CTA per audience:
 * contributors go straight to Explore projects (no account, PRD §3.2); builders choose Create an account or Sign in.
 * Wallet sessions live in apps/web (another origin) and the PRD asks for a wallet only at the moment of an action
 * (§6.4), so there is no wallet button here. The bell (notifications) belongs to the app too.
 *
 * Breakpoints: nav links from lg; the CTAs from sm (with the menu button until lg); below sm everything is in the sheet.
 */
export function Header() {
	const [open, setOpen] = useState(false);
	const { contributor, builder } = HEADER_CTA;

	return (
		<header className="sticky top-0 z-50 border-b border-white/5 bg-surface-900/85 backdrop-blur-md">
			<div className="lp-container flex h-[72px] items-center justify-between gap-4 md:h-[90px] lg:gap-6">
				<div className="flex min-w-0 items-center gap-10 xl:gap-14">
					<Logo />
					<nav aria-label="Main" className="hidden lg:block">
						<ul className="flex items-center gap-8 text-sm text-white/90 xl:gap-10">
							{NAV_LINKS.map((link) => (
								<li key={link.label}>
									<a href={link.href} className="transition-colors hover:text-primary-400">
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</div>

				<div className="flex items-center gap-2 sm:gap-3">
					<a
						href={contributor.href}
						style={{ "--i": 1 } as React.CSSProperties}
						className="lp-btn group animate-rise hidden h-11 gap-2 border border-primary-500/70 px-4 text-sm text-primary-300 hover:border-primary-400 hover:bg-primary-500/10 hover:text-white sm:inline-flex"
					>
						{contributor.label}
						<ArrowRight className="lp-nudge size-4" aria-hidden />
					</a>

					<DropdownMenu modal={false}>
						<DropdownMenuTrigger
							style={{ "--i": 2 } as React.CSSProperties}
							className="lp-btn group animate-rise hidden h-11 gap-1.5 bg-primary-500 pr-3 pl-4 text-sm text-white hover:bg-primary-600 data-[state=open]:bg-primary-600 sm:inline-flex"
						>
							{builder.label}
							<ChevronDown
								className="size-4 transition-transform duration-200 ease-(--ease-settle) group-data-[state=open]:rotate-180"
								aria-hidden
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							sideOffset={10}
							className="w-[300px] rounded-xl border-white/10 bg-surface-700 p-2 text-white shadow-2xl shadow-black/40"
						>
							<DropdownMenuLabel className="px-2 pt-1 pb-2 text-xs font-normal tracking-wide text-white/50 uppercase">
								Builders &amp; project owners
							</DropdownMenuLabel>
							{builder.options.map((option, i) => {
								const Icon = OPTION_ICON[option.id];
								return (
									<DropdownMenuItem
										key={option.id}
										asChild
										style={{ "--i": i } as React.CSSProperties}
										className="animate-rise cursor-pointer gap-3 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white"
									>
										<a href={option.href}>
											<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1E2030] text-primary-400">
												<Icon className="size-[18px] text-primary-400" aria-hidden />
											</span>
											<span className="flex min-w-0 flex-col">
												<span className="text-sm font-medium">{option.label}</span>
												<span className="text-xs text-white/55">{option.hint}</span>
											</span>
										</a>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>

					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							className="inline-flex size-11 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 lg:hidden"
							aria-label="Open menu"
						>
							<Menu className="size-6" />
						</SheetTrigger>
						<SheetContent
							side="right"
							className="w-[85%] gap-0 overflow-y-auto rounded-none border-white/10 bg-surface-700 p-6 text-white sm:max-w-sm"
						>
							<SheetTitle className="sr-only">Menu</SheetTitle>
							<Logo />
							<nav aria-label="Mobile" className="mt-8">
								<ul className="flex flex-col gap-1 text-lg">
									{NAV_LINKS.map((link, i) => (
										<li key={link.label} className="animate-rise" style={{ "--i": i } as React.CSSProperties}>
											<a href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 hover:bg-white/5">
												{link.label}
											</a>
										</li>
									))}
								</ul>
							</nav>

							<div className="mt-auto flex flex-col gap-6 pt-10">
								<div className="animate-rise" style={{ "--i": 3 } as React.CSSProperties}>
									<p className="mb-2 text-xs tracking-wide text-white/50 uppercase">Contributors</p>
									<a
										href={contributor.href}
										className="lp-btn group h-12 w-full gap-2 border border-primary-500/70 text-base text-primary-300 hover:bg-primary-500/10"
									>
										{contributor.label}
										<ArrowRight className="lp-nudge size-4" aria-hidden />
									</a>
								</div>
								<div className="animate-rise" style={{ "--i": 4 } as React.CSSProperties}>
									<p className="mb-2 text-xs tracking-wide text-white/50 uppercase">Builders &amp; project owners</p>
									<a
										href={builder.options[0].href}
										className="lp-btn h-12 w-full gap-2 bg-primary-500 text-base text-white hover:bg-primary-600"
									>
										<UserPlus className="size-4" aria-hidden />
										{builder.options[0].label}
									</a>
									<p className="mt-3 text-center text-sm text-white/60">
										Already a builder?{" "}
										<a href={builder.options[1].href} className="text-primary-400 underline-offset-4 hover:underline">
											{builder.options[1].label}
										</a>
									</p>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
