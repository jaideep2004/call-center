import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";

let cached: SupabaseClient | null = null;

/**
 * Lazy Supabase client for media storage (P2.1 CMS uploads). No module-scope
 * throw — misconfiguration surfaces as a 503 only when upload is attempted,
 * so paste-URL creatives keep working without storage keys.
 */
export async function getSupabase(): Promise<SupabaseClient> {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new AppError("Media storage is not configured — paste a media URL instead", 503);
  }
  cached = createClient(url, key);
  return cached;
}

export function invalidateSupabaseCache() {
  cached = null;
}
