"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  message?: string;
  action?: { label: string; href: string };
  children?: ReactNode;
}

export default function EmptyState({ message = "No data found.", action, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {children}
      {message && <p>{message}</p>}
      {action && (
        <Link href={action.href} className="btn btn-sm" style={{ marginTop: "var(--space-3)" }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
