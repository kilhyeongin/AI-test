// src/app/api/admin/auth-logs/summary/route.ts
// [GET] AuthLog 요약 통계 (최근 24시간 기본)
// - OWNER/MANAGER만 조회 가능
// - query:
//   hours=24 (기본 24)
//   persona=admin|customer|land (선택)
// - 반환:
//   - counts: success/fail/logout
//   - topIpsFail: 실패 TOP IP
//   - topIdsFail: 실패 TOP identifier
//   - byPersona: persona별 success/fail

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/authz";
import { AuthLog } from "@/models/AuthLog";

type Persona = "admin" | "customer" | "land";
type Action = "login_success" | "login_fail" | "logout";

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

  const hoursRaw = sp.get("hours");
  const hours = Math.max(1, Math.min(168, Number(hoursRaw ?? 24))); // 1~168h (7일)
  const persona = sp.get("persona") as Persona | null;

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const match: any = { ts: { $gte: since } };
  if (persona && ["admin", "customer", "land"].includes(persona)) {
    match.persona = persona;
  }

  // 1) 전체 카운트 (action별)
  const countsAgg = await AuthLog.aggregate([
    { $match: match },
    { $group: { _id: "$action", n: { $sum: 1 } } },
  ]);

  const counts: Record<Action, number> = {
    login_success: 0,
    login_fail: 0,
    logout: 0,
  };
  for (const row of countsAgg) {
    const k = String(row._id) as Action;
    if (k in counts) counts[k] = Number(row.n ?? 0);
  }

  // 2) persona별 성공/실패
  const byPersonaAgg = await AuthLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: { persona: "$persona", action: "$action" },
        n: { $sum: 1 },
      },
    },
  ]);

  const byPersona: Record<Persona, { login_success: number; login_fail: number }> = {
    admin: { login_success: 0, login_fail: 0 },
    customer: { login_success: 0, login_fail: 0 },
    land: { login_success: 0, login_fail: 0 },
  };

  for (const row of byPersonaAgg) {
    const p = row?._id?.persona as Persona;
    const a = row?._id?.action as Action;
    if (!p || !(p in byPersona)) continue;
    if (a === "login_success") byPersona[p].login_success = Number(row.n ?? 0);
    if (a === "login_fail") byPersona[p].login_fail = Number(row.n ?? 0);
  }

  // 3) 실패 TOP IP
  const topIpsFail = await AuthLog.aggregate([
    { $match: { ...match, action: "login_fail", ip: { $exists: true, $ne: "" } } },
    { $group: { _id: "$ip", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 10 },
  ]).then((rows) =>
    rows.map((r: any) => ({ ip: String(r._id), n: Number(r.n ?? 0) }))
  );

  // 4) 실패 TOP identifier (아이디/이메일 등)
  const topIdsFail = await AuthLog.aggregate([
    {
      $match: {
        ...match,
        action: "login_fail",
        identifier: { $exists: true, $ne: "" },
      },
    },
    { $group: { _id: "$identifier", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 10 },
  ]).then((rows) =>
    rows.map((r: any) => ({ identifier: String(r._id), n: Number(r.n ?? 0) }))
  );

  return NextResponse.json({
    ok: true,
    hours,
    since: since.toISOString(),
    counts,
    byPersona,
    topIpsFail,
    topIdsFail,
  });
}
