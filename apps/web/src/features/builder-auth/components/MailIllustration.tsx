import { withBasePath } from "@/lib/site";

/**
 * Design A2/A3 illustration: a person posting a letter into an open envelope (transparent PNG export, kept full size
 * in packages/ui/src/assets/images/check-mail.png). Sized so the figure is ~120px tall, as in the design.
 */
export function MailIllustration() {
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={withBasePath("/images/check-mail.webp")}
			alt=""
			width={300}
			height={300}
			className="animate-rise mx-auto size-[140px] md:size-[156px]"
		/>
	);
}
