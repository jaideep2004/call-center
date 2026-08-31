import { createHash } from "node:crypto";

/**
 * Normalize a phone number to E.164 form. Handles common US formats:
 * "15551234567", "+15551234567", "(555) 123-4567", "555-123-4567",
 * "+1 (555) 123-4567". Returns null when the number can't be interpreted.
 */
export function normalizeE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/**
 * SHA-256 hex hash of the normalized E.164 form. One canonical hashing for the
 * whole app (Telnyx inbound, Retreaver ingestion, reconciliation) so the same
 * caller produces the same hash on both sides.
 */
export function hashPhone(phone: string): string {
  const normalized = normalizeE164(phone) ?? phone;
  return createHash("sha256").update(normalized).digest("hex");
}
