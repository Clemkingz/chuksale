# Chucksales (Stellar Community Project Platform)

Builders submit projects → admins review → the community discovers approved projects and supports them with
Stellar Testnet contributions and moderated suggestions. **Frontend for the ChuckSales API** (staging:
`https://chucksale-backend.onrender.com/api/v1`, spec at `/docs-json`), with an opt-in in-browser mock.
Plan and progress: `docs/PLAN.md`. PRD §17 assumptions: `docs/DECISIONS.md` (don't invent product rules; add
them there as PENDING). How the apps use the API: `docs/API.md`. Structure mirrors
`usestellance/stellance-v3`; when in doubt about a convention, check how it did it.

## Monorepo

Turborepo + pnpm, Node ≥ 22.

```
apps/landing/        (:3002) public marketing site (design: dark, periwinkle; copy in features/landing/content.ts)
apps/web/            (:3000) public site, contributor flows, builder area (/builders/* auth, /builder/* app)
apps/admin/          (:3001) admin console (PRD /admin/* routes at its root)
packages/domain/     @repo/domain: the API contract types, project action rules, contribution status, money, labels
packages/api/        @repo/api: axios clients (account + refresh, wallet, public), token stores, error helpers
packages/mock-api/   @repo/mock-api: opt-in in-browser backend speaking the same contract (adapter + router + DB + seed)
packages/ui/         @repo/ui: tokens, shadcn components, motion
packages/eslint-config, packages/typescript-config
```

Deploy: one Vercel project with Services (`vercel.json`): landing at `/`, web at `/app`, admin at `/admin`. On Vercel
(`VERCEL=1`) web and admin build with that basePath; plain `pnpm dev` keeps them at the root of :3000 / :3001. Own-file
`<img>`/`<a>` paths go through `withBasePath()`; cross-app links use `LANDING_URL` / `ADMIN_URL` / `APP_URL` / `WEB_URL`.

`pnpm dev` · `pnpm build` · `pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm format` (tabs, width 130).

## Data

- **Live is the default** (`lib/api/source.ts`): the browser calls `NEXT_PUBLIC_API_URL` directly (the API rate-limits
  per client IP: never proxy it through Next.js). `NEXT_PUBLIC_API_SOURCE=mock` swaps in the mock adapter.
- Types: `@repo/domain/types` is the backend contract (OpenAPI `/docs-json`). Update it from the spec, never by guess;
  call only documented routes, send only documented fields (unknown fields are 400).
- Clients (`@repo/api/client`): `builderApi` / admin `api` add the access token and refresh once on 401 (single flight;
  refresh tokens are single use), except on login/register/verify/refresh/logout. `walletApi` adds the wallet token;
  a 401 there ends the wallet session. `api` (web) is public. 70 s timeout (staging sleeps when idle).
- Tokens: access token in memory; refresh token in localStorage `chucksales.<app>.refreshToken`; wallet session in
  `chucksales.walletToken` (12 h, SEP-10 challenge → signed → verify). Builder and admin tokens never mix; the web app
  refuses admin logins and the console refuses builder logins.
- Errors: `errorMessage()` / `detailsByField()` (`lib/api/errors.ts`) read `{ message, error: { details[] } }`; show
  `details` beside form fields. 429 → Retry-After; 503 → "try again shortly".
- Lists are `{ result, paginationMeta }` with `limit` (≤100) + `offset`. Amounts are decimal strings per asset id
  (`XLM`, `USDC:<issuer>`); never add assets together. Assets and explorer come from `GET /stellar/network`.
- Staging: emails aren't sent (verification/reset codes come from the backend owner); CORS allows only localhost
  :3000–3002 until other origins are added on the backend.
- Contributors have **no account**: their identity is the signed-in wallet (`features/wallet/store.ts`). Their inbox is `/wallet/notifications` (wallet token); the bell and /notifications show both inboxes.

## Simulating (mock mode, `NEXT_PUBLIC_API_SOURCE=mock`)

- Demo accounts: `builder@demo.local` / `Password1`, `admin@demo.local` / `Password1`; any 6-digit code verifies;
  the console has "Continue as demo admin" (`POST /mock/admin/session`). Access tokens last 15 min, so refresh runs.
- **Demo panel** (bottom-left, `features/dev/DemoControls.tsx`): demo-wallet outcome, demo payment outcome (confirms /
  fails / slow), slow network, "Simulate outage" (503s), push a notification, preview toasts, reset demo data.
- **Demo wallet**: the only wallet that can sign in mock mode (its signature is a `demo-signed:` marker). Real wallets
  work against the live API.
- Mock DB: one JSON doc in localStorage `csp-mock-db` (`records.ts`); bump `VERSION` in `db.ts` when its shape changes.
  Web and admin mirror it to each other through a hidden `/mock-bridge` iframe (different origins locally).

## App UI patterns (web)

- Loading: `app/loading.tsx` / group `loading.tsx` render `BrandLoader`; lists use `skeleton-shimmer` placeholders;
  buttons take `isLoading` (dot-ring loader from design A3, `@repo/ui/btn-loader`) + `loadingLabel`.
- Errors: `error.tsx` (retry), `global-error.tsx`, `not-found.tsx`; inside pages use `ErrorState` / `EmptyState`
  (`components/States.tsx`) and `errorMessage()` (`lib/api/errors.ts`).
