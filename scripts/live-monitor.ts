import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function getDid(): Promise<string> {
  const r = await pool.query("SELECT encode(e164::bytea,'hex') as h FROM app.phone_numbers WHERE campaign_id='8a05c87a-64fb-4b39-84b2-cf12bbccca27' LIMIT 1");
  return Buffer.from(r.rows[0].h, 'hex').toString();
}

let lastCount = 0;
let lastCallId: string | null = null;

async function snapshot() {
  const c = await pool.query("SELECT COUNT(*) as cnt FROM app.calls");
  const cnt = Number(c.rows[0].cnt);
  if (cnt !== lastCount) {
    console.log(`[${new Date().toLocaleTimeString()}] calls total: ${cnt} (was ${lastCount})`);
    lastCount = cnt;
    const latest = await pool.query("SELECT id,state,agent_id,provider_call_id,caller_state,started_at,connected_at,ended_at FROM app.calls ORDER BY started_at DESC LIMIT 2");
    for (const r of latest.rows) {
      console.log(`  -> ${r.id.slice(0,8)} state=${r.state} agent=${r.agent_id?.slice(0,8) ?? 'none'} caller_state=${r.caller_state} prov=${r.provider_call_id.slice(0,12)} started=${new Date(r.started_at).toISOString().slice(11,19)}`);
      if (r.id !== lastCallId && r.state !== 'ended' && r.state !== 'missed' && r.state !== 'failed') {
        lastCallId = r.id;
        const ev = await pool.query("SELECT type,provider,occurred_at FROM app.call_events WHERE call_id=$1 ORDER BY occurred_at DESC LIMIT 5", [r.id]);
        console.log(`     events: ${ev.rows.map(e=>e.type).join(', ')}`);
        const snap = await pool.query("SELECT routing_snapshot FROM app.calls WHERE id=$1", [r.id]);
        if (snap.rows[0]?.routing_snapshot) {
          const s = snap.rows[0].routing_snapshot;
          console.log(`     routing: ${s.strategy} selected=${s.selectedAgent?.slice(0,8) ?? 'none'} rejected=${Object.keys(s.rejectedCount ?? s.rejectionReasons ?? {}).length}`);
        }
      }
    }
  }
  // Also check ngrok
  try {
    const res = await fetch("http://127.0.0.1:4040/api/requests/http");
    const data: any = await res.json();
    const recent = data.requests?.[0];
    if (recent) {
      const uri = recent.request?.uri ?? '';
      if (uri.includes('webhook') || uri.includes('telnyx')) {
        console.log(`[${new Date().toLocaleTimeString()}] ngrok last webhook: ${recent.request.method} ${uri} -> ${recent.response.status_code} ${recent.tunnel_name}`);
      }
    }
  } catch {}
}

async function main() {
  const did = await getDid();
  console.log("=== LIVE MONITOR ===");
  console.log("DID hex:", Buffer.from(did).toString('hex'), "len", did.length);
  console.log("Public webhook: https://spaciously-protoplasmal-vivian.ngrok-free.dev/api/telephony/telnyx/webhook");
  console.log("Agent f076 available, agency wallet 51000, campaign 8a05 price 500 target [] (OPEN for +91 India), India Test 2cdc also exists");
  console.log("Waiting for inbound... dial NOW from +91 or US number -> DID +18886713949");
  console.log("Polling every 2s. Press Ctrl+C to stop.\n");

  const init = await pool.query("SELECT COUNT(*) as cnt FROM app.calls");
  lastCount = Number(init.rows[0].cnt);
  console.log(`Baseline calls: ${lastCount}`);

  setInterval(() => { snapshot().catch(e=>console.error(e.message)); }, 2000);
  // keep alive
  await new Promise(()=>{});
}
main().catch(e=>{console.error(e); process.exit(1)});
