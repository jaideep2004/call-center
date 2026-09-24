"use client";
import { Suspense } from "react";
import Link from "next/link";
import { CampaignUpdatesList } from "@/components/campaign-slots";

function CampaignUpdatesInner() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / CAMPAIGN UPDATES</p>
          <h1>Campaign Updates</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>
            Latest ads and announcements for your campaigns — images and videos play right here.
          </p>
        </div>
        <Link href="/dashboard/onboarding" className="btn btn-secondary btn-sm">
          Book Call →
        </Link>
      </div>
      <CampaignUpdatesList />
    </div>
  );
}

export default function CampaignUpdatesPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <CampaignUpdatesInner />
    </Suspense>
  );
}
