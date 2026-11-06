"use client";

import { Fragment, useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Search, SearchX, X } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { SUPPORT_TELEGRAM_URL } from "@/lib/site";
import { FAQS, type Faq } from "@/features/faq/content";
import { BackLink } from "@/components/BackLink";

/**
 * Design "FAQs": big title, "Search for a question…", one card of questions (first open), then
 * "Got any other enquiries?" with a Telegram link. Several answers can be open at once; a link to /faq#<id>
 * opens and scrolls to that question. Search matches questions and answers and highlights the words.
 */

const normalise = (s: string) => s.toLowerCase().normalize("NFKD");

function Highlight({ text, query }: { text: string; query: string }) {
	const q = query.trim();
	if (!q) return <>{text}</>;
	const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const parts = text.split(new RegExp(`(${escaped})`, "ig"));
	return (
		<>
			{parts.map((part, i) =>
				i % 2 === 1 ? (
					<mark key={i} className="rounded-sm bg-primary-500/30 px-0.5 text-white">
						{part}
					</mark>
				) : (
					<Fragment key={i}>{part}</Fragment>
				),
			)}
		</>
	);
}

export function FaqView() {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<Set<string>>(() => new Set([FAQS[0]!.id]));

	// /faq#which-wallets: open that question and bring it into view (also when the hash changes later).
	useEffect(() => {
		const openFromHash = () => {
			const id = decodeURIComponent(window.location.hash.slice(1));
			if (!FAQS.some((f) => f.id === id)) return;
			setOpen((prev) => new Set(prev).add(id));
			requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
		};
		const first = setTimeout(openFromHash, 0); // after hydration
		window.addEventListener("hashchange", openFromHash);
		return () => {
			clearTimeout(first);
			window.removeEventListener("hashchange", openFromHash);
		};
	}, []);

	const results = useMemo(() => {
		const q = normalise(query.trim());
		if (!q) return FAQS;
		return FAQS.filter((f) => normalise(`${f.question} ${f.answer.join(" ")}`).includes(q));
	}, [query]);

	const searching = query.trim().length > 0;
	const toggle = (id: string) =>
		setOpen((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	return (
		<div className="app-container pt-8 pb-20 md:pt-12 md:pb-32">
			<BackLink href="/" label="Home" />
			<h1 className="animate-rise mx-auto mt-8 max-w-[1100px] md:mt-[90px] text-center font-display text-[34px] leading-[1.1] font-bold tracking-[-0.01em] text-balance sm:text-5xl lg:text-[60px]">
				Frequently Asked Questions (FAQs)
			</h1>

			<label className="animate-rise group relative mx-auto mt-8 block w-full max-w-[780px] [--i:1] md:mt-11">
				<span className="sr-only">Search for a question</span>
				<Search
					aria-hidden
					className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-white/50 transition-colors group-focus-within:text-primary-300 md:left-5"
				/>
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => e.key === "Escape" && setQuery("")}
					placeholder="Search for a question....."
					className="h-14 w-full rounded-xl border border-primary-500/50 bg-transparent pr-12 pl-12 text-base text-white transition-[border-color,box-shadow] outline-none placeholder:text-sm placeholder:text-white/55 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 md:h-16 md:pl-14 [&::-webkit-search-cancel-button]:hidden"
				/>
				{query && (
					<button
						type="button"
						onClick={() => setQuery("")}
						aria-label="Clear search"
						className="animate-pop absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
					>
						<X className="size-4" />
					</button>
				)}
			</label>
			<p aria-live="polite" className="sr-only">
				{searching ? `${results.length} question${results.length === 1 ? "" : "s"} found` : ""}
			</p>

			<div className="mx-auto mt-10 w-full max-w-[790px] md:mt-[74px]">
				{results.length > 0 ? (
					<ul data-reveal="up" className="overflow-hidden rounded-[20px] bg-[#16161B]">
						{results.map((faq) => (
							<FaqItem
								key={faq.id}
								faq={faq}
								query={query}
								// While searching every match is open, so the highlighted words are visible.
								open={searching || open.has(faq.id)}
								onToggle={() => toggle(faq.id)}
							/>
						))}
					</ul>
				) : (
					<div className="animate-pop flex flex-col items-center rounded-[20px] bg-[#16161B] px-6 py-12 text-center">
						<SearchX className="size-8 text-primary-400" aria-hidden />
						<p className="mt-4 font-display text-lg font-bold">No questions match “{query.trim()}”</p>
						<p className="mt-1 text-sm text-white/60">Try another word, or ask us directly below.</p>
						<button type="button" onClick={() => setQuery("")} className="mt-5 text-sm text-primary-300 hover:text-primary-200">
							Show all questions
						</button>
					</div>
				)}
			</div>

			<section aria-labelledby="enquiries-title" className="mt-12 text-center md:mt-14">
				<h2 id="enquiries-title" data-reveal="up" className="font-display text-[28px] font-bold md:text-[40px]">
					Got any other enquiries?
				</h2>
				<p data-reveal="up" style={{ "--d": 1 } as CSSProperties} className="mt-3 text-base text-white/90 md:text-lg">
					Reach out via Telegram
				</p>
				<a
					data-reveal="up"
					style={{ "--d": 2 } as CSSProperties}
					href={SUPPORT_TELEGRAM_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="group mt-4 inline-flex items-center gap-1.5 text-base text-primary-400 transition-colors hover:text-primary-300 md:text-lg"
				>
					Chucksales support
					<ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
				</a>
			</section>
		</div>
	);
}

function FaqItem({ faq, query, open, onToggle }: { faq: Faq; query: string; open: boolean; onToggle: () => void }) {
	const id = useId();
	return (
		<li id={faq.id} className="scroll-mt-28 border-b border-white/10 last:border-b-0">
			<h3>
				<button
					type="button"
					aria-expanded={open}
					aria-controls={`${id}-panel`}
					id={`${id}-button`}
					onClick={onToggle}
					className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base text-white transition-colors outline-none hover:bg-white/[0.025] focus-visible:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-inset md:px-6 md:py-[26px] md:text-[17px]"
				>
					<span>
						<Highlight text={faq.question} query={query} />
					</span>
					<ChevronDown
						aria-hidden
						className={cn(
							"size-5 shrink-0 text-white/80 transition-transform duration-300 ease-(--ease-settle)",
							open && "rotate-180",
						)}
					/>
				</button>
			</h3>
			{/* Height animates via grid rows 0fr → 1fr (no measuring). Closed panels are hidden from screen readers. */}
			<div
				id={`${id}-panel`}
				role="region"
				aria-labelledby={`${id}-button`}
				aria-hidden={!open}
				className={cn(
					"grid transition-[grid-template-rows,opacity] duration-300 ease-(--ease-settle)",
					open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
				)}
			>
				<div className="overflow-hidden" inert={!open}>
					<div className="flex max-w-[680px] flex-col gap-3 px-5 pb-6 text-[15px] leading-7 text-white/85 md:px-6 md:pb-7 md:text-base">
						{faq.answer.map((para, i) => (
							<p key={i}>
								<Highlight text={para} query={query} />
							</p>
						))}
						{faq.links && (
							<p className="flex flex-wrap gap-x-5 gap-y-1">
								{faq.links.map((l) => (
									<ArrowLink key={l.href} href={l.href}>
										{l.label}
									</ArrowLink>
								))}
							</p>
						)}
					</div>
				</div>
			</div>
		</li>
	);
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link href={href} className="group inline-flex items-center gap-1 text-primary-400 transition-colors hover:text-primary-300">
			{children}
			<ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
		</Link>
	);
}
