import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Testimonials — Coverage Calls",
  description: "Hear from agencies and agents who use Coverage Calls for their call operations.",
};

const testimonials = [
  { quote: "Coverage Calls cut our manual routing time to zero. The routing engine finds the right agent every time, and the wallet system means we never have to chase payments.", name: "Marcus Chen", role: "Agency Owner, Texas" },
  { quote: "The immutable ledger is a game changer for compliance. Every charge is transparent and auditable. Our agents trust the numbers because they can see exactly what happened.", name: "Sarah Okonkwo", role: "Operations Director, Florida" },
  { quote: "We switched from a legacy dialer to Coverage Calls and saw immediate improvements in call connect rates. The state and ZIP matching is precise.", name: "David Park", role: "Campaign Manager, Illinois" },
  { quote: "Real-time dashboard means I can see exactly what's happening with my campaigns at any moment. No more waiting for end-of-day reports.", name: "Elena Vasquez", role: "Agency Admin, California" },
  { quote: "Setting up a new campaign takes minutes instead of hours. The provider abstraction means I can test with mock data before going live.", name: "James Whitfield", role: "Technical Lead, Georgia" },
  { quote: "The referral program actually pays well, and the commission tracking is transparent. Best platform we've used for pay-per-call.", name: "Aisha Patel", role: "Agent, New York" },
];

export default function TestimonialsPage() {
  return (
    <section className="page-section">
      <div className="section-label">TESTIMONIALS / 05</div>
      <h1>Trusted by agencies<br />nationwide.</h1>
      <div className="testimonial-grid">
        {testimonials.map((t) => (
          <article key={t.name} className="testimonial-card">
            <p>&ldquo;{t.quote}&rdquo;</p>
            <div className="attribution">{t.name} — {t.role}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
