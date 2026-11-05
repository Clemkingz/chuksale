import type { Metadata } from "next";
import { SuggestionDetailView } from "@/features/moderation/components/SuggestionDetailView";

export const metadata: Metadata = { title: "Suggestion" };

export default async function Page({ params }: PageProps<"/suggestions/[id]">) {
	const { id } = await params;
	return <SuggestionDetailView id={id} />;
}
