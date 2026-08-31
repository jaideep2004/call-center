import { BaseRepository, FindManyParams } from "./base";

export interface InvoiceRow {
  id: string;
  agency_id: string;
  call_id: string | null;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export class InvoiceRepository extends BaseRepository<InvoiceRow> {
  protected schema = "app";
  protected table = "invoices";

  async findById(id: string, agencyId?: string): Promise<InvoiceRow> {
    return super.findById(id, agencyId);
  }

  async findMany(params: FindManyParams & { agencyId?: string; status?: string } = {}) {
    return super.findMany({
      ...params,
      filters: {
        ...(params.agencyId ? { agency_id: params.agencyId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...params.filters,
      },
    });
  }

  async create(data: {
    agency_id: string;
    call_id: string;
    total_cents: number;
    status: string;
  }): Promise<InvoiceRow> {
    return super.create(data);
  }
}

export const invoices = new InvoiceRepository();
