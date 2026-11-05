import Link from "next/link";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/Logo";

const LINKS = [
	{ label: "Explore projects", href: routes.projects },
	{ label: "Submit a project", href: routes.newProject },
	{ label: "FAQ", href: routes.faq },
	{ label: "Terms", href: routes.terms },
	{ label: "Privacy", href: routes.privacy },
	{ label: "Risk disclosure", href: routes.risk },
];

/** Compact app footer (the landing has the full one): links plus the PRD §12 risk line. */
export function SiteFooter() {
	return (
		<footer className="mt-auto border-t border-white/5 py-10">
			<div className="app-container flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
				<Logo />
				<nav aria-label="Footer">
					<ul className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm text-white/75 sm:grid-cols-3">
						{LINKS.map((l) => (
							<li key={l.label}>
								<Link href={l.href} className="transition-colors hover:text-primary-400">
									{l.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</div>
			<p className="app-container mt-8 text-xs leading-5 text-white/45">
				© {new Date().getFullYear()} Chucksales · Stellar Testnet. Approval isn’t a guarantee of a project’s success;
				contributions go directly to builders and aren’t investments.
			</p>
		</footer>
	);
}
