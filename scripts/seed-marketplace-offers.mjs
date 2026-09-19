// Seed the client-confirmed marketplace offers (P1.1 + real price sheet 2026-09-15).
// Usage: DATABASE_URL=... node scripts/seed-marketplace-offers.mjs
// Idempotent: skips campaigns whose name already exists (never overwrites
// admin-edited prices — except the FE Long $65->$70 correction below, which
// only touches rows still carrying the old seed price).
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const OFFERS = [
  { name: "Medicare Short Buffer - 30 Seconds", price_cents: 1600, max_publisher_payout_cents: 1000, min_publisher_payout_cents: 1000, min_connected_seconds: 30, buffer_seconds: 30, visibility: "default", is_exclusive: false },
  { name: "Medicare Long Buffer - 120 Seconds", price_cents: 3500, max_publisher_payout_cents: 2000, min_publisher_payout_cents: 2000, min_connected_seconds: 120, buffer_seconds: 30, visibility: "default", is_exclusive: false },
  { name: "Final Expense TV Commercial - Short Buffer 30 Seconds", price_cents: 5000, max_publisher_payout_cents: 3500, min_publisher_payout_cents: 3500, min_connected_seconds: 30, buffer_seconds: 30, visibility: "default", is_exclusive: false },
  { name: "Final Expense TV Commercial - Long Buffer 90 Seconds", price_cents: 7000, max_publisher_payout_cents: 5000, min_publisher_payout_cents: 5000, min_connected_seconds: 90, buffer_seconds: 30, visibility: "default", is_exclusive: false },
  // Exclusive options ("Only For Agents/Agencies"): seeded draft + unassigned.
  // Head assigns agents/agencies in the UI, sets payouts in the Bidding tab
  // (client sheet lists buyer prices only), then activates. Excluded from the
  // open RTB pool; routeCall enforces the assignment match.
  { name: "Medicare Exclusive $27 - 90 Seconds", price_cents: 2700, max_publisher_payout_cents: null, min_publisher_payout_cents: null, min_connected_seconds: 90, buffer_seconds: 30, visibility: "exclusive", is_exclusive: true },
  { name: "Medicare Exclusive $15 - 30 Seconds", price_cents: 1500, max_publisher_payout_cents: null, min_publisher_payout_cents: null, min_connected_seconds: 30, buffer_seconds: 30, visibility: "exclusive", is_exclusive: true },
  { name: "Medicare Exclusive $32 - 180 Seconds", price_cents: 3200, max_publisher_payout_cents: null, min_publisher_payout_cents: null, min_connected_seconds: 180, buffer_seconds: 30, visibility: "exclusive", is_exclusive: true },
  { name: "Medicare Exclusive $28 - 120 Seconds", price_cents: 2800, max_publisher_payout_cents: null, min_publisher_payout_cents: null, min_connected_seconds: 120, buffer_seconds: 30, visibility: "exclusive", is_exclusive: true },
  { name: "Final Expense Exclusive $65 - 90 Seconds", price_cents: 6500, max_publisher_payout_cents: null, min_publisher_payout_cents: null, min_connected_seconds: 90, buffer_seconds: 30, visibility: "exclusive", is_exclusive: true },
];

const client = await pool.connect();
try {
  const ag = await client.query(`SELECT id FROM app.agencies ORDER BY created_at ASC LIMIT 1`);
  if (!ag.rows[0]) throw new Error("No agency found — create one first");
  const agencyId = ag.rows[0].id;
  for (const o of OFFERS) {
    const exists = await client.query(`SELECT id, price_cents FROM app.campaigns WHERE name = $1 AND deleted_at IS NULL LIMIT 1`, [o.name]);
    if (exists.rows[0]) {
      console.log(`skip (exists): ${o.name}`);
      continue;
    }
    await client.query(
      `INSERT INTO app.campaigns (agency_id, name, routing_strategy, status, price_cents, max_publisher_payout_cents, min_publisher_payout_cents, visibility, is_exclusive, min_connected_seconds, buffer_seconds, record_calls, allowed_endpoints)
       VALUES ($1,$2,'round_robin','draft',$3,$4,$5,$6,$7,$8,$9,true,'{webrtc,pstn}')`,
      [agencyId, o.name, o.price_cents, o.max_publisher_payout_cents, o.min_publisher_payout_cents, o.visibility, o.is_exclusive, o.min_connected_seconds, o.buffer_seconds],
    );
    console.log(`created: ${o.name}`);
  }
  // One-time correction (price sheet 2026-09-15): FE Long default is $70, not
  // $65 ($65 is the exclusive 90s variant). Only touches rows still carrying
  // the old seed price — admin edits are never overwritten.
  const corrected = await client.query(
    `UPDATE app.campaigns SET price_cents = 7000
      WHERE name = 'Final Expense TV Commercial - Long Buffer 90 Seconds'
        AND price_cents = 6500 AND deleted_at IS NULL`,
  );
  if (corrected.rowCount > 0) console.log(`corrected FE Long default price to $70 (${corrected.rowCount} row)`);
} finally {
  client.release();
  await pool.end();
}
