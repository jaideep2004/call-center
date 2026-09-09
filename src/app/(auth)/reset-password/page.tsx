"use client";

import { useState, FormEvent, Suspense, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();

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
        <div className="auth-card__head">
          <p className="auth-card__eyebrow">Invalid link — 02</p>
          <h1 className="auth-card__title">Invalid link</h1>
          <p className="auth-card__subtitle">This password reset link is invalid or has expired.</p>
        </div>
        <div className="auth-error" role="alert" aria-live="polite">
          This password reset link is invalid or has expired. Request a new one and try again.
        </div>
        <div className="auth-footer">
          <Link href="/forgot-password">Request a new link</Link>
        </div>
      </>
    );
  }

  const hasError = Boolean(error);

  return (
    <>
      <div className="auth-card__head">
        <p className="auth-card__eyebrow">New password — 02</p>
        <h1 className="auth-card__title">Set new password</h1>
        <p className="auth-card__subtitle">Enter your new password below. You will sign in again afterwards.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {hasError && (
          <div id={errorId} className="auth-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            New password
          </label>
          <div className="password-wrapper">
            <input
              id="password"
              name="password"
              className="input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              minLength={8}
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? errorId : undefined}
              autoFocus
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            className="input"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat password…"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-required="true"
            aria-invalid={hasError || undefined}
          />
          <p className="auth-hint">Both fields must match · Paste allowed</p>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Resetting…</span>
            </>
          ) : (
            "Reset password"
          )}
        </button>
      </form>

      <div className="auth-footer">
        Remembered it? <Link href="/login">Back to sign in</Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "40px auto" }} aria-label="Loading reset form" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
