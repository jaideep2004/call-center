"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
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
    } catch (err) {
      setLoading(false);
      const msg = "Unable to connect. Please check your connection and try again.";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    const pendingInvite = localStorage.getItem("pending_invite");
    if (pendingInvite) {
      localStorage.removeItem("pending_invite");
      fetch(`/api/v1/invites/${pendingInvite}/accept`, { method: "POST" });
    }
    showToast("Signed in successfully", "success");
    router.push(redirect);
    router.refresh();
  }

  return (
    <>
      <h1>Sign in</h1>
      <p className="auth-subtitle">Access your operations console.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input id="password" className="input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="stack-h" style={{ justifyContent: "flex-end" }}>
          <Link className="text-link" href="/forgot-password">Forgot password?</Link>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Sign in"}
        </button>
      </form>
      <div className="auth-footer">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: "40px auto" }} />}>
      <LoginForm />
    </Suspense>
  );
}
