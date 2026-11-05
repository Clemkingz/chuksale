/** Admin console routes (PRD §19's /admin/* paths, served at the root of the admin app). */
export const routes = {
	signIn: "/sign-in",
	overview: "/",
	projects: "/projects",
	project: (id: string) => `/projects/${id}`,
	builders: "/builders",
	builder: (id: string) => `/builders/${id}`,
	contributors: "/contributors",
	contributor: (address: string) => `/contributors/${address}`,
	suggestions: "/suggestions",
	suggestion: (id: string) => `/suggestions/${id}`,
	contributions: "/contributions",
	categories: "/categories",
	auditLog: "/audit-log",
	settings: "/settings",
} as const;
