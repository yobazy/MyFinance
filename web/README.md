# MyFinance Web (Next.js + Supabase)

## Setup

1) Create `web/.env.local` from `web/env.example`:

```bash
cd web
cp env.example .env.local
```

2) Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; used by `/api/ingest/*`)

## Run

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Flow

- Create an account in `/accounts`
- Upload an Amex `.xlsx` in `/upload`
- The file is processed immediately by a Next.js API route and then discarded

