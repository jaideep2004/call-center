import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTrackingLinkData, recordTrackingClick } from "@/server/services/publisher-portal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function prettyPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ afid: string }>; searchParams: Promise<{ cid?: string }> }) {
  const { afid } = await params;
  const { cid } = await searchParams;
  const data = cid ? await getTrackingLinkData(afid, cid).catch(() => null) : null;
  return {
    title: data ? `Call about ${data.campaignName} — Coverage Calls` : "Coverage Calls",
    robots: { index: false, follow: false },
  };
}

export default async function TrackingLinkPage({ params, searchParams }: { params: Promise<{ afid: string }>; searchParams: Promise<{ cid?: string }> }) {
  const { afid } = await params;
  const { cid } = await searchParams;
  if (!cid) notFound();
  const data = await getTrackingLinkData(afid, cid).catch(() => null);
  if (!data) notFound();

  const hdrs = await headers();
  const referrer = hdrs.get("referer");
  const host = referrer ? (() => { try { return new URL(referrer).host; } catch { return null; } })() : null;
  // Logged for the publisher's click stats; awaited (single indexed insert).
  await recordTrackingClick({ publisherId: data.publisherId, campaignId: data.campaignId, referrer: host });

  const pretty = prettyPhone(data.trackingNumber);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "radial-gradient(1200px 600px at 50% -10%, rgba(124,58,237,.25), transparent), #0B0714",
        color: "#F4F2FB",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          borderRadius: 20,
          border: "1px solid rgba(168,85,247,.25)",
          background: "rgba(255,255,255,.04)",
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "0 24px 80px rgba(0,0,0,.5)",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: ".22em", color: "#A78BFA", fontWeight: 700 }}>COVERAGE CALLS</p>
        <h1 style={{ margin: "12px 0 6px", fontSize: 24, lineHeight: 1.25 }}>{data.campaignName}</h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "rgba(244,242,251,.65)", lineHeight: 1.6 }}>
          Tap below to speak with a licensed specialist now. Free call, no obligation.
        </p>
        <a
          href={`tel:${data.trackingNumber}`}
          style={{
            display: "block",
            borderRadius: 14,
            padding: "18px 16px",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: ".02em",
            color: "#fff",
            textDecoration: "none",
            background: "linear-gradient(135deg, #7C3AED, #A855F7)",
            boxShadow: "0 12px 32px rgba(124,58,237,.45)",
          }}
        >
          📞 {pretty}
        </a>
        <p style={{ margin: "18px 0 0", fontSize: 11, color: "rgba(244,242,251,.45)", lineHeight: 1.6 }}>
          Calls may be recorded for quality assurance.
        </p>
      </div>
    </main>
  );
}
