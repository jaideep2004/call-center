import "dotenv/config";
import { PgBoss } from "pg-boss";
import { routeCall, finalizeCall } from "@/server/services/call-orchestrator";
import { syncRetreaverCalls } from "@/server/services/retreaver";
import { linkRetreaverCalls } from "@/server/services/retreaver-link";
import { expireStaleRtbReservations } from "@/server/services/retreaver-rtb";
import { runCallMaintenance } from "@/server/services/call-cleanup";
import { generateMonthlyFees, generateWeeklyInvoices } from "@/server/services/agent-fees";
import { purgeExpiredRecordings } from "@/server/services/recording-purge";
import { storeRecording, type StoreRecordingInput } from "@/server/services/recording-store";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for call-worker");

// useListenNotify wakes workers the moment a job lands (Postgres NOTIFY) so a
// route-call job is picked up without waiting out the poll interval. It needs
// a session-pinned connection; through a transaction-pooling proxy pg-boss
// warns and falls back to polling (pollingIntervalSeconds on the queue).
const boss = new PgBoss({ connectionString, schema: "jobs", useListenNotify: true });

async function main() {
  await boss.start();

  // Ensure every queue exists before scheduling — pg-boss schedule() inserts
  // into jobs.schedule, which has a FK to jobs.queue, but does NOT create the
  // queue itself. createQueue is idempotent.
  for (const name of [
    "route-call",
    "finalize-call",
    "store-recording",
    "sync-retreaver-calls",
    "link-retreaver-calls",
    "expire-ringing-calls",
    "expire-rtb-reservations",
    "generate-agent-fees",
    "generate-weekly-invoices",
    "purge-expired-recordings",
  ]) {
    await boss.createQueue(name);
  }

  // ~30s cadence: the per-campaign ring_timeout_seconds drives accuracy, this
  // just bounds how stale a no-answer can get before failover kicks in.
  // runCallMaintenance serializes the sweep across instances (advisory lock),
  // and per-row dialing/failover is claim-guarded, so overlapping ticks are safe.
  await boss.schedule("expire-ringing-calls", "*/30 * * * * *");

  // 1st of month: Dialer Fee (postpaid) + Software Access (prepaid) fee rows.
  // Monday 00:00: weekly per-agency invoice from pending fees (client Q6).
  await boss.schedule("generate-agent-fees", "0 0 1 * *");
  await boss.schedule("generate-weekly-invoices", "0 0 * * 1");
  // Recording retention: daily sweep of expired purge_at rows.
  await boss.schedule("purge-expired-recordings", "0 2 * * *");

  if (process.env.RETREAVER_API_KEY && process.env.RETREAVER_COMPANY_ID) {
    await boss.schedule("sync-retreaver-calls", "*/10 * * * *");
    await boss.schedule("link-retreaver-calls", "*/5 * * * *");
    await boss.schedule("expire-rtb-reservations", "*/5 * * * *");
    console.info("retreaver scheduled jobs enabled");
  }

  // Per-job settlement: each route-call job fails independently so pg-boss
  // retries (retryLimit 2 / retryDelay 3, set at send time) apply per job. The
  // job is idempotent via the routing→ringing claim, so redelivery is safe.
  await boss.work("route-call", {
    localConcurrency: 12,
    perJobResults: true,
    batchSize: 5,
    pollingIntervalSeconds: 0.5,
    burstWhenBatchFull: true,
    notify: true,
  }, async (jobs) => {
    const results: Array<{ id: string; status: "completed" | "failed"; output?: unknown }> = [];
    for (const job of jobs) {
      try {
        const { callId } = job.data as { callId: string };
        const result = await routeCall(callId);
        console.info(JSON.stringify({ event: "call_routed", jobId: job.id, callId, selected: result.selected, claimed: result.claimed }));
        results.push({ id: job.id, status: "completed", output: { callId, selected: result.selected } });
      } catch (error) {
        console.error(JSON.stringify({ event: "route_failed", jobId: job.id, error: String(error) }));
        results.push({ id: job.id, status: "failed", output: { callId: (job.data as { callId: string })?.callId, error: String(error) } });
      }
    }
    return results;
  });

  await boss.work("finalize-call", { localConcurrency: 6, notify: true, pollingIntervalSeconds: 0.5 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const { callId } = job.data as { callId: string };
        const result = await finalizeCall(callId);
        console.info(JSON.stringify({ event: "call_finalized", jobId: job.id, callId, result }));
      } catch (error) {
        console.error(JSON.stringify({ event: "finalize_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("sync-retreaver-calls", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const stored = await syncRetreaverCalls();
        console.info(JSON.stringify({ event: "retreaver_synced", jobId: job.id, stored }));
      } catch (error) {
        console.error(JSON.stringify({ event: "retreaver_sync_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("link-retreaver-calls", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const { linked } = await linkRetreaverCalls();
        console.info(JSON.stringify({ event: "retreaver_linked", jobId: job.id, linked }));
      } catch (error) {
        console.error(JSON.stringify({ event: "retreaver_link_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("store-recording", { localConcurrency: 3 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const stored = await storeRecording(job.data as StoreRecordingInput);
        console.info(JSON.stringify({ event: "recording_stored", jobId: job.id, callId: stored.call_id, url: stored.storage_path.slice(0, 64) }));
      } catch (error) {
        console.error(JSON.stringify({ event: "recording_store_failed", jobId: job.id, error: String(error) }));
        throw error; // pg-boss retries (retryLimit/retryDelay set at send time)
      }
    }
  });

  await boss.work("expire-ringing-calls", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const { expired, requeued, stuckFailed, skipped } = await runCallMaintenance();
        console.info(JSON.stringify({ event: "ringing_expired", jobId: job.id, expired, requeued, stuckFailed, skipped }));
      } catch (error) {
        // Scheduled reconciliation: don't retry the job itself — next 30s tick re-runs the sweep.
        console.error(JSON.stringify({ event: "ringing_expire_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("expire-rtb-reservations", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const expired = await expireStaleRtbReservations();
        console.info(JSON.stringify({ event: "rtb_expired", jobId: job.id, expired }));
      } catch (error) {
        console.error(JSON.stringify({ event: "rtb_expire_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("generate-agent-fees", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const { generated, skipped } = await generateMonthlyFees();
        console.info(JSON.stringify({ event: "agent_fees_generated", jobId: job.id, generated, skipped }));
      } catch (error) {
        console.error(JSON.stringify({ event: "agent_fees_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("generate-weekly-invoices", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const { invoices: created, feesIncluded } = await generateWeeklyInvoices();
        console.info(JSON.stringify({ event: "weekly_invoices_generated", jobId: job.id, created, feesIncluded }));
      } catch (error) {
        console.error(JSON.stringify({ event: "weekly_invoices_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  await boss.work("purge-expired-recordings", { localConcurrency: 1 }, async (jobs) => {
    for (const job of jobs) {
      try {
        const { purged } = await purgeExpiredRecordings();
        console.info(JSON.stringify({ event: "recordings_purged", jobId: job.id, purged }));
      } catch (error) {
        console.error(JSON.stringify({ event: "recordings_purge_failed", jobId: job.id, error: String(error) }));
      }
    }
  });

  console.info("call-worker ready");
}

main().catch((error) => { console.error(error); process.exit(1); });
