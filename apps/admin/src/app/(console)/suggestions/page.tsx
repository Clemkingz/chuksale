import type { Metadata } from "next";
import { ModerationView } from "@/features/moderation/components/ModerationView";

export const metadata: Metadata = { title: "Suggestions" };

export default function Page() {
	return <ModerationView />;
}
