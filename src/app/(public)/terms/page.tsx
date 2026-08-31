import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Coverage Calls",
};

export default function TermsPage() {
  return (
    <section className="page-section">
      <div className="content-page">
        <div className="section-label">TERMS / 09</div>
        <h1>Terms of Service</h1>
        <p>By using Coverage Calls, you agree to these terms. If you do not agree, do not use the platform.</p>
        <p><strong>Account Responsibility.</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
        <p><strong>Service Usage.</strong> You agree to use the platform only for lawful purposes and in accordance with all applicable laws and regulations. Prohibited uses include fraudulent activity, spam, and any violation of telephony regulations.</p>
        <p><strong>Billing.</strong> Fees are calculated based on your plan and call usage. Wallet deductions are automatic and non-reversible except as provided in our refund policy. Invoices are generated for each billing cycle.</p>
        <p><strong>Limitation of Liability.</strong> Coverage Calls is provided as-is. We are not liable for damages arising from use of the platform, including dropped calls, routing errors, or data loss beyond our control.</p>
        <p><strong>Termination.</strong> Either party may terminate the agreement with 30 days notice. Upon termination, your data will be exported or deleted according to your instructions.</p>
      </div>
    </section>
  );
}
