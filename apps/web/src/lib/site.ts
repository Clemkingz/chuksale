/** Brand copy for metadata. */
const SITE_NAME = "Chucksales";
const SITE_TAGLINE = "Community projects, funded on Stellar";
const SITE_DESCRIPTION =
	"Discover reviewed community projects and support them with Stellar contributions you can verify on-chain. Builders submit projects, get feedback, and track their funding.";
const SHARE_DESCRIPTION = "Support reviewed community projects with Stellar contributions you can verify on-chain.";

const SITE_KEYWORDS = ["Chucksales", "Stellar", "XLM", "USDC", "community funding", "crowdfunding", "public goods", "builders"];

/** TODO: the real handle once the account exists. */
const TWITTER_HANDLE = "@chucksales";

/** FAQ "Got any other questions?". TODO: the real support channel. */
const SUPPORT_TELEGRAM_URL = "https://t.me/chucksales";

/** Mirrors `--color-surface-900` in packages/ui globals.css. */
const THEME_COLOR = "#05070c";

const ORIGIN =
	process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ?? "http://localhost:3000";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix app-local assets when this app is mounted below the site root (previews). */
function withBasePath(src: string) {
	return BASE_PATH && src.startsWith("/") && !src.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${src}` : src;
}

const SITE_URL = new URL(`${BASE_PATH}/`, ORIGIN);

/** Mounted under a base path = deployed with Vercel Services (one domain: landing `/`, web `/app`, admin `/admin`). */
const ON_SHARED_DOMAIN = BASE_PATH !== "";

/** The landing site (apps/landing, the domain root). Link to it with a plain <a>. */
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? (ON_SHARED_DOMAIN ? "" : "http://localhost:3002");

/** The admin console (apps/admin, under /admin). Link to it with a plain <a>. */
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? (ON_SHARED_DOMAIN ? "/admin" : "http://localhost:3001");

export {
	SITE_NAME,
	SITE_TAGLINE,
	SITE_DESCRIPTION,
	SHARE_DESCRIPTION,
	SITE_KEYWORDS,
	TWITTER_HANDLE,
	SUPPORT_TELEGRAM_URL,
	THEME_COLOR,
	SITE_URL,
	BASE_PATH,
	withBasePath,
	ADMIN_URL,
	LANDING_URL,
};
