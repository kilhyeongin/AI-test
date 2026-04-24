// [POST] 최고관리자(OWNER)가 관리자 계정을 직접 생성하는 API
// - 입력: { email, name?, password, role }  (role: "OWNER" | "MANAGER" | "STAFF")
// - 동작: persona="admin" 로 user 생성(전역 유일: persona+emailLower)
// - 권한 체크(MVP): 호출자는 일단 미들웨어로 보호된 영역에서만 접근한다고 가정
// - 운영 시엔 JWT의 roles에 OWNER 포함 여부 검사 권장

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  await connectDB();

  const { email, name, password, role } = await req.json();
  if (!email || !password || !role) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const emailLower = String(email).trim().toLowerCase();

  // 중복 검사: 전역에서 persona=admin + emailLower 유일
  const exists = await User.findOne({ persona: "admin", emailLower }).lean();
  if (exists) {
    return NextResponse.json({ ok: false, error: "already_registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const doc = await User.create({
    email,
    emailLower,
    name: name ?? "",
    passwordHash,
    persona: "admin",
    roles: [role],      // 기본 한 개 권한
    status: "active",
  });

  return NextResponse.json({
    ok: true,
    user: { id: String(doc._id), email: doc.email, roles: doc.roles, name: doc.name },
  });
}
