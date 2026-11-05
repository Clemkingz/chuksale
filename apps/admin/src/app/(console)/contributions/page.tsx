import type { Metadata } from "next";
import { ContributionsMonitor } from "@/features/monitor/components/ContributionsMonitor";

export const metadata: Metadata = { title: "Contributions" };

export default function Page() {
	return <ContributionsMonitor />;
}
