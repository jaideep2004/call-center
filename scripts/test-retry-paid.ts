import "dotenv/config";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function getRealDid(): Promise<string> {
  const r = await pool.query("SELECT encode(e164::bytea,'hex') as h FROM app.phone_numbers WHERE campaign_id='8a05c87a-64fb-4b39-84b2-cf12bbccca27' LIMIT 1");
  return Buffer.from(r.rows[0].h, 'hex').toString();
}

async function main() {
  const did = await getRealDid();
  console.log("DID", did.slice(0,6)+"***");
  const { processProviderEvent, finalizeCall } = await import("../src/server/services/call-orchestrator.ts");

  // Use WY caller 307 = WY, matches campaign target WY,OR,MS
  const wyCaller = "+13075551234"; // 307 WY
  const caCaller = "+13105551234"; // 310 CA mismatch

  // Test ping first
  const { evaluatePing } = await import("../src/server/services/ping-evaluator.ts");
  console.log("Ping WY", await evaluatePing({ did, caller: wyCaller }));
  console.log("Ping CA", await evaluatePing({ did, caller: caCaller }));

  // Inbound from WY (should succeed now agent available + funded)
  const evt: any = {
    provider: "mock",
    eventId: "retry-" + Date.now(),
    type: "inbound",
    providerCallId: "cc-retry-" + Date.now(),
    occurredAt: new Date().toISOString(),
    from: wyCaller,
    to: did,
    raw: { from: wyCaller, to: did }
  };
  const res: any = await processProviderEvent(evt);
  console.log("Inbound WY ->", res?.call?.state, "agent", res?.routingResult?.selected?.slice(0,8), "elapsed", Date.now());

  const callId = res?.call?.id;
  let row = await pool.query("SELECT * FROM app.calls WHERE id=$1", [callId]);
  console.log("DB", row.rows[0].state, "ring_started", !!row.rows[0].ring_started_at, "agent", row.rows[0].agent_id?.slice(0,8));

  // Simulate agent answer -> connected
  await pool.query("UPDATE app.calls SET state='connected', connected_at=now() WHERE id=$1", [callId]);
  // Wait 65s connected
  const connectedAt = new Date();
  const endedAt = new Date(connectedAt.getTime() + 65000);
  await pool.query("UPDATE app.calls SET ended_at=$2 WHERE id=$1", [callId, endedAt.toISOString()]);
  await pool.query("UPDATE app.calls SET state='ended' WHERE id=$1", [callId]);
  console.log("Simulated 65s talk -> ended");

  // Create disposition sold to trigger payout path (need admin confirm)
  // First ensure disposition_payouts exists for this agency/outcome
  const payouts = await pool.query("SELECT * FROM app.disposition_payouts WHERE agency_id='951dff1d-04fb-44ab-8342-49b16e039f11' LIMIT 3");
  console.log("payouts config", payouts.rows);
  if (payouts.rows.length===0) {
    await pool.query("INSERT INTO app.disposition_payouts (agency_id, outcome, amount_cents) VALUES ($1,'sold', 2500)", ['951dff1d-04fb-44ab-8342-49b16e039f11']);
    console.log("Inserted disposition_payout sold 2500");
  }
  const agentId = row.rows[0].agent_id;
  const disp = await pool.query("INSERT INTO app.dispositions (call_id, agent_id, outcome, annual_premium_cents, admin_confirmed) VALUES ($1,$2,'sold',120000,true) RETURNING id", [callId, agentId]);
  console.log("disposition", disp.rows[0].id.slice(0,8));

  const balBefore = await pool.query("SELECT COALESCE(SUM(amount_cents),0) as bal FROM app.wallet_entries WHERE agency_id=$1", ['951dff1d-04fb-44ab-8342-49b16e039f11']);
  console.log("agency bal before finalize", balBefore.rows[0].bal);

  const billing:any = await finalizeCall(callId);
  console.log("finalize", JSON.stringify(billing).slice(0,800));

  const balAfter = await pool.query("SELECT COALESCE(SUM(amount_cents),0) as bal FROM app.wallet_entries WHERE agency_id=$1", ['951dff1d-04fb-44ab-8342-49b16e039f11']);
  console.log("agency bal after", balAfter.rows[0].bal, "delta", Number(balAfter.rows[0].bal)-Number(balBefore.rows[0].bal));

  const entries = await pool.query("SELECT type,amount_cents,call_id FROM app.wallet_entries WHERE call_id=$1", [callId]);
  console.log("entries for call", entries.rows);
  const inv = await pool.query("SELECT id,total_cents,status FROM app.invoices WHERE call_id=$1", [callId]);
  console.log("invoice", inv.rows[0]);

  await pool.end();
}
main().catch(e=>{console.error(e.stack); process.exit(1)});
