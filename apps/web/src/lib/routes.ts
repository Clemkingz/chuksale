/** Every web route in one place (PRD §19). Pages and links use these, never hand-written strings. */
export const routes = {
	home: "/",
	projects: "/projects",
	project: (slug: string) => `/projects/${slug}`,
	contribute: (slug: string) => `/projects/${slug}/contribute`,
	suggest: (slug: string) => `/projects/${slug}/suggest`,
	contribution: (id: string) => `/contributions/${id}`,
	/** Contributor page: the connected wallet's balance and everything it has sent. */
	wallet: "/wallet",
	faq: "/faq",
	about: "/about",
	terms: "/legal/terms",
	privacy: "/legal/privacy",
	risk: "/legal/risk",

	signUp: "/builders/sign-up",
	signIn: "/builders/sign-in",
	verifyEmail: "/builders/verify-email",
	forgotPassword: "/builders/forgot-password",
	resetPassword: "/builders/reset-password",

	dashboard: "/builder/dashboard",
	editProfile: "/builder/profile",
	newProject: "/builder/projects/new",
	builderProject: (id: string) => `/builder/projects/${id}`,
	editProject: (id: string) => `/builder/projects/${id}/edit`,
	previewProject: (id: string) => `/builder/projects/${id}/preview`,
	submitted: (id: string) => `/builder/projects/${id}/submitted`,
	notifications: "/notifications",
} as const;
