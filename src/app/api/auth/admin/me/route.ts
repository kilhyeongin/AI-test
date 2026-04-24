// src/app/api/auth/admin/me/route.ts
// [GET] 내 세션 조회 (로그인 페이지에서 사용)
// - getSessionUser()로 권한/상태 검증
// - JWT exp 임박 시 슬라이딩 재발급

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSessionUser } from "@/lib/authz";
import { verifyAdminSession, issueAdminSession } from "@/lib/jwt";
import { secondsLeft, RENEW_THRESHOLD_SECONDS } from "@/lib/jwtUtil";

export async function GET() {
  const user = await getSessionUser();

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401, headers });
  }

  const res = NextResponse.json({ ok: true, user }, { status: 200, headers });

  // ✅ 쿠키에서 원본 토큰 읽기
  const c = await cookies();
  const token = c.get("admin_session")?.value;
  if (!token) return res;

  // ✅ JWT payload 재확인
  const decoded = verifyAdminSession(token);
  if (!decoded) return res;

  const left = secondsLeft(decoded.exp);

  // ✅ 슬라이딩 재발급
  if (left !== null && left <= RENEW_THRESHOLD_SECONDS) {
    const newToken = issueAdminSession({
      sub: decoded.sub,                 // ✅ 여기
      persona: "admin",
      roles: decoded.roles,
      sessionVersion: decoded.sessionVersion, // ✅ 여기
    });

    res.cookies.set("admin_session", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2, // 2시간
    });
  }

  return res;
}
