// src/app/api/auth/land/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import { verifyLandSession } from "@/lib/landJwt";
import { Types } from "mongoose";

function isHttps(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (!xfProto) return false;
  return xfProto.split(",")[0].trim() === "https";
}

export async function POST(req: NextRequest) {
  // 1) 쿠키에서 토큰 읽기
  const c = await cookies();
  const token = c.get("land_session")?.value || "";

  // 2) 응답 생성 + 쿠키 삭제(로그아웃)
  const res = NextResponse.json({ ok: true });

  const secure = process.env.NODE_ENV === "production" ? isHttps(req) : false;

  res.cookies.set("land_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  // 3) 토큰이 없거나 깨졌으면 쿠키 삭제만 하고 종료
  const payload = token ? verifyLandSession(token) : null;
  if (!payload || payload.persona !== "land") return res;

  const sub = String(payload.sub);
  if (!Types.ObjectId.isValid(sub)) return res;

  // 4) ✅ sessionVersion 증가로 "기존 토큰" 완전 무효화
  await connectDB();
  await LandAgency.updateOne({ _id: sub }, { $inc: { sessionVersion: 1 } }).catch(
    () => {}
  );

  return res;
}
