"use client";

import { useState, FormEvent, Suspense, useRef, useId } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email: email.trim(), password });
      if (signInError) {
        setLoading(false);
        if (signInError.message?.toLowerCase().includes("verify")) {
          const msg = "Please verify your email before signing in.";
          setError(msg);
          showToast(msg, "error");
        } else {
          const msg = signInError.message ?? signInError.statusText ?? "Invalid email or password";
          setError(msg);
          showToast(msg, "error");
        }
        return;
      }
    } catch {
      setLoading(false);
      const msg = "Unable to connect. Please check your connection and try again.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    const pendingInvite = localStorage.getItem("pending_invite");
    if (pendingInvite) {
      localStorage.removeItem("pending_invite");
      fetch(`/api/v1/invites/${pendingInvite}/accept`, { method: "POST" }).catch(() => {});
    }
    showToast("Signed in successfully", "success");
    window.location.href = redirect;
  }

  const hasError = Boolean(error);

  return (
    <>
      <div className="auth-card__head">
        <p className="auth-card__eyebrow">Sign in — 01</p>
        <h1 className="auth-card__title">Sign in</h1>
        <p className="auth-card__subtitle">Access your operations console.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {hasError && (
          <div id={errorId} className="auth-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@agency.com…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <div className="password-wrapper">
            <input
              id="password"
              name="password"
              className="input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={hasError || undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={0}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="auth-actions-row">
          <span className="auth-hint" aria-hidden="true">
            Paste allowed · 1Password supported
          </span>
          <Link className="text-link" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Signing in…</span>
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="auth-hint" style={{ textAlign: "center", marginTop: 2 }}>
          Protected by rate limiting · Encrypted in transit
        </p>
      </form>

      <div className="auth-footer">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "40px auto" }} aria-label="Loading sign in form" />}>
      <LoginForm />
    </Suspense>
  );
}
