export type LedgerType = "top_up" | "reserve" | "release" | "charge" | "refund" | "manual_adjustment" | "payout" | "disposition_payout" | "transfer";
export interface LedgerEntry { id: string; type: LedgerType; amountCents: number; reference: string; }

export function walletBalance(entries: LedgerEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}

export function assertSpendableBalance(entries: LedgerEntry[], reservationCents: number) {
  const balance = walletBalance(entries);
  if (!Number.isInteger(reservationCents) || reservationCents <= 0) throw new Error("Reservation must be positive integer cents");
  if (balance < reservationCents) throw new Error("Insufficient wallet balance");
}
