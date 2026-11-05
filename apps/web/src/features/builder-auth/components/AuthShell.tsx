import type { ReactNode } from "react";
import { withBasePath } from "@/lib/site";
import { Logo } from "@/components/Logo";

/**
 * Designs A1–A4: the glass-cube art fills the left half; the form sits centred on the dark right half (~414px).
 * Tablet and phone drop the art for a soft periwinkle glow, so the form is first on screen.
 */
export function AuthShell({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<div aria-hidden className="relative hidden overflow-hidden lg:block">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={withBasePath("/images/auth-art.webp")} alt="" className="absolute inset-0 size-full object-cover" />
			</div>
			<div className="relative isolate flex flex-col overflow-hidden">
				<div
					aria-hidden
					className="absolute -top-40 -right-40 -z-10 size-[420px] rounded-full bg-primary-500/15 blur-[90px] lg:hidden"
				/>
				<header className="flex h-[68px] items-center px-5 sm:px-8 md:h-[90px]">
					<Logo />
				</header>
				<main className="flex flex-1 items-start justify-center px-5 pt-6 pb-16 sm:px-8 lg:items-center lg:pt-0">
					<div className="animate-page w-full max-w-[414px]">{children}</div>
				</main>
			</div>
		</div>
	);
}

export function AuthTitle({ children }: { children: ReactNode }) {
	return <h1 className="text-center font-display text-[30px] leading-tight font-bold sm:text-[38px]">{children}</h1>;
}

export function OrDivider() {
	return (
		<div className="my-4 flex items-center gap-10 text-[15px] text-white/90" aria-hidden>
			<span className="h-px flex-1 bg-white/70" />
			or
			<span className="h-px flex-1 bg-white/70" />
		</div>
	);
}
