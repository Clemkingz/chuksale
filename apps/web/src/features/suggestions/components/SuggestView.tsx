"use client";

import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Clock, Lightbulb, Wallet, XCircle } from "lucide-react";
import { SUGGESTION_STATUS_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import type { SuggestionStatus, SuggestionType } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { timeAgo } from "@/lib/time";
import { notify } from "@/lib/use-toast";
import { optionalLink } from "@/lib/validation";
import { FormError, TextAreaField, TextField } from "@/components/forms/Fields";
import { EmptyState } from "@/components/States";
import { ProjectLogo } from "@/components/ProjectLogo";
import { useProject } from "@/features/projects/hooks";
import { useConnectedWallet, useRequireWallet } from "@/features/wallet/hooks";
import { useCreateSuggestion, useMySuggestions } from "@/features/suggestions/hooks";

/**
 * /projects/[slug]/suggest (PRD §6.6): type, title, body, optional link. The wallet is asked for only when sending
 * (PRD §6.4). New suggestions are moderated first (D8), so the confirmation says so, and "Your suggestions" shows
 * each one's status while that wallet is connected.
 */

const TYPES = Object.entries(SUGGESTION_TYPE_LABEL) as [SuggestionType, string][];
const schema = z.object({
	type: z.enum(["product_improvement", "technical_feedback", "community_marketing", "other"]),
	title: z.string().trim().min(5, "Use at least 5 characters.").max(120, "Use 120 characters or fewer."),
	body: z
		.string()
		.trim()
		.min(20, "Use at least 20 characters so the builder can act on it.")
		.max(2000, "Use 2,000 characters or fewer."),
	link: optionalLink("link"),
});
type Values = z.infer<typeof schema>;

const FIELDS = ["type", "title", "body", "link"] as const;

const STATUS_ICON: Record<SuggestionStatus, typeof Clock> = {
	pending: Clock,
	published: CheckCircle2,
	hidden: XCircle,
	rejected: XCircle,
};
const STATUS_TONE: Record<SuggestionStatus, string> = {
	pending: "text-warning-200",
	published: "text-success-200",
	hidden: "text-white/50",
	rejected: "text-error-200",
};

export function SuggestView({ slug }: { slug: string }) {
	// react-hook-form + React Compiler: memoized register() props stop tracking fields after form.reset(). Opt out.
	"use no memo";

	const project = useProject(slug);
	const create = useCreateSuggestion(slug);
	const requireWallet = useRequireWallet();
	const { address } = useConnectedWallet();
	const mine = useMySuggestions();
	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { type: "product_improvement", title: "", body: "", link: "" },
		mode: "onTouched",
	});
	const body = useWatch({ control: form.control, name: "body" });
	const type = useWatch({ control: form.control, name: "type" });
	const p = project.data;

	const onSubmit = form.handleSubmit((v) =>
		requireWallet(
			() =>
				create.mutate(
					{ type: v.type, title: v.title, body: v.body, ...(v.link ? { link: v.link } : {}) },
					{
						onSuccess: () => {
							notify.success("Thanks, it will appear once a moderator approves it");
							form.reset();
						},
						onError: (e) => {
							if (errorStatus(e) !== 400) return;
							const byField = detailsByField(e);
							for (const f of FIELDS) if (byField[f]) form.setError(f, { message: byField[f] });
						},
					},
				),
			"Connect a wallet to send your suggestion. It’s how we tell suggestions apart: no account needed.",
		),
	);

	const projectMine = mine.data?.result.filter((s) => s.project.slug === slug) ?? [];
	const fieldErrors = create.isError ? detailsByField(create.error) : {};

	if (project.isError)
		return (
			<div className="app-container py-16">
				<EmptyState
					title="This project isn’t available"
					action={
						<Button asChild className="w-auto px-6">
							<Link href={routes.projects}>Explore projects</Link>
						</Button>
					}
				/>
			</div>
		);

	return (
		<div className="app-container py-10 md:py-14">
			<Link href={routes.project(slug)} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
				<ArrowLeft className="size-4" /> Back to project
			</Link>
			<div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
				<section aria-labelledby="suggest-title" className="animate-rise rounded-[24px] bg-[#16161B] px-5 py-7 sm:px-8 md:py-9">
					<div className="flex items-center gap-4">
						{p ? (
							<ProjectLogo title={p.title} src={p.coverImageUrl} className="size-12 text-sm" />
						) : (
							<span className="skeleton-shimmer block size-12 rounded-full" />
						)}
						<div className="min-w-0">
							<h1 id="suggest-title" className="font-display text-2xl font-bold md:text-[30px]">
								Suggest an improvement
							</h1>
							<p className="truncate text-white/60">{p?.title ?? " "}</p>
						</div>
					</div>

					<form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-6">
						<fieldset>
							<legend className="mb-2.5 text-base">Type</legend>
							<div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
								{TYPES.map(([id, label]) => (
									<label
										key={id}
										className={cn(
											"flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40",
											type === id
												? "border-primary-500 bg-primary-500/10 text-white"
												: "border-white/20 text-white/75 hover:border-white/40",
										)}
									>
										<input type="radio" value={id} className="sr-only" {...form.register("type")} />
										{label}
									</label>
								))}
							</div>
						</fieldset>
						<TextField
							label="Title"
							maxLength={120}
							placeholder="A short summary of your idea"
							error={form.formState.errors.title?.message}
							{...form.register("title")}
						/>
						<TextAreaField
							label="Your suggestion"
							maxLength={2000}
							count={body.length}
							placeholder="What should change, and why would it help?"
							error={form.formState.errors.body?.message}
							{...form.register("body")}
						/>
						<TextField
							label="Link (optional)"
							type="url"
							inputMode="url"
							placeholder="https://…"
							error={form.formState.errors.link?.message}
							{...form.register("link")}
						/>
						<FormError
							message={
								create.isError && !FIELDS.some((f) => fieldErrors[f]) ? errorMessage(create.error) : null
							}
						/>
						<div className="flex flex-col gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
							<span className="flex items-center gap-2">
								<Wallet className="size-4 shrink-0 text-primary-300" aria-hidden />
								{address ? (
									<>Sent from {shortKey(address, 5, 5)}. A moderator reviews it before it’s public.</>
								) : (
									<>You’ll connect a wallet when you send. No account needed.</>
								)}
							</span>
						</div>
						<Button
							type="submit"
							size="lg"
							className="h-14 gap-2 text-base"
							isLoading={create.isPending}
							loadingLabel="Sending suggestion"
						>
							<Lightbulb className="size-4" /> Send suggestion
						</Button>
					</form>
				</section>

				<aside aria-labelledby="mine-title" className="lg:pt-2">
					<h2 id="mine-title" className="font-display text-xl font-bold">
						Your suggestions
					</h2>
					{!address ? (
						<p className="mt-3 text-sm leading-6 text-white/60">
							Connect your wallet to see suggestions you’ve sent and whether they’re public yet.
						</p>
					) : mine.isPending ? (
						<div className="mt-4 flex flex-col gap-3" aria-hidden>
							<span className="skeleton-shimmer block h-20 rounded-xl" />
							<span className="skeleton-shimmer block h-20 rounded-xl" />
						</div>
					) : projectMine.length === 0 ? (
						<p className="mt-3 text-sm text-white/60">Nothing sent for this project yet.</p>
					) : (
						<ul className="mt-4 flex flex-col gap-3">
							{projectMine.map((s) => {
								const Icon = STATUS_ICON[s.status];
								return (
									<li key={s.id} className="animate-rise rounded-xl border border-white/10 px-4 py-3">
										<p className={cn("flex items-center gap-1.5 text-xs", STATUS_TONE[s.status])}>
											<Icon className="size-3.5" aria-hidden /> {SUGGESTION_STATUS_LABEL[s.status]}
										</p>
										<p className="mt-1 font-medium break-words">{s.title}</p>
										{s.moderationNote && (
											<p className="mt-1 text-xs whitespace-pre-line text-white/55">Moderator: {s.moderationNote}</p>
										)}
										<p className="mt-1 text-xs text-white/45">{timeAgo(s.createdAt)}</p>
									</li>
								);
							})}
						</ul>
					)}
				</aside>
			</div>
		</div>
	);
}
