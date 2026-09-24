"use client";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import GhlBooking from "@/components/ghl-booking";

const BOOKED_KEY = "cc-onboarding-booked";

function OnboardingInner() {
  const searchParams = useSearchParams();
  // GHL lives in an iframe and cannot tell us a booking happened, so booked
  // state comes from two honest sources: GHL's redirect URL (?booked=1, set
  // up in the GHL calendar's thank-you redirect) or the agent confirming
  // manually below. Persisted per browser.
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (searchParams.get("booked") === "1") {
      try {
        window.localStorage.setItem(BOOKED_KEY, "1");
      } catch {}
      setBooked(true);
      showToast("Onboarding call booked — see you then", "success");
      window.history.replaceState({}, "", "/dashboard/onboarding");
      return;
    }
    try {
      setBooked(window.localStorage.getItem(BOOKED_KEY) === "1");
    } catch {}
  }, [searchParams]);

  function markBooked() {
    try {
      window.localStorage.setItem(BOOKED_KEY, "1");
    } catch {}
    setBooked(true);
    showToast("Marked as booked", "success");
  }

  function clearBooked() {
    try {
      window.localStorage.removeItem(BOOKED_KEY);
    } catch {}
    setBooked(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ONBOARDING</p>
          <h1>Book your onboarding call</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>
            Pick a time below. Your onboarding call with the Coverage Calls team will be confirmed by email.
          </p>
        </div>
        <Link href="/dashboard/campaign-updates" className="btn btn-secondary btn-sm">
          Campaign Updates →
        </Link>
      </div>
      {booked ? (
        <div className="card" style={{ borderColor: "rgba(34,197,94,.35)", padding: "var(--space-5)", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="badge badge-success">✓ BOOKED</span>
            <p style={{ margin: 0, fontSize: 13, flex: 1, minWidth: 200 }}>
              Your onboarding call is booked — check your email for the confirmation. Need a different time? Pick another slot below.
            </p>
            <button className="btn btn-ghost btn-sm" onClick={clearBooked}>Book again</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "var(--space-4) var(--space-5)", marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <p className="text-muted" style={{ margin: 0, fontSize: 12, flex: 1, minWidth: 200 }}>
              Already booked in the calendar below? Mark it so your dashboard reflects it.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={markBooked}>I&apos;ve booked my call</button>
          </div>
        </div>
      )}
      <GhlBooking
        heading="Onboarding Calendar"
        sub="Live booking calendar — your appointment is created directly in our scheduling system."
      />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <OnboardingInner />
    </Suspense>
  );
}
