// POST /api/admin/logs/add
// - 관리자 행동 로그 저장용 내부 API
// - OWNER 이상 권한만 호출 가능 (단, 비밀번호 변경 API에서 내부 호출용으로도 사용됨)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AdminLog } from "@/models/AdminLog";
import { getSessionUser } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { action, targetEmail, details } = body;

  await connectDB();

  await AdminLog.create({
    actorId: user.id,
    actorEmail: user.email,
    action,
    targetEmail,
    details,
  });

  return NextResponse.json({ ok: true });
}
