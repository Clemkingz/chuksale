import { Suspense } from "react";
import type { Metadata } from "next";
import { EditProfileForm } from "@/features/builder-projects/components/EditProfileForm";

export const metadata: Metadata = { title: "Your profile" };

/** /builder/profile: design "Edit Profile"; `?welcome=1` after email verification ("Complete your profile"). */
export default function Page() {
	return (
		<Suspense>
			<EditProfileForm />
		</Suspense>
	);
}
