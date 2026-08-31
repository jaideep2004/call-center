import { BaseRepository } from "./base";

export interface AgentPlanRow {
  id: string;
  agency_id: string;
  name: string;
  price_cents: number;
  call_allowance: number;
  billing_type: string;
  features: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export class AgentPlanRepository extends BaseRepository<AgentPlanRow> {
  protected schema = "app";
  protected table = "agent_plans";

  async findByAgency(agencyId: string, onlyActive = false): Promise<AgentPlanRow[]> {
    if (onlyActive) {
      const { rows } = await this.findMany({ filters: { agency_id: agencyId, active: true } });
      return rows;
    }
    const { rows } = await this.findMany({ filters: { agency_id: agencyId } });
    return rows;
  }
}

export const agentPlans = new AgentPlanRepository();
