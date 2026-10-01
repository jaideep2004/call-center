import { publicApiHandler, ok, fail } from "@/server/api-utils";

export const runtime = "nodejs";

/**
 * POST /api/v1/auth/verify-captcha — Google reCAPTCHA v2 checkbox check for
 * the registration form. Google marks each token consumed on verify, so a
 * token proves one human signup and cannot be replayed for a second account.
 * Unconfigured (no secret) = open registration (dev); the form hides the
 * widget in that case.
 */
export const POST = publicApiHandler(async (req) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return fail("Captcha not configured", 501);
  const body = (await req.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return fail("Captcha token required", 400);
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    const verdict = (await res.json().catch(() => ({}))) as { success?: boolean };
    if (!verdict.success) return fail("Captcha check failed — please try again", 403);
    return ok({ verified: true });
  } catch {
    return fail("Captcha service unreachable — please try again", 502);
  }
});
