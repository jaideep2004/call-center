import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Coverage Calls",
  description: "Flexible plans for agencies of all sizes. From Basic to Enterprise, with monthly or annual billing.",
};

const plans = [
  { name: "Basic", price: "$99", period: "/month", desc: "For small agencies getting started.", features: ["Up to 5 agents", "1,000 call minutes", "Basic routing", "Email support", "Standard reports"], featured: false },
  { name: "Pro", price: "$249", period: "/month", desc: "For growing agencies.", features: ["Up to 20 agents", "5,000 call minutes", "Priority routing", "Call recording", "API access", "Chat support"], featured: true },
  { name: "Premium", price: "$499", period: "/month", desc: "For established agencies.", features: ["Up to 50 agents", "25,000 call minutes", "Round-robin & RTB", "Advanced analytics", "Custom integrations", "Priority support"], featured: false },
  { name: "Enterprise", price: "Custom", period: "", desc: "For large operations.", features: ["Unlimited agents", "Unlimited minutes", "All routing strategies", "White-label option", "Dedicated support", "SLA guarantee"], featured: false },
];

export default function PricingPage() {
  return (
    <section className="page-section">
      <div className="section-label">PRICING / 06</div>
      <h1>Simple pricing,<br />no surprises.</h1>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={`pricing-card${plan.featured ? " featured" : ""}`}>
            <h3>{plan.name}</h3>
            <div className="price">{plan.price}<span>{plan.period}</span></div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{plan.desc}</p>
            <ul>{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link className={`btn ${plan.featured ? "btn-primary" : ""}`} href="/register">
              {plan.name === "Enterprise" ? "Contact sales" : "Get started"}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
