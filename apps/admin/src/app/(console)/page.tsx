import type { Metadata } from "next";
import { OverviewView } from "@/features/overview/components/OverviewView";

export const metadata: Metadata = { title: "Dashboard" };

/** / (PRD /admin): design "admin page 1". */
export default function Page() {
	return <OverviewView />;
}
