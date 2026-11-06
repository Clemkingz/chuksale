# Build plan: Stellar Community Project Platform (frontend, mock data)

Source: `Stellar_Community_Project_Platform_PRD.pdf` (v1.0, 4 Nov 2026). Structure: `usestellance/stellance-v3`.

**Scope of this build:** the full frontend for every P0 flow (and the P1 ones that are cheap) against an
in-browser mock backend, with a **real** Stellar wallet integration (Stellar Wallets Kit + `@stellar/stellar-sdk`
on Testnet). No real backend, no mainnet. A real API can later replace the mock without touching hooks, because
the mock answers the exact contract in `docs/API.md`.

Supporting docs: `docs/DECISIONS.md` (PRD §17 assumptions; read first), `docs/API.md` (contract), `CLAUDE.md`
(conventions).

---

## 0. What exists now (done)

- [x] Turborepo + pnpm monorepo, same layout and tooling as stellance-v3 (Next 16, React 19, Tailwind v4, React
      Compiler, TanStack Query, zustand, react-hook-form + zod, shadcn in `@repo/ui`).
- [x] `apps/web` (:3000): every PRD §19 route + sub-screens as placeholders (route groups `(public)`, `builders/`,
      `builder/`). `apps/admin` (:3001): every console route as a placeholder.
- [x] `packages/ui`: reference shadcn components; tokens are **placeholders** until the design lands.
- [x] `packages/domain` (new): shared types (PRD §9), **project state machine**, contribution lifecycle, exact
      money math (BigInt stroops), status labels. 10 unit tests passing.
- [x] `packages/mock-api`: router + axios adapter + localStorage DB copied from the reference; new DB shape, a
      minimal seed, handler stubs. **Mock is the default data source.**
- [x] Wallet layer adapted from reference `payer-wallet`: `features/wallet/{kit,device,store}.ts` (Varial/Freighter,
      xBull, Albedo, LOBSTR via WalletConnect; Testnet-pinned, network-mismatch check).
- [x] `features/contributions/stellar-tx.ts`: builds/submits a direct payment with memo, trustline + balance checks,
      Horizon error mapping, "outcome unknown" never retried.
- [x] Builder + admin session stores and client-side route guards.
- [x] `pnpm check-types` and `pnpm lint` are clean, and every route returns 200 in dev.

---

## Status (6 Nov 2026): connected to the ChuckSales API

- Web and admin call the live API by default (`NEXT_PUBLIC_API_URL`, staging on Render); the mock is opt-in
  (`NEXT_PUBLIC_API_SOURCE=mock`) and speaks the same contract. See `docs/API.md`.
- UI trimmed to what the API has (logos, time left, avatars, socials, wallet notifications, updates, Google sign-in,
  admin MFA and extra admin profile fields removed). Settled decisions are listed at the end of `docs/DECISIONS.md`.
- Verified: type-check, lint and unit tests (domain + mock contract tests); live smoke test (public pages, sign-in
  errors, guards, wallet dialog); mock end-to-end journeys for contributor, builder and admin.
- Open: Vercel origins must be added to the backend's CORS list; staging codes come from the backend owner.

## Status (5 Nov 2026)

Every PRD page now exists and runs on the mock backend:

- **Web**: Home, Explore, Project details (contributions / suggestions / updates tabs, sticky funding panel), Contribute
  (Amount → Review → Sign; real Testnet wallets or the Demo wallet), Contribution status (polls, receipt), Suggest +
  report, **My wallet** (contributor page: live balance, totals, monthly chart, per-project split, history + receipt
  panel), FAQ, About, Terms, Privacy, Risk, Notifications, builder auth, Dashboard, Add Project, Edit Profile, project
  status / edit + resubmit / preview / submitted.
- **Admin**: sign-in (password + code), Dashboard, Projects (review actions), Project detail, Builders + detail,
  Contributors + wallet detail (live balance), Suggestions moderation + detail, Contributions monitor, Categories,
  Audit log, Account settings.
