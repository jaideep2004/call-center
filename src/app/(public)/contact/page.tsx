"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      setError("Phone must be in E.164 format (e.g. +12125551234)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.message ?? "Failed to submit");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <section className="page-section">
        <div className="section-label">CONTACT / 07</div>
        <h1>Message sent.</h1>
        <p className="text-body">We&apos;ll get back to you within 24 hours.</p>
        <Link className="text-link" href="/">Back to home</Link>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="section-label">CONTACT / 07</div>
      <h1>Get in touch.</h1>
      <div className="contact-grid">
        <div className="contact-info">
          <p>Have a question about the platform? Need help setting up your first campaign? Reach out and our team will respond within 24 hours.</p>
          <p>You can also reach us at <Link href="mailto:ops@coveragecalls.com" style={{ color: "var(--cyan)" }}>ops@coveragecalls.com</Link></p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full name</label>
            <input id="name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone (E.164)</label>
            <input id="phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+12125551234" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="message">Message</label>
            <textarea id="message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Send message"}
          </button>
        </form>
      </div>
    </section>
  );
}
