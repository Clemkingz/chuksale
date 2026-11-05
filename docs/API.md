# API contract (served by `@repo/mock-api` today)

The frontend only talks to these endpoints. The mock answers them in the browser; a real backend must later
answer the **same paths, shapes and errors**, and then the switch is `NEXT_PUBLIC_API_SOURCE=live`.

- Base: `/api/v1`. Envelope: `{ status_code, message, data }`. Errors: HTTP status + `{ status_code, message }`.
- Lists take `page`, `limit` and return `{ items, meta: { page, limit, total, total_pages } }`.
- Auth levels (mock `router.ts`): `public`, `user` (any signed-in builder/admin), `admin`.
- Types are in `packages/domain/src/types.ts`. Money is always a decimal string.

## Auth (Phase 1, implemented in mock)

| Method | Path                    | Auth   | Body → data                                                                                                      |
| ------ | ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/signup`          | public | `{ full_name, email, password }` → `{ email, resend_in }` (6-digit code emailed; 409 if verified account exists) |
| POST   | `/auth/verify-email`    | public | `{ email, code }` → session `{ access_token, expires_at, user }`                                                 |
| POST   | `/auth/resend-otp`      | public | `{ email, purpose: verify_email\|reset_password }` → `{ resend_in }` (429 inside 2 min)                          |
| POST   | `/auth/login`           | public | `{ email, password }` → session. 401 wrong creds; 403 + `data.reason: "email_unverified"` (new code sent)        |
| POST   | `/auth/social`          | public | `{ id_token }` (Google) → session                                                                                |
| POST   | `/auth/forgot-password` | public | `{ email }` → `{}` (always 200, no account enumeration)                                                          |
| POST   | `/auth/reset-password`  | public | `{ email, code, password }` → `{}`                                                                               |
| GET    | `/auth/me`              | user   | → `{ id, email, role, display_name }`                                                                            |
| POST   | `/admin/auth/login`     | public | `{ email, password }` → `{ mfa_required: true, challenge_id }` (403 for non-admins). **Implemented**             |
| POST   | `/admin/auth/mfa`       | public | `{ challenge_id, code }` → admin session (12 h). Mock accepts any 6 digits. **Implemented**                      |

Codes: 6 digits, 10-minute expiry, 5 attempts, resend after 2 minutes. **Mock only:** responses that "send" a code
include `debug_code`, shown in a "Demo inbox" toast, and **any 6-digit code is accepted** (verify-email and
reset-password only check the format; verify-email creates the account if the demo data was reset). The real API
must never return `debug_code` and must check the code, expiry and attempts.

## Notifications (implemented in mock)

One inbox per reader: the builder's (Bearer token), the wallet's (`wallet=G…`, no account) and broadcasts. Read state
is per reader.

| Method | Path                          | Auth   | Notes                                                                                             |
| ------ | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/notifications`              | public | `wallet?, status=unread?, category?, page, limit` → `{ items, meta, unread_count, personalised }` |
| GET    | `/notifications/unread-count` | public | `wallet?` → `{ unread_count }` (the web app polls it every 20 s)                                  |
| POST   | `/notifications/:id/read`     | public | `{ wallet? }`                                                                                     |
| POST   | `/notifications/read-all`     | public | `{ wallet? }` → `{ updated }`                                                                     |
| POST   | `/mock/notifications/push`    | public | **mock only** (Demo panel)                                                                        |

## Public projects (Phase 3)