- **Tests**: `pnpm test` (domain rules + 15 mock-backend rule tests: roles, owner checks, visibility, idempotent
  submits, confirmed-only totals, moderation, rate limits, state machine). Browser journeys were run headless
  against `pnpm dev` (contributor, builder, admin, and a 24-route sweep at 390 px and 1440 px).

Still open: Playwright suite checked into the repo (Phase 7.8), milestone updates authoring (P1), platform settings and
admin users/roles (P1), analytics events (Phase 7.4).

## Phase 1: Design system + shell + auth

**Done so far (4 Nov 2026):** `apps/landing` built from the landing design (copy rewritten for the PRD), tokens
(primary, surfaces, Roboto + SF Pro Display), favicons/OG images/robots/manifest for all three apps. Remaining:
steps 3–8 below for web and admin, as their screenshots arrive.

**Also done (4 Nov 2026):** web app shell (header with bell + wallet, footer), Connect Wallet dialog (Stellar wallets

- demo wallet), Notifications page, builder auth A1–A4 (sign up → email code → session, sign in, Google (mock),
  forgot/reset), loaders/errors/404/toasts/motion, Demo panel, mock auth + notifications handlers. Admin sign-in
  UI is still to do (handlers documented, not built).

_Input needed from you: the reference design screenshots and assets._

1. **Tokens** in `packages/ui/src/styles/globals.css`: replace the placeholder palette with the design's values,
   keeping token names (`primary-*`, `neutral-*`, `success/error/warning/info-*`, `black-*`). Add the font to
   `packages/ui/src/assets/fonts` + `@font-face`, and set `--font-sans`. Update `THEME_COLOR` in `lib/site.ts`.
2. **Assets**: logo → `apps/*/public/images` + `components/Logo.tsx`; favicon/apple-icon → `src/app/`; illustrations
   and empty states → `public/images`.
3. **Restyle the shadcn primitives** in `@repo/ui` to match (button variants, input, select, dialog, sheet/drawer,
   tabs, badge, card, skeleton, pagination). Add missing ones: `badge`, `progress`, `radio-group`, `stepper`.
4. **Shared components** (`apps/web/src/components`): `Logo`, `SiteHeader` (nav, "Submit a project", wallet slot,
   mobile sheet menu), `SiteFooter`, `StatusBadge` (project and funding statuses look **distinct**, PRD §13),
   `EmptyState`, `ErrorState`, `PageLoading`, `CopyField`, `ExplorerLink`, `AddressChip` (short address + copy +
   explorer). Admin: `AdminShell` with `@repo/ui/sidebar`.
5. **Mock auth handlers** (`handlers/auth.ts`): signup, verify-email, login, forgot/reset, me; admin login → MFA.
6. **Builder auth screens**: sign-up, verification sent/verify, sign-in, forgot, reset. zod schemas in
   `features/builder-auth/schema.ts`, hooks in `hooks.ts`. "Reset demo data" + demo credentials note in mock mode.
7. **Admin sign-in**: email/password → OTP step (`@repo/ui/input-otp`).
8. **Tests**: mock handler tests (vitest) proving a builder token gets 403 on `/admin/*`, and that a builder
   gets 403 on another builder's project (PRD §18 rule 2).

**Exit:** builder and admin can sign in/out; guarded routes redirect; role protection tested.

## Phase 2: Project lifecycle (builder + admin review)

1. **Seed** ~12 projects across **every** status, both types, all categories; reviews with reasons/internal
   notes; revisions; audit entries.
2. **Mock handlers**: `builder.ts` (CRUD drafts, submit, revisions, owner checks, field-level 422s) and
   `admin.ts` (queue, detail, decision, visibility, feature, archive, audit, stats). **Every status change goes
   through `transition()`** from `@repo/domain/project-status`.
3. **Builder dashboard**: project cards with status, CTAs per status, recent feedback; empty state.
4. **Create Project wizard** (`features/builder/components/wizard/`): steps → Type (New idea / Existing) → Details
   (name, summary, problem, solution, category, stage, beneficiaries) → Funding (toggle, target, asset,
   destination address with G-key validation) → Links & team → Media (cover image upload, type/size checks) →
   Review. Autosave draft per step (FR-PROJ-04); per-field errors (FR-PROJ-03); mobile = one step per screen.
