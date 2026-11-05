import type { Metadata } from "next";
import { AddProjectForm } from "@/features/builder-projects/components/AddProjectForm";

export const metadata: Metadata = { title: "Add project" };

/** /builder/projects/new: design "Dev add project 2". */
export default function Page() {
	return <AddProjectForm />;
}
