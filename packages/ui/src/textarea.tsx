import * as React from "react";

import { cn } from "./lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"focus-visible:border focus-visible:ring-none aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full border px-3 py-2 transition-[color,box-shadow] focus-visible:ring-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-none focus outline-none focus:border-primary-500/80 rounded-[6px] text-base border-neutral-800 font-medium placeholder:text-xs placeholder:text-neutral-700 h-[120px] focus:shadow-md focus:shadow-primary-500/30 caret-primary-500 md:h-[200px] sm:text-base sm:py-4 bg-white resize-none placeholder:italic",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