| Method | Path                            | Auth   | Notes                                                                                                            |
| ------ | ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/projects`                     | public | `q, category, stage, funding (open/funded), sort (newest/most_funded/featured), page, limit` → `PublicProject[]` |
| GET    | `/projects/featured`            | public | → `PublicProject[]`                                                                                              |
| GET    | `/projects/:slug`               | public | → `PublicProject`. **404** unless `isPubliclyVisible()` (FR-REV-05)                                              |
| GET    | `/projects/:slug/contributions` | public | confirmed only, `sender_address` shown shortened by UI                                                           |
| GET    | `/projects/:slug/updates`       | public | public updates                                                                                                   |
| GET    | `/categories`                   | public | active only                                                                                                      |

## Builder (Phase 2)

| Method | Path                                | Auth | Notes                                                                                                                                      |
| ------ | ----------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/builder/profile`                  | user | **implemented** → `BuilderProfileSummary` (name, bio, avatar, wallet, contact email, links, joined)                                        |
| PATCH  | `/builder/profile`                  | user | **implemented** `UpdateProfileInput`; 422 with `data.field` per invalid field                                                              |
| GET    | `/builder/projects`                 | user | **implemented** own only; `group (all/pending/completed), q, page, limit=6` → `{ items: BuilderProjectListItem[], meta, counts, has_any }` |
| POST   | `/builder/projects`                 | user | **implemented** `CreateProjectInput` → creates and submits (draft → submitted) in one step; 422 + `data.field`                             |
| GET    | `/builder/projects/:id`             | user | **403** if not owner; includes reviews' builder-visible `reason` (never `internal_note`)                                                   |
| PATCH  | `/builder/projects/:id`             | user | only if `isBuilderEditable(status)`; field-level 422 errors                                                                                |
| POST   | `/builder/projects/:id/submit`      | user | validates required fields; state machine; stores a `ProjectRevision`                                                                       |
| GET    | `/builder/projects/:id/suggestions` | user | published suggestions for own project                                                                                                      |
| POST   | `/builder/projects/:id/updates`     | user | P1 milestone update                                                                                                                        |
| POST   | `/uploads`                          | user | mock: validates type (png/jpg/webp) + size (≤ 5 MB), returns a data URL                                                                    |
| GET    | `/builder/notifications`            | user | P1                                                                                                                                         |
| POST   | `/builder/notifications/:id/read`   | user | P1                                                                                                                                         |

## Contributions (Phase 5)

| Method | Path                                | Auth   | Notes                                                                                                                                                                                |
| ------ | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/contributions/intents`            | public | `{ project_slug, wallet_address, asset_id, amount }` → `ContributionIntent` (reference memo, destination, expires in 15 min). Rejects if `!acceptsContributions()`, bad amount/asset |
| POST   | `/contributions/intents/:id/submit` | public | `{ tx_hash }` → `Contribution` status `pending`. Idempotent on `tx_hash` (FR-CON-05)                                                                                                 |
| POST   | `/contributions/intents/:id/cancel` | public | → `cancelled`                                                                                                                                                                        |
| GET    | `/contributions/:id`                | public | polled by the status page until final                                                                                                                                                |
| POST   | `/contributions/simulate`           | public | **mock only**: scenarios `confirmed`, `failed`, `delayed`, `wrong_amount`, `duplicate`                                                                                               |

Verification in the mock: fetch the tx from Horizon Testnet; check `successful`, payment op to
`destination_address`, asset, amount, `memo == reference`, and sender. Only then `confirmed` and counted.

## Suggestions (Phase 6)

| Method | Path                          | Auth   | Notes                                                                                                                    |
| ------ | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/projects/:slug/suggestions` | public | `published` only                                                                                                         |
| POST   | `/projects/:slug/suggestions` | public | `{ wallet_address, type, title (5–120), body (20–2000), link? }` → `pending_moderation`. 429 after 3 per wallet per hour |
| GET    | `/suggestions/mine?wallet=G…` | public | the wallet's own suggestions + status                                                                                    |
| POST   | `/reports`                    | public | `{ reporter, entity_type, entity_id, reason }`                                                                           |

## Admin (Phases 2, 5, 6, 7) — all `admin`

| Method         | Path                                 | Notes                                                                                  |
| -------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| GET            | `/admin/stats`                       | overview counters                                                                      |
| GET            | `/admin/projects`                    | `status, q, sort, page, limit`                                                         |
| GET            | `/admin/projects/:id`                | everything incl. owner, revisions, reviews, internal notes                             |
| POST           | `/admin/projects/:id/decision`       | `{ decision, reason?, internal_note? }` via state machine; writes audit + notification |
| POST           | `/admin/projects/:id/visibility`     | `{ visibility }` publish/unpublish; audit                                              |
| POST           | `/admin/projects/:id/feature`        | `{ featured }`; audit                                                                  |
| POST           | `/admin/projects/:id/archive`        | state machine; audit                                                                   |
| GET            | `/admin/suggestions`                 | `status (pending_moderation/reported/…), page`                                         |
| POST           | `/admin/suggestions/:id/moderate`    | `{ action: publish/hide/reject, reason? }`; audit                                      |
| GET            | `/admin/contributions`               | all statuses + reconciliation flags                                                    |
| POST           | `/admin/contributions/:id/reconcile` | re-run verification                                                                    |
| GET/POST/PATCH | `/admin/categories[/:id]`            | audit                                                                                  |
| GET            | `/admin/audit-log`                   | read-only, never editable                                                              |
| GET/PATCH      | `/admin/settings`                    | audit                                                                                  |

### Admin console endpoints implemented in the mock (designs "admin page 1–8", "developer D1–D2")

