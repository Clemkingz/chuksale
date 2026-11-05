import type { Metadata } from "next";
import { AccountSettingsView } from "@/features/account/components/AccountSettingsView";

export const metadata: Metadata = { title: "Account settings" };

/** /settings: designs "admin page 6–8" (Account settings). Platform settings (PRD) come later. */
export default function Page() {
	return <AccountSettingsView />;
}
