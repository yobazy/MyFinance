# Repo audit (what’s active vs legacy)

This repository currently contains **two app stacks**:

- **New (active direction)**: Supabase + Next.js + TS worker
- **Legacy (pre-migration)**: Django + CRA (React) + SQLite + local backup tooling

This is normal during a migration, but it *does* create confusion unless we clearly mark what to use.

---

## Active (current path)

- `web/`: **Next.js** app (Supabase Auth + upload UI + enqueue jobs)
- `worker/`: **TypeScript ingestion worker**
- `supabase/`: SQL migrations / policies / RPC helpers
- `docs/supabase-nextjs-migration.md`: high-level migration plan

If you’re building a hosted multi-user product, this is what you should invest in.

---

## Legacy (keep only until fully migrated)

- `legacy/django-cra/backend/`, `legacy/django-cra/manage.py`, `legacy/django-cra/requirements.txt`: **Django** API + parsing + analytics logic
- `legacy/django-cra/frontend/`: **Create React App** UI
- `legacy/django-cra/start.sh`, `legacy/django-cra/start-dev.sh`: scripts that run the legacy Django+CRA stack
- `legacy/django-cra/*.md`: docs that primarily describe the legacy stack

Recommendation: once feature parity exists in the new stack, **archive** these into a `legacy/` folder or remove them.

---

## Likely unused / orphaned

- `legacy/backend-nodejs/`: appears to be an old artifact (contains `db.sqlite3`, logs, uploads) and is **not referenced** by code/scripts/docs in the repo.

Status: **archived under `legacy/`**.

---

## Runtime artifacts committed in-repo (should not be versioned)

These directories/files are typically environment-specific data and should be excluded from git (and/or moved out of the repo):
- `uploads/`
- `backups/`
- `logs/`
- `app.log`
- `backend-nodejs/logs/`, `backend-nodejs/uploads/`, `backend-nodejs/db.sqlite3`

Recommendation: remove from git history going forward and add to `.gitignore`.

