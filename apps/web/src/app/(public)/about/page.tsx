import type { Metadata } from "next";
import { ContentPage } from "@/features/legal/components/ContentPage";
import { ABOUT } from "@/features/legal/content";

export const metadata: Metadata = { title: "About" };

/** /about (PRD §5, §12). */
export default function Page() {
	return <ContentPage {...ABOUT} />;
}
