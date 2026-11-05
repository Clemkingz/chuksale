/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// 1. Generic Combobox Component
// components/ui/custom/Combobox.tsx
// ============================================
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "./lib/utils";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxOption {
	value: string;
	label: string;
	[key: string]: any; // Allow additional properties
}

interface ComboboxProps {
	options: ComboboxOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	error?: string | null;
	disabled?: boolean;
	className?: string;
	renderOption?: (option: ComboboxOption) => React.ReactNode;
}

export function Combobox({
	options,
	value,
	onChange,
	placeholder = "Select option...",
	searchPlaceholder = "Search...",
	emptyText = "No results found.",
	error,
	disabled,
	className,
	renderOption,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);

	const selectedOption = options.find((option) => option.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"w-full justify-between shadow-none focus outline-none focus:border-primary-500/80 border-neutral-800 rounded-[6px] text-base font-medium placeholder:text-xs placeholder:text-neutral-700 h-[43px] focus:shadow-md focus:shadow-primary-500/30 caret-primary-500 md:h-12 sm:text-base sm:py-4",
						!value && "text-muted-foreground",
						error && "border-red-600 focus-visible:ring-red-600",
						className,
					)}
				>
					{selectedOption?.label || placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder} className="h-9" />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.value}
									keywords={[option.label, option.value]}
									onSelect={() => {
										// ✅ FIX: Use option.value directly instead of currentValue
										// CommandItem lowercases the currentValue, causing mismatch
										onChange(option.value === value ? "" : option.value);
										setOpen(false);
									}}
								>
									{renderOption ? renderOption(option) : option.label}
									<Check className={cn("ml-auto h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
