#!/usr/bin/env node
// Selective fresh reset — keeps publishers + campaigns + link tables as requested
// Wipes users, agents, calls, leads, wallet, etc for MANUAL_TEST_FLOW fresh run
require('dotenv').config();
const { Pool } = require('pg');

const KEEP_TABLES = new Set([
  'app.publishers',
  'app.publisher_invites',
  'app.campaigns',
  'app.campaign_publishers',
  'app.agencies',
  'app.npa_states',
  'app.agent_plans',
  'app.skills',
  'app.cms_sections',
  'app.system_settings',
]);

async function reset() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing'); process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  const client = await pool.connect();
  try {
    console.log('=== SELECTIVE RESET (keep publishers + campaigns) ===');
    console.log('KEEP:', [...KEEP_TABLES].join(', '));
    // show before counts
    const before = await client.query(`SELECT 'app.calls' as t, count(*)::int c FROM app.calls UNION ALL SELECT 'app.publishers', count(*) FROM app.publishers UNION ALL SELECT 'app.campaigns', count(*) FROM app.campaigns UNION ALL SELECT 'public.user', count(*) FROM public."user"`);
    console.table(before.rows);

    await client.query('BEGIN');
    // Bypass FK checks so order doesn't matter and we can keep publishers/campaigns while wiping children
    await client.query('SET LOCAL session_replication_role = replica');
    // Clear publisher user link first so public."user" can be truncated without FK violation
    await client.query(`UPDATE app.publishers SET user_id = NULL WHERE user_id IS NOT NULL`);

    const truncates = [
      `TRUNCATE app.call_events, app.recordings, app.call_notes, app.dispositions, app.disposition_payouts, app.subscription_call_charges, app.invoices, app.wallet_transfers, app.wallet_entries, app.payments, app.calls, app.rtb_reservation_events, app.rtb_reservations, app.retreaver_calls RESTART IDENTITY CASCADE`,
      `TRUNCATE app.lead_timeline, app.lead_notes, app.lead_tags, app.leads RESTART IDENTITY CASCADE`,
      `TRUNCATE app.phone_numbers, app.campaign_assignments, app.bid_overrides RESTART IDENTITY CASCADE`,
      `TRUNCATE app.agent_fees, app.agent_subscriptions, app.affiliates RESTART IDENTITY CASCADE`,
      `TRUNCATE app.audit_logs, app.outbox, app.recruitment_invites, app.onboarding_bookings, app.onboarding_slots, app.feature_requests, app.support_ticket_replies, app.support_tickets, app.tutorials, app.scripts RESTART IDENTITY CASCADE`,
      `TRUNCATE app.agents, app.memberships RESTART IDENTITY CASCADE`,
      `TRUNCATE public.session, public.account, public.verification, public."user" RESTART IDENTITY CASCADE`,
    ];

    // Also clean pgboss jobs if present (separate schema, handled separately)
    for (const sql of truncates) {
      try {
        await client.query(sql);
        console.log(` - TRUNCATE ok: ${sql.slice(0,80)}...`);
      } catch (e) {
        console.log(` - TRUNCATE failed: ${e.message.slice(0,120)}`);
        // fallback to DELETEs for that batch
        const tables = sql.match(/app\.\w+|public\.\S+/g) || [];
        for (const t of tables) {
          try { const r = await client.query(`DELETE FROM ${t}`); console.log(`   DELETE ${t} => ${r.rowCount}`);} catch (e2) { console.log(`   SKIP ${t}: ${e2.message.slice(0,80)}`)}
        }
      }
    }
    try { await client.query(`DELETE FROM jobs.job`); console.log(' - DELETE jobs.job ok'); } catch(e){ console.log(' - SKIP jobs.job: '+e.message.slice(0,80))}

    await client.query('COMMIT');
    console.log('\n=== AFTER ===');
    const after = await client.query(`
      SELECT 'app.calls' as t, count(*)::int c FROM app.calls
      UNION ALL SELECT 'app.call_events', count(*) FROM app.call_events
      UNION ALL SELECT 'app.publishers', count(*) FROM app.publishers
      UNION ALL SELECT 'app.campaigns', count(*) FROM app.campaigns
      UNION ALL SELECT 'app.campaign_publishers', count(*) FROM app.campaign_publishers
      UNION ALL SELECT 'app.publisher_invites', count(*) FROM app.publisher_invites
      UNION ALL SELECT 'app.agencies', count(*) FROM app.agencies
      UNION ALL SELECT 'app.agents', count(*) FROM app.agents
      UNION ALL SELECT 'app.memberships', count(*) FROM app.memberships
      UNION ALL SELECT 'app.leads', count(*) FROM app.leads
      UNION ALL SELECT 'app.wallet_entries', count(*) FROM app.wallet_entries
      UNION ALL SELECT 'app.invoices', count(*) FROM app.invoices
      UNION ALL SELECT 'public.user', count(*) FROM public."user"
      UNION ALL SELECT 'app.retreaver_calls', count(*) FROM app.retreaver_calls
    `);
    console.table(after.rows);

    // Ensure at least one agency exists for new campaigns
    const ag = await client.query('SELECT id, slug FROM app.agencies LIMIT 1');
    if (ag.rows.length === 0) {
      await client.query(`INSERT INTO app.agencies (name, slug) VALUES ('My Agency','my-agency')`);
      console.log('Created default agency My Agency');
    } else {
      console.log(`Agencies kept: ${ag.rows.map(r=>r.slug).join(', ')}`);
    }

    console.log('\nDone. Next per MANUAL_TEST_FLOW:');
    console.log(' 1. npm run dev  (ensure 30001)');
    console.log(' 2. Register super_admin via UI, then:');
    console.log('    SELECT id FROM public."user" WHERE email = \'your@email\';');
    console.log('    curl -X POST http://localhost:30001/api/v1/setup/make-admin -H "Content-Type: application/json" -d \'{"user_id":"<uuid>","role":"super_admin"}\'');
    console.log(' 3. Or run existing seed if you want full wipe: npm run seed -- --yes (destroys publishers/campaigns too)');
  } catch (e) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('RESET FAILED, rolled back:', e.message, e.stack?.slice(0,2000));
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
reset();