5. **Preview** page renders the real public `ProjectDetail` component with the draft's data.
6. **Submitted** confirmation + **Project status detail** (timeline of status + admin's reason).
7. **Edit / respond to changes**: only when `isBuilderEditable`; shows the admin feedback alongside the form;
   resubmit creates a revision.
8. **Admin review queue**: `@tanstack/react-table`, status tabs, search, sort, pagination (FR-REV-01).
9. **Admin review detail**: all fields, links, owner, revisions diff, previous decisions, internal notes; action
   bar (Mark under review / Approve / Request changes / Reject) with a dialog where **reason is required** for
   reject/changes (FR-REV-03).
10. **Admin overview**: pending count, recent decisions, reports, tx alerts (`@repo/ui/chart` optional).
11. **Audit log** page (read-only table, before/after JSON view).

**Exit:** draft → submit → admin request changes → builder resubmits → admin approves, end to end. Invalid
transitions are rejected (tested).

## Phase 3: Public discovery

1. **Mock `projects.ts`**: list/featured/detail/categories; **one filter** `isPubliclyVisible()` used by every
   public handler; public DTO strips owner email, status and internal notes.
2. **Home**: hero, how it works (submit → review → support), featured projects, categories, stats, CTAs.
3. **Explore** `/projects`: search (debounced, URL query params), filters (category, stage, funding status), sort,
   pagination, `ProjectCard` (cover, category, stage, progress, raised/target per asset), skeletons, empty state.
   `useSearchParams` needs a `<Suspense>` boundary.
4. **Project details**: header, summary/problem/solution, team, links, `FundingPanel` (target, confirmed raised,
   progress, contributor count, **sticky Contribute CTA on mobile**), tabs (Updates · Suggestions ·
   Contributions), share button, "approval isn't a guarantee" note.
5. **Static pages**: About, FAQ (accordion), Terms, Privacy (public wallet address notice), Risk disclosure.
6. Metadata per project page (`generateMetadata`: title, description).

**Exit:** only approved + published projects appear or resolve; unpublished/draft slugs 404 (tested).

## Phase 4: Stellar wallet

1. `ConnectWalletButton` in the header: disconnected → "Connect wallet"; connected → `AddressChip` + network
   badge + menu (copy, explorer, disconnect).
2. `ConnectWalletDialog` (Dialog on desktop, Drawer on mobile): wallet list from `WALLETS` with `walletKind()`, "why
   connect" + safety copy ("we never ask for your secret key"), states: idle / connecting / not installed (install
   link via `installLink()`) / app missed on phone ("Open again") / wrong network / error / connected.
   Port the UX logic from reference `PayWithWallet.tsx` (315 lines).
3. `useRequireWallet()` hook: opens the dialog when an action needs a wallet and resumes the action afterwards
   (PRD §6.4 step 6: wallet requested only at the action).
4. `preloadWallets()` on hover/focus of contribute/suggest CTAs.
5. **Testnet setup doc** in README: install Freighter/Varial, switch to Testnet, Friendbot funding, USDC trustline.
6. Tests: wallet store expiry; error-message mapping (`walletErrorMessage`, `isWalletDismissal`).

**Exit:** connect/disconnect works with a real Testnet wallet; wrong network is a clear blocking state.

## Phase 5: Contributions

1. **Mock `contributions.ts`**: intents (reference memo `CSP-XXXXXX`, 15-min expiry, amount/asset/project
   validation), submit hash (idempotent), **Horizon verification**, status read, simulate scenarios,
   `settleContributions()` (expire intents, advance simulations). Raised totals computed from confirmed only.
