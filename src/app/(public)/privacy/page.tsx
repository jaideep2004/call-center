import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Coverage Calls",
};

export default function PrivacyPage() {
  return (
    <section className="page-section">
      <div className="content-page">
        <div className="section-label">PRIVACY / 08</div>
        <h1>Privacy Policy</h1>
        <p>This Privacy Policy explains how Coverage Calls collects, uses, and protects your information when you use our platform.</p>
        <p><strong>Information We Collect.</strong> We collect account information (name, email, phone), call metadata (duration, timestamps, routing data), and billing information. We do not store call audio content beyond your configured retention period.</p>
        <p><strong>How We Use Information.</strong> We use your information to operate the platform, route calls, process billing, provide support, and improve our services. We do not sell personal data to third parties.</p>
        <p><strong>Data Retention.</strong> Call recordings are retained according to your campaign settings (1-3650 days). Account data is retained until you request deletion. Wallet transaction records are retained indefinitely for audit purposes.</p>
        <p><strong>Security.</strong> We implement industry-standard security measures including encryption in transit and at rest, access controls, and regular security audits.</p>
        <p><strong>Contact.</strong> For privacy-related inquiries, contact ops@coveragecalls.com.</p>
      </div>
    </section>
  );
}
