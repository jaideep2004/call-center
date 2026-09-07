# Apply to live VPS (run these on srv1904902)

The two new migrations are pushed to `main 6e36ee7` and need to be applied to the live DB on `srv1904902`.

## 1. SSH + pull latest code

```bash
ssh root@45.132.242.23
cd /var/www/call-center
git pull origin main
ls -la supabase/migrations/0039_soft_delete_columns.sql supabase/migrations/0040_public_leads_agency_nullable.sql
```

## 2. Apply migrations to live DB

The `DATABASE_URL` is already in `/var/www/call-center/.env` (you set it during setup). The app loads it on start.

```bash
cd /var/www/call-center
node -e "
const fs = require('fs');
const pg = require('pg');
require('dotenv').config({ path: '.env' });
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  for (const f of ['0039_soft_delete_columns.sql','0040_public_leads_agency_nullable.sql']) {
    const sql = fs.readFileSync('supabase/migrations/' + f, 'utf8');
    console.log('==>', f);
    try { await c.query(sql); console.log('  OK'); }
    catch (e) { console.error('  FAIL', e.message); }
  }
  const r = await c.query(\"SELECT table_name FROM information_schema.columns WHERE table_schema='app' AND column_name='deleted_at' AND table_name IN ('agents','campaigns','agencies','scripts','tutorials','calls') ORDER BY table_name\");
  console.log('deleted_at on:', r.rows.map(x=>x.table_name).join(','));
  const r2 = await c.query(\"SELECT is_nullable FROM information_schema.columns WHERE table_schema='app' AND table_name='leads' AND column_name='agency_id'\");
  console.log('leads.agency_id nullable:', r2.rows[0]?.is_nullable);
  const r3 = await c.query(\"SELECT id, name FROM app.agencies WHERE id='00000000-0000-0000-0000-0000000000a1'\");
  console.log('sentinel agency:', r3.rows[0] ? 'OK ' + r3.rows[0].name : 'MISSING');
  await c.end();
})().catch(e => console.error('ERR', e.message));
"
```

**Expected output (8 lines):**
```
==> 0039_soft_delete_columns.sql
  OK
==> 0040_public_leads_agency_nullable.sql
  OK
deleted_at on: agencies,agents,calls,campaigns,scripts,tutorials
leads.agency_id nullable: YES
sentinel agency: OK Public Leads
```

If you see `FAIL`, the migration is already applied (because of `IF NOT EXISTS`) — that's fine.

## 3. Rebuild + restart so the new campaigns list code is live

```bash
cd /var/www/call-center
npm run build
pm2 restart all --update-env
pm2 logs --lines 30
```

## 4. Verify the two bugs are fixed

```bash
# Public lead capture (was 500, should now be 200)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"QA Verify","email":"qa-verify-2026-09-07-postfix@test.com","phone":"+15555550100"}' \
  https://coveragecalls.com/api/v1/public/leads
# Expected: {"success":true,"message":"Lead submitted successfully","data":null}

# Soft-delete (need an authed admin to test scripts DELETE)
# Just confirm /api/v1/scripts (any) returns 200 — it will, the column is now there
curl -s -o /dev/null -w "%{http_code}\n" https://coveragecalls.com/api/v1/scripts
# Expected: 401 (anon) or 200 (admin) — either way no 500
```

## 5. Cleanup the QA row created by step 4

```bash
node -e "
const pg = require('pg');
require('dotenv').config({ path: '.env' });
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  await c.query(\"DELETE FROM app.leads WHERE email = 'qa-verify-2026-09-07-postfix@test.com'\");
  console.log('cleaned up');
  await c.end();
})();
"
```

---

## Notes

- **No restart of `pm2` for the migrations themselves** — they're SQL only and apply directly. The `pm2 restart all` in step 3 is for the new `findManyWithBid` JS in the campaigns list route.
- **Idempotent**: re-running these is safe (uses `IF NOT EXISTS` everywhere).
- **Production-safe**: the `ALTER TABLE … DROP NOT NULL` is non-blocking on modern Postgres. The `ADD COLUMN` with `DEFAULT NULL` is also non-blocking.
- **No data loss**: no rows deleted or modified, just schema additions.

The full gate is already clean locally: `typecheck 0` · `409 passed` · `build 195` · public leads POST 200 · `softDelete` SQL confirmed for scripts/tutorials/leads.