- Toasts: always `notify.*` (`lib/use-toast.ts`); dark styling in `@repo/ui/sonner`; offset below the header.
- Wallet: `useRequireWallet()(action)` opens the dialog only when needed and resumes the action after connecting.
- Back links: `<BackLink href label>` (`components/BackLink.tsx`) at the top of every inner page, to its parent.
- Images: `<ImageUpload>` (`components/ImageUpload.tsx`) for every upload route (one multipart part, 5 MB).
- Motion: `animate-page` per route (`template.tsx`), `animate-rise` with `--i` for lists, `animate-pop` for settled
  results, `animate-signal` while waiting on a wallet, `animate-shake` for a wrong code. All off for reduced motion.
- **Scroll animation on every page (all apps, every new page).** `@repo/ui/scroll-reveal` is mounted in each root
  layout (`<ScrollRevealScript />` in `<head>`, `<ScrollReveal />` in `<body>`); pages only add attributes:
  `data-reveal="up|down|left|right|zoom|fade"` (+ `style={{ "--d": n }}` to stagger) on sections/cards/images below
  the fold, `data-progress` → `var(--progress)` for timelines, `data-parallax="0.3"` for one hero background, and
  `<CountUp value>` (`@repo/ui/count-up`) for stats. Above-the-fold content keeps `animate-rise`/`animate-page`.
  Items that load later (infinite lists, client navigation) are picked up automatically.

## Domain rules

- Status changes only through `transition()` (`@repo/domain/project-status`). Public = `isPubliclyVisible()`.
- Only `confirmed` contributions count (`countsTowardTotal`). Pending is never shown as funded; a closed wallet popup
  is never success. "Outcome unknown" submits are never retried.
- Money: decimal strings + `@repo/domain/money`. Never floats.
- Labels for statuses come from `@repo/domain/labels`; components don't invent copy for them.
- Copy: "Contribute" / "Support this project". Never "invest", "returns", "escrow".

## Stellar (`apps/web/src/features/wallet`, `features/contributions`, `lib/stellar/network.ts`)

- Stellar Wallets Kit 2.x, loaded on first use (`kit.ts`, adapted from reference `payer-wallet`), Testnet-pinned.
  Varial (module id `freighter`) / xBull extensions, Albedo, LOBSTR + Varial app over WalletConnect on phones.
- Contributing: `POST /projects/{slug}/contributions` prepares the payment (API checks asset, trustline, balance) →
  the wallet signs `transaction` with its `networkPassphrase` → `POST /contributions/{id}/submit` → poll while pending.
  A closed wallet popup is never success; a lost submit response goes to the status page (never resend).
- Never ask for, log, or store a secret key.

## Design system (`packages/ui`)

Tokens in `src/styles/globals.css`: `primary-50…700` (`primary-500` #688CEC), dark `surface-900…500` (#05070C page,
#161626/#171821 cards, #1E2030 icon tiles), plus the reference's status scales. Fonts: Roboto body (each app loads it
with `next/font` as `--font-roboto`; `font-sans`), SF Pro Display for headings (`font-display`, a system-font stack:
Apple's licence forbids self-hosting it). The shared `body` rule is unlayered, so an app that needs a different body
background overrides it with an unlayered rule in its own globals.css, not a class on `<body>`.

## Metadata (as in stellance-v3)

Each app has `favicon.ico` + `apple-icon.png` in `src/app`, `opengraph-image.tsx` (+ `twitter-image.tsx` re-export)
drawn by `@repo/ui/og-card` with the static Roboto TTFs in `packages/ui/src/assets/fonts/static`, and `robots.ts`
(landing allows and has `sitemap.ts`; web and admin disallow). Web has `manifest.ts` + `public/icons`. Read files in
OG routes with literal `join(process.cwd(), "…")` paths, and pass PNG/JPEG data URLs: the renderer can't read WebP.
Design exports live in `packages/ui/src/assets/images` (full size); apps ship resized WebP copies in `public/images`.

## Conventions (from stellance-v3)

- Feature folders: `src/features/<domain>/{components/, hooks.ts, schema.ts, types.ts, store.ts}`. `src/app/**` pages
  stay thin. Layout pieces in `src/components/layouts`, providers in `src/components/providers`.
- Imports: `@/…` inside an app, `@repo/ui/…`, `@repo/domain/…`. Named exports for components; route files default.
- App images in that app's `public/images`; shared fonts in `packages/ui/src/assets`.
- Every `<form>` using `form.handleSubmit` needs `noValidate`. A component using `useSearchParams` needs `<Suspense>`.
- Never `setState` synchronously in `useEffect`; never read `ref.current` during render.
- Flex children holding tables/long text need `min-w-0`.

## Landmines

1. pnpm strict linking: a package imported in a file must be a dependency of _that_ workspace package. `next/*`
   stays in apps, never `@repo/ui`.
2. Restart the dev server after `pnpm install`. Stale TS errors after tsconfig changes: delete `*.tsbuildinfo`.
3. New dependency with build scripts → `allowBuilds` in `pnpm-workspace.yaml`.
4. Don't `next build` into `.next` while dev runs: `NEXT_DIST_DIR=.next-verify npx next build`.
5. Next 16: error boundaries get `retry()`; route params are Promises (`PageProps<"/route/[id]">`).
6. Keep all `@radix-ui/*` on the same release; `recharts` stays 2.x.
