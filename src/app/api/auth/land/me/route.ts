// src/app/api/auth/land/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import { verifyLandSession, signLandSession } from "@/lib/landJwt";
import { Types } from "mongoose";

import { secondsLeft, RENEW_THRESHOLD_SECONDS } from "@/lib/jwtUtil";

export const runtime = "nodejs";

type LandLean = {
  _id: Types.ObjectId;
  landName: string;
  ownerName: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  sessionVersion?: number;
};

export async function GET() {
  await connectDB();

  // ✅ cookie에서 land_session 읽기
  const c = await cookies();
  const token = c.get("land_session")?.value;

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // ✅ 표준 landJwt 검증
  const sess = verifyLandSession(token);
  if (!sess || sess.persona !== "land") {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const sub = String(sess.sub);
  if (!Types.ObjectId.isValid(sub)) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // ✅ DB 조회
  const doc = await LandAgency.findById(sub)
    .select("landName ownerName email status sessionVersion")
    .lean<LandLean | null>();

  if (!doc) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // ✅ 승인 상태만 통과
  if (doc.status !== "APPROVED") {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // ✅ sessionVersion 비교 (토큰 무효화 핵심)
  const dbV = Number(doc.sessionVersion ?? 0);
  const tokenV = Number(sess.sessionVersion ?? 0);
  if (dbV !== tokenV) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // ✅ 기본 응답
  const res = NextResponse.json({
    ok: true,
    land: {
      id: String(doc._id),
      landName: doc.landName,
      ownerName: doc.ownerName,
      email: doc.email,
      status: doc.status,
    },
  });

  // ✅ 슬라이딩 만료 (exp 24시간 이하일 때만 재발급)
  const left = secondsLeft((sess as any).exp);
  if (left !== null && left <= RENEW_THRESHOLD_SECONDS) {
    const newToken = signLandSession({
      sub: String(doc._id),
      persona: "land",
      sessionVersion: dbV,
    });

    res.cookies.set("land_session", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14일
    });
  }

  return res;
}
