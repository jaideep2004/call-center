"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      showToast("Enter your registration email", "error");
      return;
    }
    setSending(true);
    try {
      // better-auth endpoint: /api/auth/send-verification-email
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), callbackURL: "/dashboard" }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        showToast("Verification email re-sent — check inbox & spam", "success");
      } else {
        showToast(body.message ?? "Failed to resend — try logging in", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    }
    setSending(false);
  }

  return (
    <>
      <h1>Verify your email</h1>
      <div className="auth-success">
        Registration successful. We&apos;ve sent a verification link to your email. Please check your inbox
        and click the link to verify your account.
        <br />
        <span style={{ opacity: 0.7, fontSize: 11 }}>Didn&apos;t arrive? Check spam, or resend below.</span>
      </div>

      <form onSubmit={handleResend} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="form-label" htmlFor="resend-email">
          Resend verification link
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="resend-email"
            className="input"
            type="email"
            placeholder="you@publisher.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" type="submit" disabled={sending}>
            {sending ? <span className="spinner" /> : sent ? "Re-sent ✓" : "Resend"}
          </button>
        </div>
        {sent && <p style={{ font: "11px var(--mono)", color: "var(--muted)" }}>If the address exists, a new link is on the way (expires in 1 hour).</p>}
      </form>

      <div className="auth-footer" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Link href="/login">Go to sign in</Link>
        <span style={{ font: "11px var(--mono)", color: "var(--muted)" }}>
          Already verified? <Link href="/login" style={{ color: "var(--cyan)" }}>Sign in directly</Link>
        </span>
      </div>
    </>
  );
}
