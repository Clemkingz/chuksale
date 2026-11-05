import type { Metadata } from "next";
import { ContributorsView } from "@/features/contributors/components/ContributorsView";

export const metadata: Metadata = { title: "Contributors" };

/** /contributors: design "admin page 5" ("User"). */
export default function Page() {
	return <ContributorsView />;
}
