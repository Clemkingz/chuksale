"use client";

import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import BtnLoader from "./btn-loader";

/**
 * Toasts in the Chucksales dark style: #131318 card, thin border, coloured icon per kind, the dot-ring loader for
 * `toast.loading` / `toast.promise` (e.g. "Waiting for your wallet…").
 */
const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-5 text-success-200" />,
				info: <InfoIcon className="size-5 text-primary-400" />,
				warning: <TriangleAlertIcon className="size-5 text-warning-400" />,
				error: <OctagonXIcon className="size-5 text-error-300" />,
				loading: <BtnLoader className="size-5 text-primary-400" />,
			}}
			toastOptions={{
				classNames: {
					toast:
						"!bg-[#131318] !border !border-white/10 !text-white !rounded-xl !shadow-[0_16px_40px_rgba(0,0,0,0.45)] !font-sans !gap-3",
					title: "!text-[15px] !font-medium",
					description: "!text-white/65 !text-sm",
					actionButton: "!bg-primary-500 !text-white !rounded-md",
					cancelButton: "!bg-white/10 !text-white !rounded-md",
					closeButton: "!bg-[#131318] !border-white/15 !text-white/70",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
export { toast } from "sonner";
