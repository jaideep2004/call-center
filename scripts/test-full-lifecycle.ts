import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function getRealDid(): Promise<string> {
  const r = await pool.query("SELECT encode(e164::bytea,'hex') as h FROM app.phone_numbers WHERE campaign_id='8a05c87a-64fb-4b39-84b2-cf12bbccca27' LIMIT 1");
  return Buffer.from(r.rows[0].h, 'hex').toString();
}

async function main() {
  console.log("=== FULL PAID CALL LIFECYCLE (publisher + billing) ===");
  const did = await getRealDid();
  console.log("DID", did.slice(0,6)+"***", "price 500c publisher 4134fdda commission 10% fixed 100c");

  const { processProviderEvent, finalizeCall } = await import("../src/server/services/call-orchestrator.ts");
  const { calls } = await import("../src/server/repositories/index.ts");

  // 1) Inbound
  const evtInbound: any = {
    provider: "mock",
    eventId: "lifecycle-inbound-" + Date.now(),
    type: "inbound",
    providerCallId: "cc-lifecycle-" + Date.now(),
    occurredAt: new Date().toISOString(),
    from: "+12125551234",
    to: did,
    raw: { from: "+12125551234", to: did }
  };
  const resInbound: any = await processProviderEvent(evtInbound);
  const callId = resInbound.call.id;
  console.log("1. Inbound ->", resInbound.call.state, "selected", resInbound.routingResult?.selected?.slice(0,8));

  let call = await pool.query("SELECT * FROM app.calls WHERE id=$1", [callId]);
  console.log("   DB state", call.rows[0].state, "agent", call.rows[0].agent_id?.slice(0,8), "ring_started", !!call.rows[0].ring_started_at);

  // 2) Simulate agent answering via softphone: call goes ringing -> connecting (agent accepted)
  // This is normally via Socket.io take_call, but we simulate via direct state claim
  // Find the ringing call and move to connecting
  await pool.query("UPDATE app.calls SET state='connecting' WHERE id=$1", [callId]);
  console.log("2. Agent accepted -> connecting");

  // 3) Telnyx bridging success -> connected
  const evtConnected: any = {
    provider: "mock",
    eventId: "lifecycle-connected-" + Date.now(),
    type: "connected",
    providerCallId: call.rows[0].provider_call_id,
    occurredAt: new Date().toISOString(),
    from: "+12125551234",
    to: did,
    raw: {},
    callId: callId
  };
  // Need to also set the mock provider's normalize to map connected correctly - but we use direct event
  // Instead manually transition via claim
  const connectedAt = new Date().toISOString();
  await pool.query("UPDATE app.calls SET state='connected', connected_at=$2 WHERE id=$1", [callId, connectedAt]);
  console.log("3. Bridged -> connected at", connectedAt);

  // Simulate 70s talk time
  const endedAt = new Date(new Date(connectedAt).getTime() + 70000).toISOString();

  // 4) Caller hangs up -> ended
  const evtEnded: any = {
    provider: "mock",
    eventId: "lifecycle-ended-" + Date.now(),
    type: "ended",
    providerCallId: call.rows[0].provider_call_id,
    occurredAt: endedAt,
    from: "+12125551234",
    to: did,
    raw: {}
  };
  const resEnded: any = await processProviderEvent(evtEnded);
  console.log("4. Hangup ->", resEnded.call?.state, "billing queued?", resEnded.billing?.queued ?? "inline");

  call = await pool.query("SELECT * FROM app.calls WHERE id=$1", [callId]);
  console.log("   DB after ended:", call.rows[0].state, "connected_at", !!call.rows[0].connected_at, "ended_at", !!call.rows[0].ended_at);

  // 5) Billing - try finalizeCall directly (since worker may queue)
  // finalizeCall does wallet charge + invoice disposition payout
  // It expects a disposition to determine billable; without disposition, we test reserve logic
  try {
    // Create a disposition as sold to trigger full billing (annual_premium)
    const dispRes = await pool.query("INSERT INTO app.dispositions (call_id, agent_id, outcome, annual_premium_cents) VALUES ($1,$2,'sold', 120000) RETURNING id", [callId, call.rows[0].agent_id]);
    console.log("   Created disposition sold premium $1200 ->", dispRes.rows[0].id.slice(0,8));
  } catch(e:any){ console.log("   disposition insert skipped:", e.message.slice(0,200)); }

  // Check wallet before finalize
  const balBefore = await pool.query("SELECT COALESCE(SUM(amount_cents),0) as bal FROM app.wallet_entries WHERE agent_id=$1", [call.rows[0].agent_id]);
  console.log("   Wallet before finalize:", balBefore.rows[0].bal);

  try {
    const billing = await finalizeCall(callId);
    console.log("5. finalizeCall result:", JSON.stringify(billing).slice(0,1000));
  } catch(e:any){
    console.log("   finalizeCall error (maybe already finalized):", e.message.slice(0,500));
  }

  const balAfter = await pool.query("SELECT COALESCE(SUM(amount_cents),0) as bal FROM app.wallet_entries WHERE agent_id=$1", [call.rows[0].agent_id]);
  console.log("   Wallet after finalize:", balAfter.rows[0].bal, "delta", Number(balAfter.rows[0].bal) - Number(balBefore.rows[0].bal));

  const entries = await pool.query("SELECT type, amount_cents, call_id FROM app.wallet_entries WHERE agent_id=$1 ORDER BY created_at DESC LIMIT 5", [call.rows[0].agent_id]);
  console.log("   Recent wallet entries:", entries.rows);

  const invoices = await pool.query("SELECT id,total_cents,status FROM app.invoices WHERE call_id=$1", [callId]);
  console.log("   Invoices for call:", invoices.rows);

  // 6) Publisher payout check - campaign 8a05 has publisher 4134f, commission 10%, fixed 100
  // The finalize should also create affiliate/payout logic? Check ledger
  const ledger = await pool.query("SELECT COUNT(*) FROM app.wallet_entries WHERE call_id=$1", [callId]);
  console.log("   Wallet entries linked to call:", ledger.rows[0].count);

  // 7) Ping evaluator test for publisher flow
  const { evaluatePing } = await import("../src/server/services/ping-evaluator.ts");
  const pingOk = await evaluatePing({ did, caller: "+12125551234" });
  console.log("6. Ping WY (allowed WY,OR,MS) ->", pingOk.decision, pingOk);
  const pingBad = await evaluatePing({ did, caller: "+13105551234" }); // CA 310
  console.log("   Ping CA (not allowed) ->", pingBad.decision, pingBad.reason);

  await pool.end();
  console.log("DONE");
}
main().catch(e=>{console.error(e.stack); process.exit(1)});
