"use client";

import Link from "next/link";

export default function VerifyPage() {
  return (
    <>
      <h1>Verify your email</h1>
      <div className="auth-success">
        Registration successful. We&apos;ve sent a verification link to your email.
        Please check your inbox and click the link to verify your account.
      </div>
      <div className="auth-footer">
        <Link href="/login">Go to sign in</Link>
      </div>
    </>
  );
}
