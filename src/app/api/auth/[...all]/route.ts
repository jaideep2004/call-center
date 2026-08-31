import { toNextJsHandler } from "better-auth/next-js";
import { auth, authConfigurationPresent } from "@/server/auth";
import { createRateLimiter, clientIp } from "@/server/rate-limit";

const handler = toNextJsHandler(auth.handler);
const unavailable = () => Response.json({ error: "Authentication service is not configured" }, { status: 503 });

// Throttle login/register/reset/verify attempts per IP (Redis-backed, memory fallback).
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

export async function GET(request: Request) { return authConfigurationPresent ? handler.GET(request) : unavailable(); }
export async function POST(request: Request) {
  if (!authConfigurationPresent) return unavailable();
  if (!(await authLimiter(clientIp(request)))) {
    return Response.json({ error: "Too many requests — try again in a minute" }, { status: 429 });
  }
  return handler.POST(request);
}
