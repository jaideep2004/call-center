export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const c = abs % 100;
  const str = `$${dollars.toLocaleString("en-US")}.${c.toString().padStart(2, "0")}`;
  return cents < 0 ? `-${str}` : str;
}

/**
 * Phase 4 (point 3): Stripe processing fee passed to the user, in basis
 * points (300 = 3%). Single canonical helper — server checkout routes and
 * dashboard breakdown UI must use this so the preview always matches the
 * charge. Fee rounds to the nearest cent; the wallet is credited the exact
 * user-entered amount, the fee is stored on the payment row for audit.
 */
export const STRIPE_FEE_BPS = 300;

export function stripeFeeCents(amountCents: number): number {
  return Math.round((amountCents * STRIPE_FEE_BPS) / 10_000);
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "\u2014";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Google Drive share links (…/file/d/ID/view, …/open?id=ID) render as HTML
 * pages — <img>/<video> show nothing. Rewrite to the direct-download form
 * so pasted Drive links just work. Anything else passes through untouched.
 */
export function normalizeMediaUrl(url: string): string {
  const raw = (url ?? "").trim();
  if (!raw) return raw;
  const fileMatch = raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  const openMatch = raw.match(/drive\.google\.com\/open\?([^#]*)/);
  if (openMatch) {
    const idMatch = openMatch[1].match(/(?:^|&)id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }
  return raw;
}
