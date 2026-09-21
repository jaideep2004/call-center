"use client";
import { Suspense } from "react";
import GhlBooking from "@/components/ghl-booking";

function OnboardingInner() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ONBOARDING</p>
          <h1>Book your onboarding call</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>Pick a time below. Your onboarding call with the Coverage Calls team will be confirmed by email.</p>
        </div>
      </div>
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
