import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";
import BtnLoader from "./btn-loader";

/**
 * Chucksales buttons (landing + auth designs): 8px radius, Roboto regular, periwinkle primary.
 * `isLoading` swaps the label for the dot-ring loader (A3) and keeps the button's width, so layouts don't jump.
 */
const buttonVariants = cva(
	"relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-normal transition-[background-color,border-color,color,opacity,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900 aria-invalid:ring-error-400/40 cursor-pointer",
	{
		variants: {
			variant: {
				default: "bg-primary-500 text-white hover:bg-primary-600",
				destructive: "bg-error-400 text-white hover:bg-error-500",
				outline: "border border-primary-500 text-primary-400 hover:bg-primary-500/10",
				secondary: "bg-[#454a54] text-white hover:bg-[#525866]",
				ghost: "text-white/90 hover:bg-white/10",
				light: "bg-white text-primary-500 hover:bg-primary-50",
				link: "text-primary-400 underline-offset-4 hover:underline",
			},
			size: {
				default: "w-full h-12 px-4 lg:h-[52px]",
				sm: "h-10 px-4 text-sm",
				md: "h-11 px-5 text-sm",
				lg: "h-14 px-6 text-lg",
				icon: "size-10",
				"icon-sm": "size-8",
				"icon-lg": "size-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant,
	size,
	isLoading = false,
	loadingLabel,
	asChild = false,
	children,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		isLoading?: boolean;
		/** Announced to screen readers while loading ("Verifying code"). */
		loadingLabel?: string;
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }), isLoading && "cursor-wait disabled:opacity-100")}
			{...props}
			// After the spread: a loading button is always disabled (no double submits), whatever `disabled` says.
			disabled={isLoading || props.disabled}
			aria-busy={isLoading || undefined}
		>
			{isLoading && !asChild ? (
				<>
					{/* Keeps the label's width; the loader sits on top (design A3: dark dots on periwinkle). */}
					<span className="invisible inline-flex items-center gap-2">{children}</span>
					<BtnLoader
						className={cn("absolute size-6", !variant || variant === "default" ? "text-[#1c2340]" : "text-current")}
						label={loadingLabel}
					/>
				</>
			) : (
				children
			)}
		</Comp>
	);
}

export { Button, buttonVariants };
