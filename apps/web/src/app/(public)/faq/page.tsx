import type { Metadata } from "next";
import { FaqView } from "@/features/faq/components/FaqView";
import { FAQS } from "@/features/faq/content";

export const metadata: Metadata = {
	title: "FAQs",
	description: "How Chucksales works: reviewed projects, direct Stellar contributions, wallets, assets and suggestions.",
};

/** /faq: design "FAQs". The FAQPage JSON-LD lets search engines show the answers. */
export default function Page() {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: FAQS.map((f) => ({
			"@type": "Question",
			name: f.question,
			acceptedAnswer: { "@type": "Answer", text: f.answer.join(" ") },
		})),
	};
	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
			<FaqView />
		</>
	);
}
