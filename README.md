# Chucksales

Frontend for a Stellar-based community funding platform: builders submit projects, admins review them, the
community discovers and supports approved projects with Stellar Testnet contributions and suggestions.

Runs entirely on mock data (in-browser backend) with a real Stellar wallet integration on **Testnet**.

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local      # optional
cp apps/admin/.env.example apps/admin/.env.local  # optional
cp apps/landing/.env.example apps/landing/.env.local  # optional
pnpm dev            # landing → :3002, web → :3000, admin → :3001
```

Demo accounts: builder `builder@demo.local` / `Password1`; admin `admin@demo.local` / `Password1` (OTP `123456`).

## Scripts

`pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm format`

## Docs

- `docs/PLAN.md` — phased build plan and status
- `docs/DECISIONS.md` — product decisions (PRD §17) and working assumptions
- `docs/API.md` — the API contract the mock implements
- `CLAUDE.md` — conventions for contributors and coding agents

## Testnet wallet setup

_Filled in during Phase 4: install Freighter/Varial, switch to Testnet, fund with Friendbot, add a USDC trustline._
