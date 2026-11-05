"use client";

import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface SelectProps {
	name: string;
	label?: string;
	placeholder?: string;
	value?: string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	readOnly?: boolean;
	error?: string | null;
	description?: string;
	options: { label: string; value: string }[];
	className?: string;
}

const SelectField: React.FC<SelectProps> = ({
	name,
	label,
	placeholder = "Select an option",
	value,
	onChange,
	disabled,
	readOnly,
	error,
	description,
	options,
	className = "",
}) => {
	return (
		<div className="space-y-2">
			{label && (
				<Label htmlFor={name} className="text-sm font-medium">
					{label}
				</Label>
			)}

			{description && <p className="text-sm text-muted-foreground">{description}</p>}

			<Select onValueChange={onChange} value={value} disabled={disabled || readOnly}>
				<SelectTrigger
					id={name}
					className={`
            h-[43px] md:h-12
            rounded-[6px]
            shadow-none
            border-neutral-800
            text-base font-medium
            placeholder:text-xs
            placeholder:text-neutral-700
            caret-primary-500
            bg-white
            focus:border-primary-500/80
            focus:shadow-md focus:shadow-primary-500/30
            transition-all
            ${error ? "border-error-400 text-error-400" : ""}
            ${readOnly ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}
            ${className}
          `}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>

				<SelectContent className="w-full">
					{options.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};

export default SelectField;
