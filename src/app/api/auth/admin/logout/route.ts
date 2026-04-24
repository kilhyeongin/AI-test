// src/app/api/auth/admin/logout/route.ts
// [POST] 관리자 로그아웃 API — admin_session 쿠키 제거
// - EB(http)에서 Secure 쿠키 삭제 시도가 차단될 수 있으므로
//   x-forwarded-proto 기반으로 secure 플래그를 결정한다.

import { NextRequest, NextResponse } from "next/server";

function isHttpsRequest(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return xfProto.split(",")[0].trim() === "https";
  const url = new URL(req.url);
  return url.protocol === "https:";
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true, message: "logged_out" });

  const secure = isHttpsRequest(req);

  // ✅ 쿠키 삭제(확실하게)
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure,       // ✅ http면 false, https면 true
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return res;
}
