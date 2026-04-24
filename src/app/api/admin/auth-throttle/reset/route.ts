// src/app/api/admin/auth-throttle/reset/route.ts
// [POST] 로그인 잠금 해제(Throttle reset)
// - OWNER만 가능
// - 입력:
//   { persona: "admin"|"customer"|"land", identifierLower?: string, ip?: string, mode?: "account"|"ip"|"both" }
// - 내부에서 key를 계산해 AuthThrottle 삭제

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import { AuthThrottle } from "@/models/AuthThrottle";
import { makeThrottleKey, makeIpThrottleKey } from "@/lib/authThrottle";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (!Array.isArray(sessionUser.roles) || !sessionUser.roles.includes("OWNER")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json().catch(() => null);
  const persona = body?.persona as string;
  const identifierLower = typeof body?.identifierLower === "string" ? body.identifierLower.trim() : "";
  const ip = typeof body?.ip === "string" ? body.ip.trim() : "";
  const mode = (body?.mode as string) || "both";

  if (!["admin", "customer", "land"].includes(persona)) {
    return NextResponse.json({ ok: false, error: "invalid_persona" }, { status: 400 });
  }
  if (mode === "account" && !identifierLower) {
    return NextResponse.json({ ok: false, error: "missing_identifier" }, { status: 400 });
  }
  if (mode === "ip" && !ip) {
    return NextResponse.json({ ok: false, error: "missing_ip" }, { status: 400 });
  }
  if (mode === "both" && !identifierLower && !ip) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const keys: string[] = [];

  if ((mode === "account" || mode === "both") && identifierLower) {
    keys.push(makeThrottleKey(persona as any, identifierLower));
  }
  if ((mode === "ip" || mode === "both") && ip) {
    keys.push(makeIpThrottleKey(persona as any, ip));
  }

  if (keys.length === 0) {
    return NextResponse.json({ ok: false, error: "no_keys" }, { status: 400 });
  }

  const r = await AuthThrottle.deleteMany({ key: { $in: keys } });

  return NextResponse.json({ ok: true, deleted: r.deletedCount ?? 0, keys });
}
