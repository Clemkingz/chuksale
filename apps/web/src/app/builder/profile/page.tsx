import type { Metadata } from "next";
import { EditProfileForm } from "@/features/builder-projects/components/EditProfileForm";

export const metadata: Metadata = { title: "Edit profile" };

/** /builder/profile: design "Edit Profile". */
export default function Page() {
	return <EditProfileForm />;
}