| Method    | Path                                                                                    | Notes                                                                                                         |
| --------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET       | `/admin/overview?range=week\|month\|quarter`                                            | `AdminOverview`: stats, per-day/week series, period total, raised vs targets, recent, trending                |
| GET       | `/admin/projects?tab=all\|completed\|pending\|cancelled&q&from&to&page&limit=7`         | `AdminProjectListItem[]` + `counts` (date range on submitted date)                                            |
| GET       | `/admin/projects/:id`                                                                   | detail + builder, links, reviews (incl. internal notes), `allowed_decisions`                                  |
| GET       | `/admin/projects/:id/contributions?page`                                                | confirmed only; `share_percent` of target (or of raised without a target)                                     |
| POST      | `/admin/projects/:id/decision`                                                          | `{ decision, reason?, internal_note? }`; 409 bad transition, 422 missing reason; audit + builder notification |
| POST      | `/admin/projects/:id/visibility` · `/feature`                                           | approved / public projects only; audit                                                                        |
| GET       | `/admin/contributors?page`                                                              | per wallet: total, share of all, count, projects, last; `stats { contributors, active, inactive }`            |
| GET       | `/admin/builders?page&q` · `/admin/builders/:id` · `/admin/builders/:id/projects?group` | `AdminBuilder`, `AdminBuilderProject`                                                                         |
| POST      | `/admin/builders/:id/status`                                                            | `{ status: active\|suspended, reason }` (reason required to suspend); audit                                   |
| GET/PATCH | `/admin/account`                                                                        | `AdminAccount`; partial updates                                                                               |
| POST      | `/admin/account/password`                                                               | `{ current_password, new_password }`                                                                          |
| PATCH     | `/admin/account/notifications`                                                          | partial `AdminNotificationPrefs`                                                                              |
| DELETE    | `/admin/account`                                                                        | `{ password }`; 409 for the last admin                                                                        |

### Implemented in the mock since (public, contributions, suggestions, builder project detail)

| Method         | Path                                                                                                                                      | Notes                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET            | `/projects`, `/projects/featured`, `/projects/:slug`, `/projects/:slug/contributions`, `/projects/:slug/updates`, `/categories`, `/stats` | public; `isPubliclyVisible()` everywhere                                                                               |
| POST           | `/contributions/intents`                                                                                                                  | `{ project_slug, wallet_address, asset_id: xlm\|usdc, amount }` (min 1, ≤ 7 dp) → intent with `reference` memo, 15 min |
| POST           | `/contributions/intents/:id/submit`                                                                                                       | `{ tx_hash }` (real) or `{ simulated: true, scenario }` (Demo wallet, mock only); idempotent on hash                   |
| GET            | `/contributions/:id`                                                                                                                      | verifies real payments on Horizon (memo, destination, asset, amount, sender) before `confirmed`                        |
| GET            | `/contributions?wallet=G…&status&asset&page`                                                                                              | the contributor page: items + summary (totals per asset, counts, monthly, by project)                                  |
| GET            | `/mock/demo-balance?wallet=`                                                                                                              | **mock only**: Demo wallet balances                                                                                    |
| GET/POST       | `/projects/:slug/suggestions`                                                                                                             | published only / create → `pending_moderation`; 3 per wallet per hour (429)                                            |
| GET            | `/suggestions/mine?wallet=`                                                                                                               | the wallet's own suggestions + status                                                                                  |
| POST           | `/reports`                                                                                                                                | report a suggestion                                                                                                    |
| GET/PATCH      | `/builder/projects/:id`                                                                                                                   | owner only (403); edit only while draft/changes requested (409)                                                        |
| POST           | `/builder/projects/:id/submit`                                                                                                            | resubmit via the state machine; needs summary, category, stage, address                                                |
| GET            | `/builder/projects/:id/suggestions`                                                                                                       | published suggestions on own project                                                                                   |
| GET/POST       | `/admin/suggestions`, `/admin/suggestions/:id`, `/admin/suggestions/:id/moderate`                                                         | queue (pending/reported/published/all); publish/hide/reject (reason for hide/reject); audit + notifications            |
| GET/POST       | `/admin/contributions`, `/admin/contributions/:id/reconcile`                                                                              | monitor (all/confirmed/pending/failed/flagged, search); re-verify; audit                                               |
| GET/POST/PATCH | `/admin/categories[/:id]`                                                                                                                 | add, rename, switch on/off; audit                                                                                      |
| GET            | `/admin/audit-log?entity_type&page`                                                                                                       | read-only, newest first                                                                                                |
| GET            | `/admin/contributors/:address`                                                                                                            | one wallet: totals, counts, contributions                                                                              |
