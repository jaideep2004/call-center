import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Coverage Calls",
  description: "Common questions about Coverage Calls' routing, billing, and platform features.",
};

const faqs = [
  { q: "How does call routing work?", a: "When a customer calls your campaign number, the routing engine evaluates all available agents against your campaign rules — state license, skills, and business hours. The best matching agent receives the call on their softphone." },
  { q: "What telephony providers do you support?", a: "Coverage Calls integrates with Telnyx and Twilio. Our provider abstraction layer means you can switch providers without changing your routing configuration." },
  { q: "How is billing handled?", a: "Agents maintain a wallet balance. When a call is connected, the cost is calculated based on duration and campaign pricing. The exact amount is deducted from the wallet automatically. All transactions are recorded in the immutable ledger." },
  { q: "Can I manage multiple agencies?", a: "Yes. Coverage Calls supports multi-agency operation with isolated data per agency. Super admins can manage all agencies while each agency admin controls their own agents, campaigns, and settings." },
  { q: "How are call recordings stored?", a: "Recordings are retrieved from your telephony provider and can be played or downloaded from the dashboard. Access is controlled by role-based permissions." },
  { q: "What kind of reports are available?", a: "Revenue reports, agent performance, call volume analytics, conversion rates, average call duration, and wallet transaction history. All reports can be exported as CSV or Excel." },
];

export default function FAQPage() {
  return (
    <section className="page-section">
      <div className="section-label">FAQ / 04</div>
      <h1>Frequently asked<br />questions.</h1>
      <div className="faq-list">
        {faqs.map((faq) => (
          <article key={faq.q} className="faq-item">
            <h3>{faq.q}</h3>
            <p>{faq.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
