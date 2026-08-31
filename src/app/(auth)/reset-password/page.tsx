"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!token) {
      setError("Invalid reset link");
      return;
    }
    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (resetError) {
      setError(resetError.message ?? "Failed to reset password");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return (
      <>
        <h1>Invalid link</h1>
        <div className="auth-error">This password reset link is invalid or has expired.</div>
        <div className="auth-footer"><Link href="/forgot-password">Request a new link</Link></div>
      </>
    );
  }

  return (
    <>
      <h1>Set new password</h1>
      <p className="auth-subtitle">Enter your new password below.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label className="form-label" htmlFor="password">New password</label>
          <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" minLength={8} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required autoComplete="new-password" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Reset password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="spinner" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
