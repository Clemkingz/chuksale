import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Logo } from "@/components/Logo";
import { withBasePath } from "@/lib/site";

/**
 * 404, also what a non-public project returns (PRD FR-REV-05: drafts, rejected and unpublished projects simply
 * don't exist publicly), so the copy doesn't promise the page ever existed.
 */
export default function NotFound() {
	return (
		<div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
			<div
				aria-hidden
				className="absolute inset-0 -z-10 bg-cover bg-center opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
				style={{ backgroundImage: `url(${withBasePath("/images/grid.webp")})` }}
			/>
			<header className="app-container flex h-[68px] items-center md:h-[90px]">
				<Logo />
			</header>
			<main className="app-container flex flex-1 flex-col items-center justify-center pb-24 text-center">
				<p className="animate-rise bg-gradient-to-b from-white to-primary-500/40 bg-clip-text font-display text-[96px] leading-none font-bold text-transparent md:text-[168px]">
					404
				</p>
				<h1 className="animate-rise mt-4 font-display text-2xl font-bold md:text-4xl" style={{ "--i": 1 } as React.CSSProperties}>
					This page isn’t here
				</h1>
				<p className="animate-rise mt-3 max-w-[460px] text-white/65" style={{ "--i": 2 } as React.CSSProperties}>
					The link may be mistyped, or the project isn’t public. Only approved projects can be viewed.
				</p>
				<div
					className="animate-rise mt-8 flex w-full max-w-[420px] flex-col gap-3 sm:flex-row"
					style={{ "--i": 3 } as React.CSSProperties}
				>
					<Button asChild className="sm:flex-1">
						<Link href="/projects">
							<Compass className="size-4" /> Explore projects
						</Link>
					</Button>
					<Button asChild variant="outline" className="sm:flex-1">
						<Link href="/">Go home</Link>
					</Button>
				</div>
			</main>
		</div>
	);
}
