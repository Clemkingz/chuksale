import type { Metadata } from "next";
import { ContentPage } from "@/features/legal/components/ContentPage";
import { PRIVACY } from "@/features/legal/content";

export const metadata: Metadata = { title: "Privacy" };

/** /legal/privacy (PRD §5, §12). */
export default function Page() {
	return <ContentPage {...PRIVACY} />;
}
