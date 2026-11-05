"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
	const [value, setValue] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia(query);
		const handler = () => setValue(mediaQuery.matches);

		// Set initial value
		handler();

		// Listen for changes
		mediaQuery.addEventListener("change", handler);

		return () => mediaQuery.removeEventListener("change", handler);
	}, [query]);

	return value;
}
