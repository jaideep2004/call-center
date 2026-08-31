import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "coverage-calls-web", timestamp: new Date().toISOString() });
}
