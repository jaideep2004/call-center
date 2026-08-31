import { BaseRepository } from "./base";

export interface TutorialRow {
  id: string;
  agency_id: string;
  title: string;
  content: string;
  category: string;
  video_url: string | null;
  duration_seconds: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export class TutorialRepository extends BaseRepository<TutorialRow> {
  protected schema = "app";
  protected table = "tutorials";

  async findByAgency(agencyId: string): Promise<TutorialRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId },
      sortBy: "created_at",
      order: "desc",
    });
    return rows;
  }

  async create(data: {
    agency_id: string;
    title: string;
    content: string;
    category?: string;
    video_url?: string;
    duration_seconds?: number;
    tags?: string[];
  }): Promise<TutorialRow> {
    return super.create(data);
  }

  async update(
    id: string,
    data: { title?: string; content?: string; category?: string; video_url?: string; duration_seconds?: number; tags?: string[] },
    agencyId: string,
  ): Promise<TutorialRow> {
    return super.update(id, { ...data, updated_at: new Date().toISOString() }, agencyId);
  }
}

export const tutorials = new TutorialRepository();
