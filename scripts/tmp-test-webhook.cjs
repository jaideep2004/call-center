require("dotenv").config();

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:30001";
const TOKEN = process.env.RETREAVER_WEBHOOK_SECRET;
if (!TOKEN) {
  console.error("RETREAVER_WEBHOOK_SECRET not set in .env");
  process.exit(1);
}

const url = `${BASE}/api/webhooks/retreaver?token=${TOKEN}`;
const post = (payload) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

(async () => {
  console.log("1) finished call on your number +18886713949 (payout $3.25)...");
  console.log("   ->", await post({
    uuid: "test-11111111-1111-1111-1111-111111111111",
    dialed_number: "+18886713949",
    status: "finished",
    connected: "1",
    payout: "3.25",
    total_duration: "92",
    caller: "+15559998888",
    created_at: new Date().toISOString(),
  }));

  console.log("2) same uuid again (status update - should upsert, not duplicate)...");
  console.log("   ->", await post({
    uuid: "test-11111111-1111-1111-1111-111111111111",
    dialed_number: "+18886713949",
    status: "finished",
    connected: "1",
    payout: "3.25",
    total_duration: "95",
  }));

  console.log("3) call to an unknown number (should be skipped)...");
  console.log("   ->", await post({
    uuid: "test-22222222-2222-2222-2222-222222222222",
    dialed_number: "+12223334444",
    status: "finished",
    connected: "1",
    payout: "1.00",
  }));
})();
