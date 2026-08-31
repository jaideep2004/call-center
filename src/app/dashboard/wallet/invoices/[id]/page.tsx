"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface InvoiceDetail {
  id: string;
  call_id: string | null;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/invoices/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setInvoice(body.data);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  if (!invoice) return (
    <div className="dashboard-page">
      <div className="dashboard-page-header"><h1>Invoice not found</h1></div>
      <button className="btn btn-secondary" onClick={() => router.push("/dashboard/wallet/invoices")}>Back to invoices</button>
    </div>
  );

  function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> FINANCE / INVOICE</p>
          <h1>Invoice {invoice.id.slice(0, 8)}</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/wallet/invoices")}>Back</button>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <dl className="data-list">
          <dt>Invoice ID</dt><dd className="text-mono-sm">{invoice.id}</dd>
          <dt>Status</dt><dd><span className={`badge${invoice.status === "paid" ? " badge-success" : ""}${invoice.status === "disputed" ? " badge-danger" : ""}`}>{invoice.status}</span></dd>
          <dt>Amount</dt><dd className="text-mono-sm" style={{ fontSize: 24 }}>{formatCents(invoice.total_cents)} {invoice.currency}</dd>
          <dt>Call</dt><dd className="text-mono-sm">{invoice.call_id ?? "—"}</dd>
          <dt>Created</dt><dd className="text-mono-sm">{new Date(invoice.created_at).toLocaleString()}</dd>
        </dl>
      </div>
    </div>
  );
}
