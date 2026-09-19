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
export function getAppBaseUrl(requestOrigin?: string): string {
  const fromEnv = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const raw =
    fromEnv && fromEnv.trim()
      ? fromEnv
      : (requestOrigin ?? "http://localhost:30001");
  return raw.replace(/\/+$/, "");
}
