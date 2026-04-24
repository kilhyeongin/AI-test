// src/app/api/admin/auth-logs/list/route.ts
// [GET] 로그인 감사로그 조회 (관리자)
// - OWNER/MANAGER만 조회 허용 (원하면 OWNER만으로 좁혀도 됨)
// - query: persona, action, q(identifier/userId/ip), from, to, limit(<=200)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/authz";
import { AuthLog } from "@/models/AuthLog";

function forbidden() {
  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // ✅ 조회 권한(OWNER/MANAGER)
  const roles = Array.isArray(sessionUser.roles) ? sessionUser.roles : [];
  if (!roles.includes("OWNER") && !roles.includes("MANAGER")) return forbidden();

  await connectDB();

  const sp = req.nextUrl.searchParams;

  const persona = sp.get("persona"); // admin|customer|land
  const action = sp.get("action");   // login_success|login_fail|logout
  const q = (sp.get("q") || "").trim();
  const from = sp.get("from"); // ISO date
  const to = sp.get("to");     // ISO date
  const limit = Math.min(Number(sp.get("limit") || 100) || 100, 200);

  const filter: any = {};

  if (persona && ["admin", "customer", "land"].includes(persona)) filter.persona = persona;
  if (action && ["login_success", "login_fail", "logout"].includes(action)) filter.action = action;

  if (from || to) {
    filter.ts = {};
    if (from) filter.ts.$gte = new Date(from);
    if (to) filter.ts.$lte = new Date(to);
  }

  if (q) {
    // identifier/userId/ip 를 동시에 검색
    filter.$or = [
      { identifier: q },
      { userId: q },
      { ip: q },
      // 부분 검색도 허용(원하면 제거 가능)
      { identifier: { $regex: q, $options: "i" } },
      { userId: { $regex: q, $options: "i" } },
      { ip: { $regex: q, $options: "i" } },
    ];
  }

  const items = await AuthLog.find(filter)
    .sort({ ts: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ ok: true, items });
}
