// [POST] 본인 비밀번호 변경
// - 입력: { currentPassword, newPassword }
// - 성공 시 sessionVersion +1 → 본인 쿠키 삭제(즉시 로그아웃)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { getAdminSession } from "@/lib/session";

function isStrongPassword(pw: string) {
  return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export async function POST(req: NextRequest) {
  try {
    const me = await getAdminSession();
    if (!me) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    if (!isStrongPassword(String(newPassword))) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(me.user.id).select("passwordHash sessionVersion");
    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 400 });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.sessionVersion = Number(user.sessionVersion ?? 0) + 1; // ✅ 세션 버전 증가
    await user.save();

    // ✅ 본인 쿠키 제거 → 즉시 로그아웃
    const res = NextResponse.json({ ok: true, loggedOut: true });
    res.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
