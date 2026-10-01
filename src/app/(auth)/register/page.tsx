"use client";

import { useState, FormEvent, Suspense, useId, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const captchaRef = useRef<HTMLDivElement | null>(null);
  const captchaWidget = useRef<number | null>(null);

  // reCAPTCHA v2 checkbox (only when a site key is configured).
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || !captchaRef.current) return;
    let cancelled = false;
    const render = () => {
      const grecaptcha = (window as unknown as { grecaptcha?: { render: (el: HTMLDivElement, opts: object) => number; reset: (id?: number) => void } }).grecaptcha;
      if (!grecaptcha || cancelled || !captchaRef.current) return;
      if (captchaWidget.current == null) {
        captchaWidget.current = grecaptcha.render(captchaRef.current, { sitekey: RECAPTCHA_SITE_KEY });
      }
    };
    if (!(window as unknown as { grecaptcha?: unknown }).grecaptcha) {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      render();
    }
    return () => { cancelled = true; };
  }, []);

  function resetCaptcha() {
    try {
      const grecaptcha = (window as unknown as { grecaptcha?: { reset: (id?: number) => void } }).grecaptcha;
      grecaptcha?.reset(captchaWidget.current ?? undefined);
    } catch { /* best-effort */ }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    const cleanPhone = phone.trim();
    if (cleanPhone && !/^[+\d][\d\s\-().]{5,24}$/.test(cleanPhone)) {
      const msg = "Enter a valid phone number or leave it blank";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setLoading(true);
    try {
      // Human check first: Google consumes the token on verify, so it proves
      // this signup and cannot be replayed for another account.
      if (RECAPTCHA_SITE_KEY) {
        const grecaptcha = (window as unknown as { grecaptcha?: { getResponse: (id?: number) => string } }).grecaptcha;
        const token = grecaptcha?.getResponse(captchaWidget.current ?? undefined) ?? "";
        if (!token) {
          const msg = "Please complete the captcha";
          setError(msg);
          showToast(msg, "error");
          setLoading(false);
          return;
        }
        const verifyRes = await fetch("/api/v1/auth/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!verifyRes.ok) {
          const body = await verifyRes.json().catch(() => ({} as { message?: string }));
          const msg = body.message ?? "Captcha check failed";
          setError(msg);
          showToast(msg, "error");
          resetCaptcha();
          setLoading(false);
          return;
        }
      }
      const { error: signUpError } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: "/dashboard",
        ...(cleanPhone ? { phone_number: cleanPhone } : {}),
      } as Parameters<typeof authClient.signUp.email>[0]);
      if (signUpError) {
        const msg = signUpError.message ?? signUpError.statusText ?? "Registration failed";
        setError(msg);
        showToast(msg, "error");
        resetCaptcha();
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
    }
    // NOTE: no auto-create call here — there is no session yet (401) and the
    // profile is ensured where it matters: invite accept, agency create, and
    // the Take Calls "Create Agent Profile" button (all self-scoped).
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
          <label className="form-label" htmlFor="phone">
            Phone number <span className="text-muted">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoCorrect="off"
            spellCheck={false}
            placeholder="+1 555 123 4567…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-required="false"
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

        {RECAPTCHA_SITE_KEY ? (
          <div className="form-group">
            <div ref={captchaRef} />
          </div>
        ) : null}

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
