"use client";
import { Suspense, useState } from "react";
import GhlBooking from "@/components/ghl-booking";
import { CampaignUpdatesList } from "@/components/campaign-slots";

function OnboardingInner() {
  const [tab, setTab] = useState<"book" | "updates">("book");
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ONBOARDING</p>
          <h1>{tab === "book" ? "Book your onboarding call" : "Campaign updates"}</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>
            {tab === "book"
              ? "Pick a time below. Your onboarding call with the Coverage Calls team will be confirmed by email."
              : "Latest ads and announcements for your campaigns — images and videos play right here."}
          </p>
        </div>
      </div>
      <nav className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <button type="button" className={`tab ${tab === "book" ? "active" : ""}`} onClick={() => setTab("book")}>Book Call</button>
        <button type="button" className={`tab ${tab === "updates" ? "active" : ""}`} onClick={() => setTab("updates")}>Campaign Updates</button>
      </nav>
      {tab === "book" ? (
        <GhlBooking
          heading="Onboarding Calendar"
          sub="Live booking calendar — your appointment is created directly in our scheduling system."
        />
      ) : (
        <CampaignUpdatesList />
      )}
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
