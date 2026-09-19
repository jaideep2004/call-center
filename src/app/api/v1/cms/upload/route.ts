import { apiHandler, ok, fail } from "@/server/api-utils";
import { getSupabase } from "@/server/storage";

export const runtime = "nodejs";

const BUCKET = "cms-uploads";
const LIMITS = { image: 5 * 1024 * 1024, video: 50 * 1024 * 1024 } as const;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/**
 * POST /api/v1/cms/upload — CMS media upload (P2.1). Multipart `file` field.
 * Images <=5MB, videos <=50MB. Returns the public URL for `media_url`.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; otherwise 503 with a
 * clear message (admins keep the paste-URL flow, which always works).
 */
export const POST = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return fail("file (multipart) is required", 400);

  const mime = (file as Blob & { type?: string }).type || "application/octet-stream";
  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : null;
  if (!kind) return fail(`Unsupported media type: ${mime} (images + mp4/webm only)`, 415);
  if (file.size <= 0) return fail("Empty file", 400);
  if (file.size > LIMITS[kind]) {
    return fail(`${kind === "image" ? "Images" : "Videos"} must be <= ${LIMITS[kind] / 1024 / 1024}MB`, 413);
  }
  const ext = EXT_BY_MIME[mime] ?? (kind === "image" ? "png" : "mp4");
  const supabase = await getSupabase();

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) return fail(`Storage bucket unavailable: ${error.message}`, 503);
  }

  const path = `cms/${agencyId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (uploadError) return fail(`Upload failed: ${uploadError.message}`, 502);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return ok({ url: data.publicUrl, type: kind, size: file.size }, "Upload complete");
}, { resource: "cms", action: "manage" });
