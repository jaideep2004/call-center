"use client";

import { useState, FormEvent, Suspense } from "react";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const { error: signUpError } = await authClient.signUp.email({
        name, email, password,
        callbackURL: "/dashboard",
      });
      if (signUpError) {
        setError(signUpError.message ?? signUpError.statusText ?? "Registration failed");
        showToast(signUpError.message ?? "Registration failed", "error");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError("Unable to connect. Please check your connection and try again.");
      showToast("Unable to connect. Please check your connection and try again.", "error");
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

  return (
    <>
      <h1>{inviteToken ? "Join agency" : "Create account"}</h1>
      {inviteToken && <p className="auth-subtitle">You were invited to join an agency. Register below to accept.</p>}
      {!inviteToken && <p className="auth-subtitle">Register for a new operations account.</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label className="form-label" htmlFor="name">Full name</label>
          <input id="name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jenna Reyes" required autoComplete="name" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" required autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" minLength={8} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : "Create account"}
        </button>
      </form>
      <div className="auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="auth-form auth-loading">Loading registration form...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
