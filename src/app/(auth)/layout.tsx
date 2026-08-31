"use client";

import Link from "next/link";
import { useToast } from "@/lib/use-toast";
import "@/styles/auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss } = useToast();

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-header">
          <Link className="wordmark" href="/">COVERAGE CALLS<span>▲</span></Link>
        </div>
        {children}
      </div>
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: "var(--space-6)", right: "var(--space-6)", display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type === "success" ? "toast-success" : ""}${t.type === "error" ? "toast-error" : ""}`} onClick={() => dismiss(t.id)} style={{ cursor: "pointer" }}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
