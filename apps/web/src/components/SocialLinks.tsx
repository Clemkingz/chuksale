import { AtSign, ExternalLink, Globe, Mail } from "lucide-react";
import { SOCIAL_PLATFORM_LABEL } from "@repo/domain/labels";
import type { SocialLink } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";

/** A builder's public links: website, contact email and social profiles, as pill links. */
export function SocialLinks({
	websiteUrl,
	contactEmail,
	socialLinks,
	className,
}: {
	websiteUrl?: string | null;
	contactEmail?: string | null;
	socialLinks: SocialLink[];
	className?: string;
}) {
	if (!websiteUrl && !contactEmail && !socialLinks.length) return null;
	const pill =
		"inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3.5 text-sm text-white/85 transition-colors hover:border-primary-400 hover:text-white";
	return (
		<ul className={cn("flex flex-wrap gap-2", className)}>
			{websiteUrl && (
				<li>
					<a href={websiteUrl} target="_blank" rel="noopener noreferrer" className={pill}>
						<Globe className="size-4" aria-hidden /> Website
					</a>
				</li>
			)}
			{socialLinks.map((s) => (
				<li key={`${s.platform}-${s.url}`}>
					<a href={s.url} target="_blank" rel="noopener noreferrer" className={pill}>
						{s.platform === "other" ? <ExternalLink className="size-4" aria-hidden /> : <AtSign className="size-4" aria-hidden />}
						{s.platform === "other" ? new URL(s.url).hostname.replace(/^www\./, "") : SOCIAL_PLATFORM_LABEL[s.platform]}
					</a>
				</li>
			))}
			{contactEmail && (
				<li>
					<a href={`mailto:${contactEmail}`} className={pill}>
						<Mail className="size-4" aria-hidden /> {contactEmail}
					</a>
				</li>
			)}
		</ul>
	);
}
