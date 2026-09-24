// Local Stripe webhook simulator — NO Stripe login/CLI needed.
//
// Picks up a shared secret YOU choose (must match the app's configured
// webhook secret), builds a checkout.session.completed event, signs it the
// exact way Stripe does (t=...,v1=HMAC_SHA256), and POSTs it to the local
// webhook. Exercises the real credit path: row heal → ledger → receipt mail.
//
//   1. Admin → System Settings → paste any value as Test webhook secret,
//      e.g.  whsec_localtest1234567890   (Save & Use Test)
//   2. node scripts/stripe-local-webhook.mjs --secret whsec_localtest1234567890 \
//        --session cs_local_test1 --agency <agency-uuid> \
//        --agent <agent-uuid> --credit 100
//      (omit --agent for an agency-pool top-up; add --type agency_wallet_topup)
//   3. Agent wallet (or Admin → Payments) must show the $1.00 credit.
//
// Pool top-up example:
//   node scripts/stripe-local-webhook.mjs --secret whsec_localtest1234567890 \
//     --session cs_local_pool1 --agency <agency-uuid> --credit 25000 \
//     --type agency_wallet_topup
import { createHmac } from "node:crypto";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

const secret = arg("secret");
const sessionId = arg("session", `cs_local_${Date.now()}`);
const agencyId = arg("agency");
const agentId = arg("agent");
const credit = Number(arg("credit", "100"));
const fee = Number(arg("fee", "3"));
const type = arg("type", agentId ? "agent_wallet_topup" : "agency_wallet_topup");
const port = arg("port", "30001");

if (!secret) {
  console.error("Missing --secret (must match the app's Test webhook secret)");
  process.exit(1);
}
if (!agencyId) {
  console.error("Missing --agency <agency-uuid> (copy it from Admin → Agencies → row → ID)");
  process.exit(1);
}
if (type === "agent_wallet_topup" && !agentId) {
  console.error("agent_wallet_topup needs --agent <agent-uuid>");
  process.exit(1);
}

const event = {
  id: `evt_local_${Date.now()}`,
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      payment_status: "paid",
      payment_intent: `pi_local_${Date.now()}`,
      amount_total: credit + fee,
      livemode: false,
      metadata: {
        type,
        agency_id: agencyId,
        ...(agentId ? { agent_id: agentId } : {}),
        credit_cents: String(credit),
        fee_cents: String(fee),
      },
    },
  },
};

const payload = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");

const res = await fetch(`http://localhost:${port}/api/webhooks/stripe`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": `t=${t},v1=${v1}` },
  body: payload,
});
const body = await res.text();
console.log(`HTTP ${res.status}`);
console.log(body);
