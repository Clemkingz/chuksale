import { BadgeCheck, CircleX, FolderPlus, MessageSquareText, Archive, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import type { AppNotification, NotificationType } from "@repo/domain/types";
import { routes } from "@/lib/routes";

/** Icon and tone per backend notification type; rejections read red, change requests amber. */
export const NOTIFICATION_META: Record<NotificationType, { Icon: LucideIcon; tone?: "bad" | "warn"; action: string }> = {
	project_submitted: { Icon: FolderPlus, action: "View project" },
	review_requested: { Icon: FolderPlus, action: "View project" },
	project_approved: { Icon: BadgeCheck, action: "View project" },
	project_rejected: { Icon: CircleX, tone: "bad", action: "See why" },
	project_changes_requested: { Icon: MessageSquareText, tone: "warn", action: "See what to change" },
	project_archived: { Icon: Archive, tone: "bad", action: "View project" },
	first_contribution: { Icon: Sparkles, action: "View contributions" },
	funding_target_reached: { Icon: TrendingUp, action: "View project" },
};

/** Every notification carries a `projectId`: link to the builder's own project page. */
export const notificationHref = (n: AppNotification) => (n.projectId ? routes.builderProject(n.projectId) : null);

/** Decision notifications carry the reviewer's note in `body`: show it as a quoted reason. */
export const isDecision = (n: AppNotification) =>
	n.type === "project_rejected" || n.type === "project_changes_requested" || n.type === "project_archived" || n.type === "project_approved";
