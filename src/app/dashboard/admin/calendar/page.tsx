"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Retired: admins never received onboarding booking entries here (agents book
 * through the GoHighLevel widget; entries live in GoHighLevel, not our
 * tables). The nav entry is gone; this redirect keeps old bookmarks working.
 */
export default function AdminCalendarRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/admin");
  }, [router]);
  return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>
        <div className="skeleton skeleton-text" />
      </div>
    </div>
  );
}
