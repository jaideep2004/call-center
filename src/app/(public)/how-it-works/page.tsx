import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works — Coverage Calls",
  description: "From inbound call to qualified lead — Coverage Calls automates the entire lifecycle.",
};

const steps = [
  { label: "01", title: "Number provisioning", desc: "Port or purchase business numbers through our telephony partners. Assign each number to a campaign with routing rules, pricing, and agent requirements." },
  { label: "02", title: "Inbound call received", desc: "When a customer calls, our webhook receiver captures the event, verifies the signature, and forwards it to the routing engine for processing." },
  { label: "03", title: "Routing engine matches", desc: "The routing engine evaluates every available agent against state, ZIP, license, skills, business hours, wallet balance, and priority rules to find the best match." },
  { label: "04", title: "Agent rings & connects", desc: "The selected agent receives the call through their softphone or PSTN number. On accept, the call is bridged and recording begins automatically." },
  { label: "05", title: "Billing & ledger", desc: "Call duration is tracked, cost is calculated, and the wallet is charged automatically. Every transaction is recorded in the immutable ledger." },
  { label: "06", title: "Reports & analytics", desc: "All call data flows into dashboards with real-time metrics, revenue reports, agent performance, and exportable analytics." },
];

export default function HowItWorksPage() {
  return (
    <section className="page-section">
      <div className="section-label">HOW IT WORKS / 02</div>
      <h1>From call to cash —<br />fully automated.</h1>
      <div className="steps-grid">
        {steps.map((step) => (
          <article key={step.label} className="step-card">
            <span>{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
