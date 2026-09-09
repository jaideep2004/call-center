import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/api/v1/health", "/api/auth"];
const authPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p));
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname.startsWith(p));
}

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("__Secure-better-auth.session_token")?.value
    ?? request.cookies.get("better-auth.session_token")?.value
    ?? request.cookies.get("__session")?.value;

  const response = NextResponse.next();

  response.headers.set("x-robots-tag", "noindex, nofollow");
  response.headers.set("x-content-type-options", "nosniff");

  if (sessionCookie) {
    response.headers.set("x-authenticated", "true");
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/agent") || pathname.startsWith("/agency")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAuthPath(pathname) && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/v1/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
