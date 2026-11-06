# API: how the apps use the ChuckSales backend

The contract is the live backend's OpenAPI spec, not this file: `https://chucksale-backend.onrender.com/docs-json`
(Swagger at `/docs`). `@repo/domain/types` mirrors it exactly; update the types from the spec when it changes. The
backend owner's "Frontend Integration Guide" is the source for behaviour; this page records how the apps follow it.

## Setup

| What        | Where                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Base URL    | `NEXT_PUBLIC_API_URL` (default staging `https://chucksale-backend.onrender.com/api/v1`)                     |
| Data source | live by default; `NEXT_PUBLIC_API_SOURCE=mock` uses `@repo/mock-api` (same contract, in the browser)        |
| Clients     | `@repo/api/client`: account client (refresh), wallet client, public client; 70 s timeout                    |
| Errors      | `@repo/api/errors`: `errorMessage`, `errorDetails`, `detailsByField`, `errorRequestId`, `retryAfterSeconds` |
| CORS        | staging allows `http://localhost:3000`, `:3001`, `:3002`; Vercel origins must be added by the backend owner |

## Rules the apps follow

1. Only documented routes; only documented fields (unknown fields are 400).
2. Browser only. No Next.js proxy or server-side calls (rate limits are per client IP; 5 sign-ins burst per IP).
3. Unwrap `{ statusCode, message, data }`. Errors are `{ statusCode, message, data: null, error: { code, details?,
requestId, retryAfterSeconds? } }`; forms show each `details` line beside its field.
4. On 401: refresh once (single flight) and retry once, except on `/auth/login`, `/auth/register`,
   `/auth/verify-email`, `/auth/refresh`, `/auth/logout`. A refused refresh ends the session.
5. Amounts are decimal strings (≤7 places) per asset id (`XLM`, `USDC:<issuer>`); math via `@repo/domain/money`; assets
   are never added together. Assets, passphrase and explorer come from `GET /stellar/network`.
6. Never ask for, accept or send a secret key. Wallets sign; the apps handle public keys and signed XDR only.
7. The backend enforces permissions; the UI hides what can't be done (`project.permissions`, action rules).
8. Payments: only `confirmed` is success; a closed wallet popup never is; a lost submit response goes to the status
   page, which polls `GET /contributions/{id}`.
9. User text (suggestions, notes, notification bodies) renders as plain text with line breaks; suggestion links use
   `rel="nofollow ugc noopener"`.

## Where each area lives

| Area                 | Routes                                                                                                                                                                                                  | App code                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Builder auth         | `/auth/register`, `verify-email` (then "Complete your profile"), `resend-otp`, `login`, `refresh`, `logout`, `logout-all`, `forgot-password`, `reset-password`, `change-password`, `GET/PATCH /auth/me` | web `features/builder-auth`                                                      |
| Builder profile      | `PATCH /auth/me` (incl. `socialLinks`), `PUT/DELETE /auth/me/avatar` (upload or a ready-made avatar rendered to PNG), `/auth/me/banner`, `/auth/me/wallet` (live wallet token proves control)           | web `features/builder-profile`, `EditProfileForm`                                |
| Admin auth           | same login (role `admin` only), reset for new-admin setup, `PATCH /auth/me` name, `/auth/me/avatar`                                                                                                     | admin `features/auth`, `features/account`                                        |
| Wallet sign-in       | `/wallet-auth/challenge`, `verify`, `session`, `logout`                                                                                                                                                 | web `features/wallet/connect.ts`                                                 |
| Network, balances    | `/stellar/network`, `/stellar/accounts/{address}`                                                                                                                                                       | web `lib/stellar/network.ts`                                                     |
| Discovery            | `/categories`, `/projects` (q, category, stage, type, featured, fundraising, asset, sort), `/projects/{slug}` (counts a view; cached per visit)                                                         | web `features/projects`                                                          |
| Builder projects     | `/builder/projects` CRUD (incl. `fundingEndsAt`), `/submit`, `/feedback`, `/cover`, `/logo` (multipart), `/contributions`, `/insights`                                                                  | web `features/builder-projects`                                                  |
| Project updates      | builder `/builder/projects/{id}/updates` CRUD + `/image`; public `/projects/{slug}/updates`; admin `/admin/projects/{id}/updates`, `/admin/project-updates/{id}/remove`                                 | web `ProjectUpdates`, `ProjectDetail` (Updates tab); admin `ProjectUpdatesPanel` |
| Contributions        | `POST /projects/{slug}/contributions` → sign → `POST /contributions/{id}/submit` → `GET /contributions/{id}`; `/contributions/mine`; `/projects/{slug}/contributions`                                   | web `features/contributions`                                                     |
| Suggestions, reports | `/projects/{slug}/suggestions`, `/suggestions/mine`, `/suggestions/{id}/reports`, `/projects/{slug}/reports`                                                                                            | web `features/suggestions`                                                       |
| Notifications        | builder `/notifications…` and contributor `/wallet/notifications…` (wallet token): list, `/unread-count` (polled every minute and on focus), `/{id}/read`, `/read-all`                                  | web `features/notifications` (two inboxes), admin `features/account`             |
| Admin projects       | `/admin/projects` (status, q, categoryId, published, featured, sort), `/{id}`, `PATCH` category, `/actions`, `/revisions`, `/admin/analytics/projects/{id}`                                             | admin `features/projects`                                                        |
| Admin people         | `/admin/users` (role, q, suspended, emailVerified; with `avatarUrl`), `POST` admin, `/{id}` (profile, project counts, last sign-in, devices, suspended-by name), `/suspension`                          | admin `features/builders`                                                        |
| Admin money          | `/admin/contributions` (status, projectId, address), `/reconcile`                                                                                                                                       | admin `features/monitor`, `features/contributors`                                |
| Moderation           | `/admin/suggestions`, `/{id}`, `/actions`; `/admin/reports`, `/close`; `/admin/wallet-restrictions`                                                                                                     | admin `features/moderation`                                                      |
| Overview             | `/admin/overview`, `/admin/analytics?from&to` (to exclusive, ≤366 days)                                                                                                                                 | admin `features/overview`                                                        |
| Categories, audit    | `/admin/categories`, `/audit-logs`                                                                                                                                                                      | admin `features/categories`, `features/audit`                                    |

## Derived in the UI

- Funding time left: counted on the client from `funding.endsAt`; `funding.ended` decides whether Contribute is open.
- Profile strength: six steps from `GET /auth/me` (display name, picture, bio, a link, banner, verified wallet).
- Home stats: counts from `/projects` (`totalCount`) and category counts. Wallet totals: summed client-side from
  `/contributions/mine` (100 per page, "Load older"). Admin contributors: grouped from confirmed
  `/admin/contributions`. Builder dashboard tabs and search: client-side over `/builder/projects?limit=100`.
- Wallet notifications carry only a project id (no slug), so they open My wallet.

Not offered by the API (so not in the UI): contributor accounts, Google sign-in, admin MFA, extra admin profile fields.
