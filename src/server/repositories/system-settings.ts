import { queryOne, query } from "@/server/db";

export interface SystemSettingRow {
  key: string;
  value: Record<string, unknown> | boolean | string | number;
  updated_at: string;
}

export class SystemSettingRepository {
  async get(key: string): Promise<unknown | null> {
    const row = await queryOne<{ value: unknown }>(
      `SELECT value FROM app.system_settings WHERE key = $1`,
      [key],
    );
    return row?.value ?? null;
  }

  async getBoolean(key: string, fallback = false): Promise<boolean> {
    const value = await this.get(key);
    if (typeof value === "boolean") return value;
    if (value && typeof value === "object") {
      return Boolean((value as Record<string, unknown>).enabled ?? fallback);
    }
    return fallback;
  }

  async set(key: string, value: unknown): Promise<void> {
    await query(
      `INSERT INTO app.system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    );
  }
}

export const systemSettings = new SystemSettingRepository();
