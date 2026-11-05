import type { Metadata } from "next";
import { ProjectPage } from "@/features/projects/components/ProjectPage";

export const metadata: Metadata = { title: "Project" };

/** /projects/[slug] (PRD §6.3). */
export default async function Page({ params }: PageProps<"/projects/[slug]">) {
	const { slug } = await params;
	return <ProjectPage slug={slug} />;
}
