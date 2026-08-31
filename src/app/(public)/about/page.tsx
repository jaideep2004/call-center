import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Coverage Calls",
  description: "Coverage Calls powers high-value inbound call operations for insurance agencies nationwide.",
};

export default function AboutPage() {
  return (
    <section className="page-section">
      <div className="content-page">
        <div className="section-label">ABOUT / 01</div>
        <h1>Built for call operations that demand precision.</h1>
        <p>
          Coverage Calls is an operations platform for agencies that buy and route high-value inbound calls.
          We provide the infrastructure to receive calls, match them to the right agent, track every
          interaction, and bill accurately — all in one system.
        </p>
        <p>
          Our platform handles the full call lifecycle: from the moment a customer dials a business
          number through routing, connection, recording, billing, and analytics. Every event is
          recorded in an immutable ledger, every agent action is tracked, and every dollar is
          accounted for.
        </p>
        <p>
          Founded by engineers who built telephony systems at scale, Coverage Calls is designed for
          agencies that need reliability, transparency, and control over their call operations.
        </p>
      </div>
    </section>
  );
}
