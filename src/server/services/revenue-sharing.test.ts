import { describe, expect, it } from "vitest";

interface Agency {
  id: string;
  parent_agency_id: string | null;
  commission_rate: number;
}

// Pure function replicating revenue sharing logic
function calculateCommission(
  subAgency: Agency,
  payoutCents: number,
): { parentAgencyId: string | null; commissionCents: number } {
  if (!subAgency.parent_agency_id || subAgency.commission_rate <= 0) {
    return { parentAgencyId: null, commissionCents: 0 };
  }
  const commissionCents = Math.floor(payoutCents * subAgency.commission_rate / 100);
  return { parentAgencyId: subAgency.parent_agency_id, commissionCents };
}

describe("revenue sharing commission", () => {
  const parentAgency: Agency = { id: "parent-1", parent_agency_id: null, commission_rate: 0 };
  const subAgency: Agency = { id: "sub-1", parent_agency_id: "parent-1", commission_rate: 20 };
  const subAgencyNoCommission: Agency = { id: "sub-2", parent_agency_id: "parent-1", commission_rate: 0 };

  it("calculates commission for sub-agency with parent", () => {
    const result = calculateCommission(subAgency, 1000);
    expect(result.parentAgencyId).toBe("parent-1");
    expect(result.commissionCents).toBe(200);
  });

  it("returns zero when no parent agency", () => {
    const result = calculateCommission(parentAgency, 1000);
    expect(result.parentAgencyId).toBeNull();
    expect(result.commissionCents).toBe(0);
  });

  it("returns null parent and zero commission when rate is 0", () => {
    const result = calculateCommission(subAgencyNoCommission, 1000);
    expect(result.parentAgencyId).toBeNull();
    expect(result.commissionCents).toBe(0);
  });

  it("rounds down fractional cents", () => {
    const result = calculateCommission(subAgency, 99);
    expect(result.commissionCents).toBe(19);
  });

  it("handles 100% commission", () => {
    const fullComm: Agency = { id: "sub-3", parent_agency_id: "parent-1", commission_rate: 100 };
    const result = calculateCommission(fullComm, 500);
    expect(result.commissionCents).toBe(500);
  });

  it("handles zero payout", () => {
    const result = calculateCommission(subAgency, 0);
    expect(result.commissionCents).toBe(0);
  });
});
