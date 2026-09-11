"use client";

import { useState, FormEvent, Suspense, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: "/dashboard",
      });
      if (signUpError) {
        const msg = signUpError.message ?? signUpError.statusText ?? "Registration failed";
        setError(msg);
        showToast(msg, "error");
        setLoading(false);
        return;
      }
    } catch {
      const msg = "Unable to connect. Please check your connection and try again.";
      setError(msg);
      showToast(msg, "error");
      setLoading(false);
      return;
    }
    if (inviteToken) {
      localStorage.setItem("pending_invite", inviteToken);
    } else {
      fetch("/api/v1/agents/auto-create", { method: "POST" }).catch(() => {});
    }
    showToast("Account created! Check your email to verify.", "success");
    router.push("/verify");
  }

  const hasError = Boolean(error);

  return (
    <>
      <div className="auth-card__head">
        <p className="auth-card__eyebrow">{inviteToken ? "Invite — 01" : "Create account — 01"}</p>
        <h1 className="auth-card__title">{inviteToken ? "Join Coverage Calls" : "Create account"}</h1>
        <p className="auth-card__subtitle">
          {inviteToken ? "You were invited to join Coverage Calls. Register below to accept." : "Register for a new operations account."}
        </p>
      </div>

      {inviteToken && (
        <div className="auth-warning" role="status" aria-live="polite" style={{ marginBottom: 4 }}>
          <strong>Heads up:</strong> accepting this invite will set your account role to match the inviting organization. If you already
          have an agent or publisher account, your role will be upgraded — you may lose access to your current console.
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {hasError && (
          <div id={errorId} className="auth-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            className="input"
            type="text"
            autoComplete="name"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Jenna Reyes…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required="true"
            autoFocus={!inviteToken}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@coveragecalls.com…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
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
              autoComplete="new-password"
              placeholder="At least 8 characters…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              minLength={8}
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
          <p className="auth-hint">At least 8 characters · Paste allowed</p>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Creating…</span>
            </>
          ) : (
            "Create account"
          )}
        </button>

        <p className="auth-hint" style={{ textAlign: "center" }}>
          By continuing you agree to our{" "}
          <Link href="/terms" className="text-link" style={{ display: "inline" }}>
            Terms
          </Link>{" "}
          &amp;{" "}
          <Link href="/privacy" className="text-link" style={{ display: "inline" }}>
            Privacy
          </Link>
          .
        </p>
      </form>

      <div className="auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "40px auto" }} aria-label="Loading registration form" />}>
      <RegisterForm />
    </Suspense>
  );
}
