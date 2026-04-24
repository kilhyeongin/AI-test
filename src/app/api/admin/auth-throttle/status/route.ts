// src/app/api/admin/auth-throttle/status/route.ts
// [GET] 로그인 잠금(Throttle) 상태 조회
// - OWNER/MANAGER만 조회 가능
// - query:
//   persona=admin|customer|land
//   identifierLower=... (선택)
//   ip=... (선택)
//   mode=account|ip|both (기본 both)
// - 반환: 해당 key들의 failCount/lockedUntil/updatedAt

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import { AuthThrottle } from "@/models/AuthThrottle";
import { makeThrottleKey, makeIpThrottleKey } from "@/lib/authThrottle";

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const roles = Array.isArray(sessionUser.roles) ? sessionUser.roles : [];
  if (!roles.includes("OWNER") && !roles.includes("MANAGER")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const persona = sp.get("persona") || "";
  const identifierLower = (sp.get("identifierLower") || "").trim();
  const ip = (sp.get("ip") || "").trim();
  const mode = sp.get("mode") || "both";

  if (!["admin", "customer", "land"].includes(persona)) {
    return NextResponse.json({ ok: false, error: "invalid_persona" }, { status: 400 });
  }

  const keys: string[] = [];

  if ((mode === "account" || mode === "both") && identifierLower) {
    keys.push(makeThrottleKey(persona as any, identifierLower.toLowerCase()));
  }
  if ((mode === "ip" || mode === "both") && ip) {
    keys.push(makeIpThrottleKey(persona as any, ip));
  }

  if (keys.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const rows = await AuthThrottle.find({ key: { $in: keys } })
    .select("key failCount firstFailAt lockedUntil updatedAt")
    .lean();

  // 현재 잠김 여부 계산
  const now = Date.now();
  const items = rows.map((r: any) => {
    const lockedUntil = r.lockedUntil ? new Date(r.lockedUntil) : null;
    const locked = lockedUntil ? lockedUntil.getTime() > now : false;
    return {
      key: String(r.key),
      failCount: Number(r.failCount ?? 0),
      firstFailAt: r.firstFailAt ? new Date(r.firstFailAt).toISOString() : null,
      lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
      locked,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
    };
  });

  return NextResponse.json({ ok: true, keys, items });
}
