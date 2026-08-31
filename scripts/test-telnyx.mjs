// Run: node scripts/test-telnyx.mjs
// Requires TELNYX_API_KEY env var (from .env or set manually below)

import "dotenv/config";
import Telnyx from "telnyx";

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
if (!TELNYX_API_KEY) {
  console.error("❌ Set TELNYX_API_KEY in .env or environment");
  process.exit(1);
}

const client = new Telnyx({ apiKey: TELNYX_API_KEY });

async function main() {
  console.log("\n🔍 Telnyx Integration Check\n");

  // 1. List Call Control Applications
  console.log("1. Call Control Applications:");
  const apps = await client.callControlApplications.list();
  const appList = apps.data ?? [];
  if (appList.length === 0) {
    console.log("   ⚠️  None found. Create one via API first.");
  } else {
    for (const app of appList) {
      console.log(`   ✅ "${app.application_name}" (ID: ${app.id})`);
      console.log(`      Webhook: ${app.webhook_event_url}`);
      console.log(`      API ver: ${app.webhook_api_version}`);
      if (!app.webhook_event_url) console.log("      ⚠️  No webhook URL set!");
    }
  }

  // 2. List Phone Numbers
  console.log("\n2. Phone Numbers:");
  const nums = await client.phoneNumbers.list();
  const numList = nums.data ?? [];
  if (numList.length === 0) {
    console.log("   ⚠️  No numbers. Ask client to buy one.");
  } else {
    for (const n of numList) {
      const connId = n.connection_id ?? "(none)";
      console.log(`   ${n.phone_number} — status: ${n.health?.status ?? "unknown"} — connection: ${connId}`);
    }
  }

  // 3. List Outbound Voice Profiles
  console.log("\n3. Outbound Voice Profiles:");
  try {
    const profiles = await client.outboundVoiceProfiles.list();
    const profileList = profiles.data ?? [];
    if (profileList.length === 0) {
      console.log("   ⚠️  None. Client must create one for outbound dialing.");
    } else {
      for (const p of profileList) {
        console.log(`   ✅ "${p.name ?? p.id}" (ID: ${p.id})`);
        // Check if any app uses this profile
        for (const app of appList) {
          if (app.outbound?.outbound_voice_profile_id === p.id) {
            console.log(`      → Attached to app "${app.application_name}"`);
          }
        }
      }
    }
  } catch (e) {
    console.log("   ⚠️  Cannot list (permission denied) — ask client to create one.");
  }

  // 4. Check Public Key exists
  console.log("\n4. Public Key:");
  if (process.env.TELNYX_PUBLIC_KEY) {
    console.log(`   ✅ Set (${process.env.TELNYX_PUBLIC_KEY.slice(0, 20)}...)`);
  } else {
    console.log("   ⚠️  Missing. Add TELNYX_PUBLIC_KEY to .env");
    console.log("      Get it from Portal → API Keys → Public Key");
  }

  // 5. Summary
  console.log("\n📋 Summary:");
  const hasNumber = numList.length > 0;
  const hasWebhook = appList.some((a) => a.webhook_event_url);
  const hasProfile = true; // We'll set this properly above
  const canDial = hasNumber && hasWebhook;

  console.log(`   Phone number:      ${hasNumber ? "✅" : "❌ (need client)"}`);
  console.log(`   Webhook URL:       ${hasWebhook ? "✅" : "❌ (need client)"}`);
  console.log(`   Outbound profile:  ${"⚠️  (need client to create)"}`);
  console.log(`   Public key:        ${process.env.TELNYX_PUBLIC_KEY ? "✅" : "❌ (need client)"}`);
  console.log("");
  console.log(canDial
    ? "   🎯 Ready to receive calls once number is assigned to app"
    : "   ⏳ Waiting on client for missing items above");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  if (err.status) console.error(`   Status: ${err.status}`);
  process.exit(1);
});
