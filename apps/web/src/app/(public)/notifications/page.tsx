import type { Metadata } from "next";
import { NotificationsView } from "@/features/notifications/components/NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

/** /notifications — the reader's inbox: builder (signed in), contributor (wallet) and announcements. */
export default function Page() {
	return <NotificationsView />;
}
