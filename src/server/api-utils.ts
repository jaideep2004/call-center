import { NextResponse } from "next/server";
import { AppError, AuthError, ForbiddenError } from "./errors";
import type { Role, Resource, Action } from "./services/permission-data";
import { hasPermission } from "./services/permission-data";
import { queryOne } from "./db";

// Simple in-memory auth cache with TTL
const authCache = new Map<string, { ctx: AuthContext; expiry: number }>();
// 60s: each hit avoids 3 DB round-trips (session lookup, membership, role).
// Sessions are validated every 60s max, so deactivation lands within a minute.
const AUTH_CACHE_TTL_MS = 60_000;

export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(data: T, message = "Success", meta?: Record<string, unknown>) {
  const body: ApiSuccess<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status: 200 });
}

export function okCached<T>(data: T, maxAge = 30, message = "Success", meta?: Record<string, unknown>) {
  const body: ApiSuccess<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
  });
}

export function created<T>(data: T, message = "Created successfully") {
  const body: ApiSuccess<T> = { success: true, message, data };
  return NextResponse.json(body, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(message: string, status: number = 400, errors?: string[]) {
  const body: ApiError = { success: false, message };
  if (errors) body.errors = errors;
  return NextResponse.json(body, { status });
}

export function paginated<T>(
  data: T[],
  pagination: PaginationMeta,
  message = "Success",
) {
  const body: ApiSuccess<T[]> & { pagination: PaginationMeta } = {
    success: true,
    message,
    data,
    pagination,
  };
  return NextResponse.json(body, { status: 200 });
}

export function paginatedCached<T>(
  data: T[],
  pagination: PaginationMeta,
  maxAge = 30,
  message = "Success",
) {
  const body: ApiSuccess<T[]> & { pagination: PaginationMeta } = {
    success: true,
    message,
    data,
    pagination,
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
  });
}

export function requirePermission(role: string | undefined, resource: Resource, action: Action): void {
  if (!role) throw new ForbiddenError("Authentication required");
  if (!hasPermission(role as Role, resource, action)) {
    throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContext {
  user: AuthUser;
  session: { id: string };
  agencyId: string | null;
  membership: { id: string; agency_id: string; role: string } | null;
}

type RouteParams = { params: Promise<Record<string, string>> };
type ApiHandler = (
  req: Request,
  context: RouteParams & Partial<AuthContext>,
) => Promise<NextResponse>;

interface ApiHandlerOptions {
  auth?: boolean;
  resource?: Resource;
  action?: Action;
}

async function resolveAuth(headers: Headers): Promise<AuthContext | null> {
  const sessionHeader = headers.get("cookie") ?? headers.get("authorization") ?? "";
  const cacheKey = sessionHeader.slice(0, 120);
  const cached = authCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.ctx;
  try {
    const { auth } = await import("./auth");
    const session = await (auth.api as any).getSession({ headers });
    if (!session?.user) return null;

    const membership = await queryOne<{ id: string; agency_id: string; role: string }>(
      `SELECT id, agency_id, role FROM app.memberships 
       WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [session.user.id],
    );

    const userRow = await queryOne<{ role: string }>(
      `SELECT role FROM "user" WHERE id = $1`,
      [session.user.id],
    );
    const role = userRow?.role ?? membership?.role ?? "agent";
    const ctx: AuthContext = {
      user: { id: session.user.id, email: session.user.email, name: session.user.name, role },
      session: session.session,
      agencyId: membership?.agency_id ?? null,
      membership,
    };
    if (cacheKey) authCache.set(cacheKey, { ctx, expiry: Date.now() + AUTH_CACHE_TTL_MS });
    return ctx;
  } catch {
    return null;
  }
}

export function apiHandler(handler: ApiHandler, options: ApiHandlerOptions = {}): ApiHandler {
  const { auth = true, resource, action } = options;
  return async (req, context) => {
    try {
      let authCtx: Partial<AuthContext> = {};

      if (auth) {
        const resolved = await resolveAuth(req.headers);
        if (!resolved) throw new AuthError();
        authCtx = resolved;
        if (resource && action) {
          requirePermission(resolved.user.role, resource, action);
        }
      }

      return await handler(req, { ...context, ...authCtx });
    } catch (error) {
      if (error instanceof AppError) {
        return fail(error.message, error.status, error.errors);
      }
      console.error("Unhandled API error:", error);
      return fail("Internal server error", 500);
    }
  };
}

export function publicApiHandler(handler: ApiHandler): ApiHandler {
  return apiHandler(handler, { auth: false });
}
