"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: forgotError } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    if (forgotError) {
      setError(forgotError.message ?? "Failed to send reset email");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1>Check your email</h1>
        <div className="auth-success">If an account exists for {email}, you&apos;ll receive a password reset link.</div>
        <div className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Reset password</h1>
      <p className="auth-subtitle">Enter your email to receive a reset link.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required autoComplete="email" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Send reset link"}
        </button>
      </form>
      <div className="auth-footer">
        <Link href="/login">Back to sign in</Link>
      </div>
    </>
  );
}
