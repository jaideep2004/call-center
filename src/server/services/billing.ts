export interface BillingResult {
  connectedSeconds: number;
  bufferSeconds: number;
  billableSeconds: number;
  totalCents: number;
}

export function calculateBilling(
  connectedSeconds: number,
  bufferSeconds: number = 30,
  pricePerSecondCents: number = 10,
): BillingResult {
  const billableSeconds = Math.max(0, connectedSeconds - bufferSeconds);
  const totalCents = Math.max(
    billableSeconds * pricePerSecondCents,
    billableSeconds > 0 ? pricePerSecondCents * 10 : 0,
  );
  return { connectedSeconds, bufferSeconds, billableSeconds, totalCents };
}