2. **Seed destination**: `NEXT_PUBLIC_DEMO_DESTINATION` (a funded Testnet account) so real contributions succeed.
3. **Contribute flow** `/projects/[slug]/contribute` (stepper, `features/contributions/components/`):
   1. Amount: asset picker (code + issuer shown), amount input (7-dp validation via `isValidAmount`, min D12),
      quick amounts, current confirmed total.
   2. Review: project, amount, asset + issuer, destination, network, estimated fee, memo, "public on-chain" notice,
      "the platform doesn't hold funds / no refunds" (D1, D4).
   3. Sign: create intent → `buildContributionTx` → `signWithWallet` → `submitContributionTx` → submit hash.
   4. Result → `/contributions/[id]`.
4. **Transaction status page**: Pending (polls every 4 s) / Confirmed (receipt, hash, explorer) / Failed (reason,
   safe retry = new intent) / Expired / "outcome unknown" (check status, never resubmit). **Never show success
   because a popup closed** (PRD §13).
5. Error recovery UI for: no wallet, rejected signature, wrong network, inactive account, no trustline,
   insufficient balance, Horizon down, tx failed, confirmation delayed.
6. **Contribution history** tab on project page (confirmed only, short addresses, explorer links).
7. **Mock-mode "Simulate" panel** (like reference `PaymentSimulator`) to demo every state without a wallet.
8. **Admin contributions monitor**: all intents/contributions, status filters, reconciliation flag, re-verify.
9. Tests: idempotent submit (same hash twice ⇒ counted once), totals from confirmed only, amount precision,
   wrong destination/amount/memo ⇒ failed.

**Exit:** a real Testnet contribution reconciles exactly once and updates the total.

## Phase 6: Suggestions + moderation

1. **Mock `suggestions.ts`**: create (sanitize, length rules, wallet required, 3/hour per wallet ⇒ 429), public
   list (published only), "mine", reports.
2. **Suggestion form** `/projects/[slug]/suggest`: type, title, body, optional link, wallet attribution line;
   confirmation explaining moderation (D8); "my suggestions" with status while the wallet is connected.
3. Suggestions tab on project page + Report action.
4. **Admin moderation**: queue (Pending / Reported / All), detail (text, project, wallet, reports), Publish / Hide
   / Reject with reason; audit entries.
5. Builder project overview shows its published suggestions.
6. Tests: pending suggestions never in the public list; rate limit; XSS payload renders as text.

**Exit:** suggestion submitted → moderated → visible.

## Phase 7: Hardening (+ cheap P1)

1. Notifications (in-app): bell + list for builders; created on submit/approve/reject/changes.
2. Milestone updates: builder posts updates; shown on the project page.
3. Admin categories CRUD, featured projects, settings, admin users and roles (mock).
4. Analytics: `lib/analytics.ts` `track(event, props)` (console in dev) for every PRD §14 event.
5. Accessibility pass: keyboard nav, focus rings, labels, `aria-live` on transaction status, contrast check.
6. Responsive pass at 360 / 768 / 1024 / 1440.
7. Loading, empty and error states audit for every async view (PRD §18 rule 11).
8. **E2E (Playwright)** with mock data + a stubbed wallet: builder → admin → contributor journey, desktop and
   mobile viewports.
9. README: setup, env, Testnet wallet setup, test commands, deploy (Vercel, two services).

**Exit:** the PRD §21 checklist (frontend parts) passes.

---

## How each design screenshot gets built

For every screen you paste: (1) map it to its route and phase above; (2) pull new tokens and components into
`@repo/ui` first; (3) build the feature components in `src/features/<domain>/components`; keep the page file thin;
(4) wire the hook to the mock endpoint; (5) add the loading, empty and error states, even if the design doesn't
show them.

## PRD rules that must never break (checked in review)

- Public endpoints/pages never expose unapproved projects, owner emails or internal notes.
- Only `confirmed` (verified) contributions count. Pending is never shown as funded.
- Status changes only through the state machine; reject/changes need a reason; every admin action is audited.
- Money is a decimal string; math uses `@repo/domain/money`. Never `parseFloat` for money.
- Never ask for a secret key/seed phrase; never log one. Mutations never auto-retry.
- Testnet only. No "invest", "returns", or "escrow" wording (D1, PRD §13).
