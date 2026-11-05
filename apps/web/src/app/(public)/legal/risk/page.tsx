import type { Metadata } from "next";
import { ContentPage } from "@/features/legal/components/ContentPage";
import { RISK } from "@/features/legal/content";

export const metadata: Metadata = { title: "Risk disclosure" };

/** /legal/risk (PRD §5, §12). */
export default function Page() {
	return <ContentPage {...RISK} />;
}
