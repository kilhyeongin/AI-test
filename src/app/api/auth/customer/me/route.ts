// src/app/api/auth/customer/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Types } from "mongoose";

import {
  verifyCustomerSession,
  signCustomerSession,
} from "@/lib/customerJwt";
import {
  secondsLeft,
  RENEW_THRESHOLD_SECONDS,
} from "@/lib/jwtUtil";

export const runtime = "nodejs";

type CustomerLean = {
  _id: Types.ObjectId;
  loginId?: string;
  email?: string;
  name?: string;
  status: string;
  sessionVersion?: number;
};

export async function GET() {
  const c = await cookies();
  const token = c.get("client_session")?.value;

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 1) JWT 검증
  const payload = verifyCustomerSession(token);
  if (!payload || payload.persona !== "customer") {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 2) sub 검증
  const sub = String(payload.sub);
  if (!Types.ObjectId.isValid(sub)) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 3) DB 조회
  await connectDB();
  const user = await Customer.findById(sub)
    .select("loginId email name status sessionVersion")
    .lean<CustomerLean | null>();

  if (!user || user.status === "disabled") {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 4) ✅ sessionVersion 동기화 검증 (중요)
  const dbV = Number(user.sessionVersion ?? 0);
  const tokenV = Number((payload as any).sessionVersion ?? 0);
  if (dbV !== tokenV) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // 5) 기본 응답
  const res = NextResponse.json({
    ok: true,
    user: {
      id: String(user._id),
      loginId: user.loginId ?? "",
      email: user.email ?? "",
      name: user.name ?? "",
    },
  });

  // 6) ✅ 슬라이딩 만료 (exp 24시간 이하일 때만 재발급)
  const left = secondsLeft(payload.exp);
  if (left !== null && left <= RENEW_THRESHOLD_SECONDS) {
    const newToken = signCustomerSession({
      sub,
      persona: "customer",
      sessionVersion: dbV,
    });

    res.cookies.set("client_session", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14일
    });
  }

  return res;
}
