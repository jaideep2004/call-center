/**
 * Canonical app base URL — single source of truth for every absolute URL
 * the server generates (Stripe Checkout success/cancel URLs, Retreaver
 * webhook URL, emails).
 *
 * Precedence:
 *   1. `APP_BASE_URL` (server canonical — set to the public origin per env:
 *      live `https://coveragecalls.com`, local ngrok URL, etc.)
 *   2. `NEXT_PUBLIC_APP_URL` (public fallback)
 *   3. `requestOrigin` — the incoming request's origin (last resort; wrong
 *      behind proxies/tunnels, which is why env must be set correctly)
 *   4. `http://localhost:30001` — matches `scripts/dev.js` default PORT.
 */
let warnedMissingBaseUrl = false;

export function getAppBaseUrl(requestOrigin?: string): string {
  const fromEnv = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const raw =
    fromEnv && fromEnv.trim()
      ? fromEnv
      : (requestOrigin ?? "http://localhost:30001");
  if (
    process.env.NODE_ENV === "production"
    && (!fromEnv || !fromEnv.trim())
    && !warnedMissingBaseUrl
  ) {
    warnedMissingBaseUrl = true;
    console.warn("[app-url] APP_BASE_URL/NEXT_PUBLIC_APP_URL unset in production — absolute URLs (Stripe redirects, Retreaver webhooks, emails) fall back to the request origin or localhost; set APP_BASE_URL to the public origin");
  }
  return raw.replace(/\/+$/, "");
}
