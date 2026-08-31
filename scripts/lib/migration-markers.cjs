// Shared migration marker probes.
// Each migration is associated with a key object (table/column/index/type/constraint)
// that must exist once that migration has been applied. `probeMarkers(pool)`
// returns a map of version -> boolean. Used by:
//   - check-migrations.cjs (advisory applied/missing report)
//   - run-migrations.cjs --backfill (adopt a hand-migrated DB into the version table)

async function probeMarkers(pool) {
  const [tablesR, colsR, idxR, fnR, typeR, constR, priceR] = await Promise.all([
    pool.query("select table_name from information_schema.tables where table_schema='app'"),
    pool.query(`select table_schema || '.' || table_name || '.' || column_name as k
                from information_schema.columns
                where (table_schema = 'app') or (table_schema = 'public' and table_name = 'user')`),
    pool.query("select indexname from pg_indexes where schemaname='app'"),
    pool.query("select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'app'"),
    pool.query("select typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'app'"),
    pool.query(`select conname, pg_get_constraintdef(oid) as def from pg_constraint
                where conname in ('dispositions_outcome_check','disposition_payouts_outcome_check')`),
    pool.query(`select is_nullable from information_schema.columns
                where table_schema='app' and table_name='campaigns' and column_name='price_cents'`),
  ]);

  const tables = new Set(tablesR.rows.map((r) => r.table_name));
  const cols = new Set(colsR.rows.map((r) => r.k));
  const indexes = new Set(idxR.rows.map((r) => r.indexname));
  const funcs = new Set(fnR.rows.map((r) => r.proname));
  const types = new Set(typeR.rows.map((r) => r.typname));
  const deadCall = constR.rows.some((r) => r.def.includes("dead_call"));
  const priceNullable = priceR.rows[0]?.is_nullable === "YES";

  const markers = [
    ["0001", tables.has("agencies") && funcs.has("current_agency_id") && types.has("call_state")],
    ["0002", cols.has("public.user.role")],
    ["0003", tables.has("payments")],
    ["0004", cols.has("app.recordings.duration_seconds")],
    ["0005", tables.has("tutorials")],
    ["0006", tables.has("lead_tags") && tables.has("lead_notes")],
    ["0007", tables.has("dispositions") && tables.has("disposition_payouts")],
    ["0008", tables.has("agent_plans") && cols.has("app.wallet_entries.agent_id")],
    ["0009", cols.has("app.agencies.parent_agency_id") && tables.has("recruitment_invites")],
    ["0010", indexes.has("idx_calls_agent_state")],
    ["0011", deadCall],
    ["0012", tables.has("feature_requests")],
    ["0013", tables.has("skills")],
    ["0014", cols.has("app.agents.npn")],
    ["0015", cols.has("app.scripts.campaign_id")],
    ["0016", tables.has("publishers") && cols.has("app.campaigns.publisher_id")],
    ["0017", tables.has("campaign_assignments")],
    ["0018", tables.has("system_settings") && cols.has("app.agencies.head_membership_id")],
    ["0019", tables.has("wallet_transfers")],
    ["0020", cols.has("app.calls.lead_id") && cols.has("app.dispositions.annual_premium_cents")],
    ["0021", tables.has("retreaver_calls") && tables.has("rtb_reservations")],
    ["0022", tables.has("publisher_invites")],
    ["0023", cols.has("app.campaigns.retreaver_cid")],
    ["0024", priceNullable],
    ["0025", cols.has("app.recordings.provider")],
    ["0026", cols.has("app.calls.ring_started_at") && cols.has("app.calls.to_number") && cols.has("app.campaigns.ring_timeout_seconds")],
    ["0027", indexes.has("leads_public_email_uq")],
    ["0028", cols.has("app.calls.provider_agent_call_id") && indexes.has("idx_calls_provider_agent_leg")],
  ];

  return Object.fromEntries(markers);
}

module.exports = { probeMarkers };