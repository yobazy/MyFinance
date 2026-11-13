# MyFinance

Personal finance dashboard: Next.js app in `web/`, a polling job worker in `worker/`, Supabase (Postgres, Auth, Storage, RLS) behind both. The hosted Supabase project holds real users' bank transactions.

## Rules

- `legacy/` is the archived Django + Create React App version, kept for reference. Don't modify it.
- The repo is public. Never commit secrets: `SUPABASE_SERVICE_ROLE_KEY`, `PLAID_SECRET` and users' Anthropic keys stay server-side and out of git.
- Migrations in `supabase/migrations/` are applied by hand to the hosted project (Supabase CLI or the dashboard SQL editor). Only do that, or any other write to the hosted project, when asked: it changes real user data. Same for deploys (Vercel hosts the web app).
- For screenshots use `npm run preview:shots` in `web/`. It mocks Supabase and the API routes with demo data, so no real data ends up in images. Output goes to `web/.preview-shots/`.

## Gotchas

- Amounts: expenses are stored positive, income negative. `Money` takes `stored={amount}` and flips the sign for display.
- The service-role clients (`web/lib/supabaseAdmin.ts`, `worker/src/supabase.ts`) bypass RLS, so filter every query by `user_id` yourself, and import `supabaseAdmin` only from route handlers in `web/app/api/`. The browser client is `web/lib/supabase.ts`.
- Transactions are deduplicated by upsert on `(user_id, account_id, fingerprint)`. The fingerprint is computed in both `web/lib/fingerprint.ts` and `worker/src/fingerprint.ts`; keep them identical or re-imports create duplicates. `confidenceCalculator.ts` is also duplicated between `web/lib/` and `worker/src/lib/`.
- Anthropic keys are per user (`user_settings.anthropic_api_key`, set on the settings page) and read with `getUserAnthropicKey`. Nothing reads the `ANTHROPIC_API_KEY` env var.
- Two migrations share the `013_` prefix; the next one is `016_`.
- The root `.gitignore` ignores every `lib/` directory (a Python leftover) except `web/lib/` and `worker/src/lib/`. A new `lib/` anywhere else needs its own exception or it silently stays out of git.
- `next build` fails unless `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Any value works for a build; CI uses dummies.

## Checks

- `web/` and `worker/` each have their own `package-lock.json`; run `npm ci` in each. The root `package.json` only holds the `web:dev` / `worker:dev` shortcuts and legacy scripts.
- CI (`.github/workflows/ci.yml`) runs on every PR: worker `npm run build` (tsc); web `npx tsc --noEmit`, `npm run build`, `npm run test:e2e`.
- ESLint isn't set up: `npm run lint` opens Next's interactive setup prompt.
- The signed-in Playwright tests need `E2E_EMAIL` and `E2E_PASSWORD` in the environment (a real Supabase user) and skip themselves without them.

## Code conventions

- TypeScript strict; avoid `any`.
- UI is MUI. Use the shared primitives in `web/app/components/ui/` instead of ad-hoc markup, and the tokens in `web/lib/theme.ts` (`chartPalette` for Recharts series) instead of one-off colors.
- `useToast()` for success and error messages and `useConfirm()` for confirmations; never `alert()` or `window.confirm()`.
- Format money and dates with `web/lib/format.ts`.
- Lay out with `Box` and CSS grid, not MUI `Grid item`. Loading states are skeletons, not spinners; empty states use `EmptyState`.
