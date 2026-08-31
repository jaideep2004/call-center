"use client";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Something went wrong.", onRetry }: ErrorStateProps) {
  return (
    <div className="error-banner">
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-sm" style={{ marginTop: "var(--space-3)" }} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
