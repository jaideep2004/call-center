import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Choose Us — Coverage Calls",
  description: "Coverage Calls offers real-time routing, immutable ledger, agency management, and enterprise-grade reliability.",
};

const features = [
  { title: "Real-time routing engine", desc: "Match calls to the best available agent based on state, ZIP, license, skills, schedule, wallet balance, and priority rules — in milliseconds." },
  { title: "Immutable financial ledger", desc: "Every wallet transaction is recorded in an append-only ledger. No deletions, no edits. Full audit trail for every charge, refund, and top-up." },
  { title: "Multi-agency support", desc: "Manage multiple agencies, sub-agents, and teams from a single platform. Each agency gets isolated data with role-based access control." },
  { title: "Pay-per-call billing", desc: "Agents are charged only for connected calls that meet your quality threshold. Automated wallet deduction with no manual invoicing." },
  { title: "Call recording & storage", desc: "Every call is recorded and stored securely in cloud storage. Set retention policies per campaign. Play back or download recordings from the dashboard." },
  { title: "Real-time dashboards", desc: "Monitor live call queues, agent availability, revenue metrics, and system health — all updated in real time through WebSocket events." },
];

export default function WhyChooseUsPage() {
  return (
    <section className="page-section-light page-section">
      <div className="section-label" style={{ color: "#c084fc" }}>WHY CHOOSE US / 03</div>
      <h2>Built for agencies<br />that outgrow spreadsheets.</h2>
      <div className="feature-grid">
        {features.map((f) => (
          <article key={f.title} className="feature-card">
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
