import "dotenv/config";
import { processProviderEvent, routeCall } from "../src/server/services/call-orchestrator";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function main() {
  const evt: any = {
    provider: "mock",
    eventId: "test-paid-001-" + Date.now(),
    type: "inbound",
    providerCallId: "cc-paid-" + Date.now(),
    occurredAt: new Date().toISOString(),
    from: "+12125551234",
    to: "+18886393949",
    raw: { from: "+12125551234", to: "+18886393949", test: true }
  };
  console.log("=== PUBLISHER + CALL FLOW TEST ===");
  console.log("Phone: +18886393949 -> Campaign 1 (price $5.00, rtb_enabled, priority)");
  console.log("Agent f076... available/webrtc priority 100");
  console.log("Publisher test 6 august active 10% commission");
  console.log("Event", evt.providerCallId);

  const before = await pool.query("SELECT COUNT(*) as c FROM app.calls");
  console.log("Calls before:", before.rows[0].c);

  const res: any = await processProviderEvent(evt);
  console.log("processProviderEvent result:", JSON.stringify(res, null, 2).slice(0,4000));

  // Check what was created
  const after = await pool.query("SELECT id,agency_id,campaign_id,agent_id,state,to_number,provider_call_id, started_at FROM app.calls ORDER BY started_at DESC LIMIT 3");
  console.log("CALLS AFTER:", JSON.stringify(after.rows.map(r=>({...r, id:r.id.slice(0,8)})), null, 2));

  if (after.rows[0]) {
    const callId = after.rows[0].id;
    console.log("Latest call state:", after.rows[0].state, "agent:", after.rows[0].agent_id?.slice(0,8));
    // Check call_events
    const ev = await pool.query("SELECT type,provider,provider_event_id FROM app.call_events WHERE call_id=$1", [callId]);
    console.log("call_events:", ev.rows);
  }

  await pool.end();
}
main().catch(e=>{console.error(e.stack); process.exit(1)});
