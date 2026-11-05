import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/**
 * Long-form pages (About, Terms, Privacy, Risk): title, intro, an "On this page" list on wide screens and numbered
 * sections. Copy lives in content.tsx and follows the PRD (D1 direct payments, D4 no refunds, Testnet, no
 * investment wording).
 */
export type Section = { id: string; title: string; body: ReactNode };

export function ContentPage({
	eyebrow,
	title,
	intro,
	updated,
	sections,
	aside,
}: {
	eyebrow: string;
	title: string;
	intro: ReactNode;
	updated?: string;
	sections: Section[];
	aside?: ReactNode;
}) {
	return (
		<div className="app-container py-12 md:py-20">
			<header className="max-w-[760px]">
				<p className="animate-rise text-sm tracking-wide text-primary-300 uppercase">{eyebrow}</p>
				<h1 className="animate-rise mt-3 font-display text-[34px] leading-tight font-bold [--i:1] md:text-5xl">{title}</h1>
				<div className="animate-rise mt-4 text-lg leading-8 text-white/75 [--i:2]">{intro}</div>
				{updated && <p className="animate-rise mt-4 text-sm text-white/45 [--i:3]">Last updated {updated}</p>}
			</header>
			<div className="mt-12 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
				<nav aria-label="On this page" className="hidden lg:block">
					<div className="sticky top-28">
						<p className="text-xs tracking-wide text-white/45 uppercase">On this page</p>
						<ol className="mt-3 flex flex-col gap-2 text-sm">
							{sections.map((s, i) => (
								<li key={s.id}>
									<a href={`#${s.id}`} className="text-white/65 transition-colors hover:text-white">
										{i + 1}. {s.title}
									</a>
								</li>
							))}
						</ol>
						{aside}
					</div>
				</nav>
				<div className="flex max-w-[760px] flex-col gap-10">
					{sections.map((s, i) => (
						<section
							key={s.id}
							id={s.id}
							data-reveal="up"
							style={{ "--d": Math.min(i, 2) } as CSSProperties}
							className="scroll-mt-28"
						>
							<h2 className="font-display text-2xl font-bold">
								<span className="mr-2 text-primary-400">{i + 1}.</span>
								{s.title}
							</h2>
							<div className="prose-content mt-3 flex flex-col gap-3 text-[16px] leading-7 text-white/80">{s.body}</div>
						</section>
					))}
					<p className="text-sm text-white/50">
						Questions? See the{" "}
						<Link href="/faq" className="text-primary-300 hover:underline">
							FAQ
						</Link>{" "}
						or contact us on Telegram.
					</p>
				</div>
			</div>
		</div>
	);
}

export function List({ items }: { items: ReactNode[] }) {
	return (
		<ul className="flex list-disc flex-col gap-2 pl-5 marker:text-primary-400">
			{items.map((it, i) => (
				<li key={i}>{it}</li>
			))}
		</ul>
	);
}
