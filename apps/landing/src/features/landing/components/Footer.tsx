import { FaDiscord, FaTelegram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SOCIAL_LINKS } from "@/lib/site";
import { FOOTER_COLUMNS } from "@/features/landing/content";
import { Logo } from "@/features/landing/components/Logo";

const SOCIALS = [
	{ label: "X", href: SOCIAL_LINKS.x, Icon: FaXTwitter },
	{ label: "Discord", href: SOCIAL_LINKS.discord, Icon: FaDiscord },
	{ label: "Telegram", href: SOCIAL_LINKS.telegram, Icon: FaTelegram },
];

/** Logo, link columns and socials, plus the risk line the PRD asks for (§12). */
export function Footer() {
	return (
		<footer className="border-t border-white/5 pt-16 pb-10 md:pt-[70px]">
			<div className="lp-container grid gap-12 md:grid-cols-[1.3fr_repeat(4,auto)] md:items-center md:gap-16">
				<Logo />
				{FOOTER_COLUMNS.map((col, i) => (
					<nav
						key={col.title}
						data-reveal="up"
						style={{ "--d": i } as React.CSSProperties}
						aria-label={col.title}
						className="self-start"
					>
						<h2 className="text-lg font-medium">{col.title}</h2>
						<ul className="mt-6 flex flex-col gap-5 text-base text-white/85">
							{col.links.map((link) => (
								<li key={link.label}>
									<a href={link.href} className="transition-colors hover:text-primary-400">
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				))}
				<div data-reveal="up" style={{ "--d": FOOTER_COLUMNS.length } as React.CSSProperties} className="self-start">
					<h2 className="text-lg font-medium">Socials</h2>
					<ul className="mt-6 flex items-center gap-7">
						{SOCIALS.map(({ label, href, Icon }) => (
							<li key={label}>
								<a
									href={href}
									target="_blank"
									rel="noreferrer"
									aria-label={label}
									className="text-primary-500 transition-colors hover:text-primary-400"
								>
									<Icon className="size-9" aria-hidden />
								</a>
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="lp-container mt-16 flex flex-col gap-2 border-t border-white/10 pt-8 text-sm text-white/55 md:flex-row md:justify-between">
				<p>© {new Date().getFullYear()} Chucksales. Running on Stellar Testnet.</p>
				<p className="max-w-[620px] md:text-right">
					Approval by our team isn’t a guarantee of a project’s success. Contributions go directly to builders and aren’t
					investments.
				</p>
			</div>
		</footer>
	);
}
