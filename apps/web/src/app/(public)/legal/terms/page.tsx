import type { Metadata } from "next";
import { ContentPage } from "@/features/legal/components/ContentPage";
import { TERMS } from "@/features/legal/content";

export const metadata: Metadata = { title: "Terms of use" };

/** /legal/terms (PRD §5, §12). */
export default function Page() {
	return <ContentPage {...TERMS} />;
}
