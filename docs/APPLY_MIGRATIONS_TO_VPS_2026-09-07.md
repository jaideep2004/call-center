# Apply migrations to live VPS (2026-09-07)

All 4 commit-level fixes have been pushed to `main` and are on the live VPS once you `git pull`. Three migrations still need to be applied to the live DB.

## Commits already on main (no DB action required)

- `0f2e30f` — code-only fixes (idempotent double-accept, register banner, SMTP redaction, wallet UUID, `next ^16.0.7`, disputes confirm→real PATCH, doc count)
- `9b1573d` — docs (this file)
- `6e36ee7` — code-only (campaigns list COALESCE bid)

## Migrations to apply to live DB

```bash
ssh root@45.132.242.23
cd /var/www/call-center
git pull origin main
```

Then **three migrations** to apply, in this order:

### 1. `0039_soft_delete_columns.sql` — 5 mins, zero-downtime

Adds `deleted_at` to 6 tables. `IF NOT EXISTS` everywhere. Safe to run online.

```bash
cd /var/www/call-center
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0039_soft_delete_columns.sql
```

### 2. `0040_public_leads_agency_nullable.sql` — 1 min, zero-downtime

`ALTER COLUMN DROP NOT NULL` + sentinel agency. Non-blocking on modern Postgres.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0040_public_leads_agency_nullable.sql
```

### 3. `0041_subscription_calls_used_idempotent.sql` — 1 min, zero-downtime

New `subscription_call_charges` ledger table. The new code in `agent-subscriptions.ts` will start using it on next deploy. Safe to run online.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0041_subscription_calls_used_idempotent.sql
```

### 4. `0042_concurrent_indexes.sql` — **REQUIRES MAINTENANCE WINDOW** (15-30 min depending on table size)

24 indexes rebuilt as `CREATE INDEX CONCURRENTLY IF NOT EXISTS`. **Cannot be wrapped in a transaction.** Each statement must run as a separate non-transactional command.

```bash
# Option A: psql with autocommit (each statement is its own transaction)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0042_concurrent_indexes.sql 2>&1 | tee /tmp/index-migration.log

# Option B: paste into Supabase SQL editor with "Auto-commit" ON
```

If one statement fails partway, the rest still run because of `IF NOT EXISTS` and per-statement autocommit. Re-running is safe.

### 5. Rebuild + restart PM2

```bash
cd /var/www/call-center
npm ci
npm run build
pm2 restart all --update-env
pm2 logs --lines 30
```

## Verify (one curl per fix)

```bash
# Public lead capture (was 500, should now be 200)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"QA","email":"qa-2026-09-07-postfix@test.com","phone":"+15555550100"}' \
  https://coveragecalls.com/api/v1/public/leads
# Expected: {"success":true,"message":"Lead submitted successfully","data":null}

# Login still works (proxy checks __Secure-better-auth.session_token)
curl -s -o /dev/null -w "%{http_code}\n" https://coveragecalls.com/login
# Expected: 200

# Homepage
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://coveragecalls.com/
# Expected: 200 in <5s
```

## Cleanup the QA row created by step 5

```bash
psql "$DATABASE_URL" -c "DELETE FROM app.leads WHERE email = 'qa-2026-09-07-postfix@test.com';"
```

---

## Note on the `0028_*` filename collision

Commit `0f2e30f` renames `0028_provider_agent_call_id.sql` → `0028b_provider_agent_call_id.sql` to remove the filename collision. This is purely cosmetic for new installs; the live DB has both already applied. If you ever replay migrations from scratch, the `0028b_` ordering is now correct.
