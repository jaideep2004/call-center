import "dotenv/config";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function getDid(): Promise<string> {
  const r = await pool.query("SELECT encode(e164::bytea,'hex') as h FROM app.phone_numbers WHERE campaign_id='8a05c87a-64fb-4b39-84b2-cf12bbccca27' LIMIT 1");
  return Buffer.from(r.rows[0].h, 'hex').toString();
}

async function main() {
  const did = await getDid();
  console.log("Testing India +91 caller now that campaign1 target_states=[]");
  const { processProviderEvent } = await import("../src/server/services/call-orchestrator.ts");
  
  const before = await pool.query("SELECT COUNT(*) as c FROM app.calls");
  console.log("before", before.rows[0].c);

  const evt: any = {
    provider: "mock",
    eventId: "india-test-" + Date.now(),
    type: "inbound",
    providerCallId: "cc-india-" + Date.now(),
    occurredAt: new Date().toISOString(),
    from: "+919999999999",
    to: did,
    raw: { from: "+919999999999", to: did }
  };
  const res: any = await processProviderEvent(evt);
  console.log("India +91 inbound ->", res?.call?.state, "selected", res?.routingResult?.selected?.slice(0,8), "rejected", JSON.stringify(res?.routingResult?.snapshot?.rejectionReasons ?? {}).slice(0,500));
  const after = await pool.query("SELECT id,state,agent_id FROM app.calls ORDER BY started_at DESC LIMIT 1");
  console.log("DB latest", after.rows[0].id.slice(0,8), after.rows[0].state, after.rows[0].agent_id?.slice(0,8));
  await pool.end();
}
main().catch(e=>{console.error(e.stack); process.exit(1)});
