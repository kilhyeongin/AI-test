// [POST] /api/admin/users/reset-password
// - OWNER만 실행 가능
// - 입력: { userId, newPassword }
// - 대상 사용자의 비밀번호를 새로 해시하여 저장
// - sessionVersion을 증가시켜 기존 세션 만료 처리
// - 변경 내역은 AdminLog에 기록됨

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/crypto";
import { getSessionUser } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // ✅ OWNER만 가능
  if (!sessionUser.roles.includes("OWNER")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { userId, newPassword } = await req.json();

  if (!userId || typeof newPassword !== "string") {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  // ✅ 비밀번호 규칙 검사
  const len = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  if (!len || !hasLetter || !hasDigit) {
    return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
  }

  await connectDB();

  // ✅ 대상 유저 찾기
  const user = await User.findOne({ _id: userId, persona: "admin" })

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // ✅ 비밀번호 변경 및 sessionVersion 증가
  user.passwordHash = await hashPassword(newPassword);
  user.sessionVersion = (user.sessionVersion || 0) + 1; // 기존 세션 무효화
  await user.save();

  // ✅ 비밀번호 변경 로그 남기기
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/admin/logs/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "비밀번호 변경",
        targetEmail: user.email,
        details: `${sessionUser.email} → ${user.email}`,
      }),
    });
  } catch (e) {
    console.error("로그 저장 실패:", e);
  }

  return NextResponse.json({ ok: true });
}
