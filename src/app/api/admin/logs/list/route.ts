// GET /api/admin/logs/list
// OWNER만 접근 가능, 최근 100개 로그 반환

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AdminLog } from "@/models/AdminLog";
import { getSessionUser } from "@/lib/authz";

export async function GET() {
  const user = await getSessionUser();
  if (!user) 
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  // ✅ 바로 여기 — OWNER 권한 확인
  if (!user.roles.includes("OWNER"))
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  await connectDB();

  const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(100).lean();

  return NextResponse.json({ ok: true, logs });
}
