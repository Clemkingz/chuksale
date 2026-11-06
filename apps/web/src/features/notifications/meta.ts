import {
	Archive,
	BadgeCheck,
	CircleCheck,
	CircleX,
	EyeOff,
	FolderPlus,
	Megaphone,
	MessageSquareText,
	MessageSquareX,
	Sparkles,
	TrendingUp,
	type LucideIcon,
} from "lucide-react";
import type { NotificationType, WalletNotificationType } from "@repo/domain/types";
import { routes } from "@/lib/routes";
import type { Inbox, InboxItem } from "@/features/notifications/hooks";

type Meta = { Icon: LucideIcon; tone?: "bad" | "warn"; action: string; quoted?: boolean };

/** Icon and tone per backend notification type (both inboxes); rejections read red, change requests amber. */
export const NOTIFICATION_META: Record<NotificationType | WalletNotificationType, Meta> = {
	project_submitted: { Icon: FolderPlus, action: "View project" },
	review_requested: { Icon: FolderPlus, action: "View project" },
	project_approved: { Icon: BadgeCheck, action: "View project", quoted: true },
	project_rejected: { Icon: CircleX, tone: "bad", action: "See why", quoted: true },
	project_changes_requested: { Icon: MessageSquareText, tone: "warn", action: "See what to change", quoted: true },
	project_archived: { Icon: Archive, tone: "bad", action: "View project", quoted: true },
	project_update_removed: { Icon: EyeOff, tone: "bad", action: "See your updates", quoted: true },
	first_contribution: { Icon: Sparkles, action: "View contributions" },
	funding_target_reached: { Icon: TrendingUp, action: "View project" },
	contribution_confirmed: { Icon: CircleCheck, action: "View in My wallet" },
	contribution_failed: { Icon: CircleX, tone: "bad", action: "View in My wallet" },
	suggestion_published: { Icon: BadgeCheck, action: "View in My wallet" },
	suggestion_rejected: { Icon: MessageSquareX, tone: "warn", action: "See why", quoted: true },
	suggestion_hidden: { Icon: EyeOff, tone: "bad", action: "See why", quoted: true },
	project_update: { Icon: Megaphone, action: "View in My wallet" },
};

/**
 * Builder notifications open the builder's own project page. Wallet notifications carry only a project id (no slug),
 * so they open My wallet, which lists the contributions and suggestions they're about.
 */
export const notificationHref = (n: InboxItem, inbox: Inbox) =>
	inbox === "wallet" ? routes.wallet : n.projectId ? routes.builderProject(n.projectId) : null;

/** Decisions carry the reviewer's or moderator's note in `body`: show it as a quoted reason. */
export const isDecision = (n: InboxItem) => !!NOTIFICATION_META[n.type]?.quoted && !!n.body;
