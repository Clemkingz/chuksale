# Chucksales (Stellar Community Project Platform)

Builders submit projects → admins review → the community discovers approved projects and supports them with
Stellar Testnet contributions and moderated suggestions. **Frontend only, mock data, real Stellar wallet.**
Plan and progress: `docs/PLAN.md`. PRD §17 assumptions: `docs/DECISIONS.md` (don't invent product rules; add
them there as PENDING). API contract the mock implements: `docs/API.md`. Structure mirrors
`usestellance/stellance-v3`; when in doubt about a convention, check how it did it.

## Monorepo

Turborepo + pnpm, Node ≥ 22.

```
apps/landing/        (:3002) public marketing site (design: dark, periwinkle; copy in features/landing/content.ts)
apps/web/            (:3000) public site, contributor flows, builder area (/builders/* auth, /builder/* app)
apps/admin/          (:3001) admin console (PRD /admin/* routes at its root)
packages/domain/     @repo/domain: shared types, project state machine, contribution lifecycle, money, labels
packages/mock-api/   @repo/mock-api: in-browser backend (axios adapter + router + localStorage DB + seed)
packages/ui/         @repo/ui: tokens, shadcn components, motion
packages/eslint-config, packages/typescript-config
```

`pnpm dev` · `pnpm build` · `pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm format` (tabs, width 130).

## Data

- Mock is the **default** (`lib/api/source.ts`); `NEXT_PUBLIC_API_SOURCE=live` later. Hooks call axios; in mock mode
  the adapter answers in the browser with the same envelopes and errors as `docs/API.md`.
- Demo accounts: `builder@demo.local` / `Password1`, `admin@demo.local` / `Password1`. Mock mode: any 6-digit code works;
  admin sign-in accepts any email/password (→ demo admin, restored if it was suspended/deleted) and has a one-click
  "Continue as demo admin" (`POST /mock/admin/session`).
- Mock DB: one JSON doc in localStorage `csp-mock-db`; bump `VERSION` in `db.ts` when its shape changes.
- Web clients: `api` (public) and `builderApi` (adds builder token) in `lib/api/client.ts`. Admin: `api` in its own client.
- Contributors have **no account**: their identity is the connected wallet (`features/wallet/store.ts`).

## Simulating (mock mode)

- **Demo panel** (bottom-left, `features/dev/DemoControls.tsx`, mock only): demo-wallet outcome (connects / declines /
  not installed / wrong network / slow), demo payment outcome (confirms / fails / slow), slow network (≈3 s per request, to see loaders), "Simulate outage" (every
  request 503s until switched off, to see error states), push a notification, preview toasts, reset demo data.
  Settings live in `@repo/mock-api/controls` (localStorage `csp-mock-controls`).
- **Demo wallet**: a simulated wallet row in the Connect Wallet dialog (mock only), no extension needed. Its payments
  are simulated; real wallets send real Testnet payments that the mock verifies on Horizon.
- **Mock data is per app** (D26): web and admin are different origins, so each has its own `csp-mock-db`.
- **Demo inbox**: codes the mock "emails" appear as a toast (`notify.demoInbox`). The mock accepts **any 6-digit code**.

## App UI patterns (web)

- Loading: `app/loading.tsx` / group `loading.tsx` render `BrandLoader`; lists use `skeleton-shimmer` placeholders;
  buttons take `isLoading` (dot-ring loader from design A3, `@repo/ui/btn-loader`) + `loadingLabel`.
- Errors: `error.tsx` (retry), `global-error.tsx`, `not-found.tsx`; inside pages use `ErrorState` / `EmptyState`
  (`components/States.tsx`) and `errorMessage()` (`lib/api/errors.ts`).
- Toasts: always `notify.*` (`lib/use-toast.ts`); dark styling in `@repo/ui/sonner`; offset below the header.
- Wallet: `useRequireWallet()(action)` opens the dialog only when needed and resumes the action after connecting.
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

## Stellar (`apps/web/src/features/wallet`, `features/contributions`, `lib/stellar/config.ts`)

- Stellar Wallets Kit 2.x, loaded on first use (`kit.ts`, adapted from reference `payer-wallet`), Testnet-pinned.
  Varial (module id `freighter`) / xBull extensions, Albedo, LOBSTR + Varial app over WalletConnect on phones.
- `stellar-tx.ts` builds a direct payment (D1) with the intent's reference as text memo; Horizon Testnet submits it;
  the mock verifies against Horizon before confirming.
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
