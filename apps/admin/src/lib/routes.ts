/** Admin console routes (PRD §19's /admin/* paths, served at the root of the admin app). */
export const routes = {
	signIn: "/sign-in",
	overview: "/",
	projects: "/projects",
	project: (id: string) => `/projects/${id}`,
	builders: "/builders",
	contributors: "/contributors",
	suggestions: "/suggestions",
	suggestion: (id: string) => `/suggestions/${id}`,
	contributions: "/contributions",
	categories: "/categories",
	auditLog: "/audit-log",
	settings: "/settings",
} as const;
