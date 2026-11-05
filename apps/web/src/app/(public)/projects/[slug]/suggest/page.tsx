import type { Metadata } from "next";
import { SuggestView } from "@/features/suggestions/components/SuggestView";

export const metadata: Metadata = { title: "Suggest an improvement" };

/** /projects/[slug]/suggest (PRD §6.6). */
export default async function Page({ params }: PageProps<"/projects/[slug]/suggest">) {
	const { slug } = await params;
	return <SuggestView slug={slug} />;
}
