/** Brand copy and URLs for metadata and links (stellance-v3 `apps/landing/src/lib/site.ts` pattern). */
const SITE_NAME = "Chucksales";
const SITE_TAGLINE = "Community projects, funded on Stellar";
const SITE_DESCRIPTION =
	"Chucksales is a curated home for community projects. Builders submit ideas or existing projects for review, and the community discovers approved projects and supports them with transparent Stellar contributions and practical feedback.";
const SHARE_DESCRIPTION =
	"Discover reviewed community projects and support them with Stellar contributions you can verify on-chain.";

const SITE_KEYWORDS = [
	"Chucksales",
	"Stellar",
	"XLM",
	"USDC",
	"community funding",
	"crowdfunding",
	"open source funding",
	"public goods",
	"builders",
	"project funding",
];

/** Mirrors `--color-surface-900` in packages/ui globals.css (the landing's background). */
const THEME_COLOR = "#05070c";

/** TODO: the real handle once the account exists. */
const TWITTER_HANDLE = "@chucksales";

/** Read through next.config `env`, so client components agree with the server render. */
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

/** Absolute URL of this site: NEXT_PUBLIC_SITE_URL → the deployment URL on Vercel → localhost in dev. */
const SITE_URL = new URL(
	process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ?? "http://localhost:3002",
);

/**
 * The app (`apps/web`). Links into it are plain <a>s: a <Link> would route inside this landing app.
 * TODO: production host once the domain is chosen.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (IS_PRODUCTION ? "/app" : "http://localhost:3000");

const APP_LINKS = {
	projects: `${APP_URL}/projects`,
	submit: `${APP_URL}/builder/projects/new`,
	signUp: `${APP_URL}/builders/sign-up`,
	signIn: `${APP_URL}/builders/sign-in`,
	faq: `${APP_URL}/faq`,
	about: `${APP_URL}/about`,
	terms: `${APP_URL}/legal/terms`,
	privacy: `${APP_URL}/legal/privacy`,
	risk: `${APP_URL}/legal/risk`,
};

/** TODO: real profiles. */
const SOCIAL_LINKS = {
	x: "https://x.com/chucksales",
	discord: "https://discord.gg/",
	telegram: "https://t.me/",
};

export {
	SITE_NAME,
	SITE_TAGLINE,
	SITE_DESCRIPTION,
	SHARE_DESCRIPTION,
	SITE_KEYWORDS,
	THEME_COLOR,
	TWITTER_HANDLE,
	SITE_URL,
	APP_URL,
	APP_LINKS,
	SOCIAL_LINKS,
};
