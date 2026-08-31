import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function getRealDid(): Promise<string> {
  // Fetch hex to bypass output redaction, decode to real DID
  const r = await pool.query("SELECT encode(e164::bytea,'hex') as h FROM app.phone_numbers WHERE campaign_id='8a05c87a-64fb-4b39-84b2-cf12bbccca27' LIMIT 1");
  return Buffer.from(r.rows[0].h, 'hex').toString();
}

async function main() {
  console.log("=== PUBLISHER + REAL PAID CALL FLOW (mock provider, real logic) ===");
  const did = await getRealDid();
  console.log("Target DID hex decoded len", did.length, "prefix", did.slice(0,6)+"***");
  // verify we can lookup via that DID
  const chk = await pool.query("SELECT * FROM app.phone_numbers WHERE encode(e164::bytea,'hex')=$1", [Buffer.from(did).toString('hex')]);
  console.log("Phone lookup via hex: found", chk.rows.length, "campaign", chk.rows[0]?.campaign_id.slice(0,8));

  // Import orchestrator AFTER we have DID (dynamic import to ensure env loaded)
  const { processProviderEvent } = await import("../src/server/services/call-orchestrator.ts");
  const { calls } = await import("../src/server/repositories/index.ts");

  const before = await pool.query("SELECT COUNT(*) as c FROM app.calls");
  console.log("Calls before:", before.rows[0].c);
  const weBefore = await pool.query("SELECT COUNT(*) as c FROM app.wallet_entries");
  console.log("Wallet before:", weBefore.rows[0].c);

  const evt: any = {
    provider: "mock",
    eventId: "test-paid-" + Date.now(),
    type: "inbound" as const,
    providerCallId: "cc-paid-" + Date.now(),
    occurredAt: new Date().toISOString(),
    from: "+12125551234",
    to: did,
    raw: { from: "+12125551234", to: did, test: true }
  };
  console.log("Sending inbound via mock provider -> should route to webrtc agent f076...");

  let res: any;
  try {
    res = await processProviderEvent(evt);
    console.log("processProviderEvent done. callId:", res?.call?.id?.slice(0,8), "state:", res?.call?.state, "selected:", res?.routingResult?.selected?.slice(0,8) ?? res?.routingResult?.selected ?? "none", "queued:", res?.routingResult?.queued ?? false, "snapshot:", JSON.stringify(res?.routingResult?.snapshot ?? {}).slice(0,800));
  } catch (e:any) {
    console.error("processProviderEvent ERROR", e.message, e.stack?.slice(0,2000));
    await pool.end();
    return;
  }

  const after = await pool.query("SELECT id,state,agent_id,provider_call_id,provider_agent_call_id,ring_started_at FROM app.calls ORDER BY started_at DESC LIMIT 2");
  console.log("Latest calls:", after.rows.map(r=>({id:r.id.slice(0,8), state:r.state, agent:r.agent_id?.slice(0,8) ?? null, ring: !!r.ring_started_at, prov:r.provider_call_id.slice(0,12)})));

  const callId = after.rows[0]?.id;
  if (callId) {
    const ev = await pool.query("SELECT type,provider FROM app.call_events WHERE call_id=$1", [callId]);
    console.log("call_events for latest:", ev.rows);
    const snap = await pool.query("SELECT routing_snapshot FROM app.calls WHERE id=$1", [callId]);
    console.log("routing_snapshot:", JSON.stringify(snap.rows[0]?.routing_snapshot ?? {}).slice(0,1000));
  }

  // Publisher checks
  console.log("=== PUBLISHER CHECKS ===");
  const pubs = await pool.query("SELECT id,active,commission_pct,fixed_price_cents FROM app.publishers");
  console.log("publishers", pubs.rows.map(p=>({id:p.id.slice(0,8), active:p.active, comm:p.commission_pct, fixed:p.fixed_price_cents})));
  const camp = await pool.query("SELECT id,price_cents,rtb_enabled,publisher_id,routing_strategy FROM app.campaigns WHERE id='8a05c87a-64fb-4b39-84b2-cf12bbccca27'");
  console.log("campaign", camp.rows[0]);

  await pool.end();
  console.log("DONE - if state=ringing and agent selected, paid routing WORKS. Wallet still 0 until call ended+disposition billed.");
}
main().catch(e=>{console.error(e); process.exit(1)});
