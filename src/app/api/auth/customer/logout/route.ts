// src/app/api/auth/customer/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { verifyCustomerSession } from "@/lib/customerJwt";
import { Types } from "mongoose";

function isHttps(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (!xfProto) return false;
  return xfProto.split(",")[0].trim() === "https";
}

export async function POST(req: NextRequest) {
  // 1) 토큰 읽기
  const c = await cookies();
  const token = c.get("client_session")?.value || "";

  // 2) 기본 응답(쿠키 삭제)
  const res = NextResponse.json({ ok: true });

  // ✅ 프록시 환경 고려 (customer/login과 동일 정책 추천)
  const secure = process.env.NODE_ENV === "production" ? isHttps(req) : false;

  res.cookies.set("client_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  // 토큰이 없거나 깨졌으면 “쿠키만 삭제”로 종료 (UX 우선)
  const payload = token ? verifyCustomerSession(token) : null;
  if (!payload || payload.persona !== "customer") return res;

  const sub = String(payload.sub);
  if (!Types.ObjectId.isValid(sub)) return res;

  // 3) ✅ sessionVersion 증가로 기존 토큰 무효화
  await connectDB();
  await Customer.updateOne(
    { _id: sub },
    { $inc: { sessionVersion: 1 } }
  ).catch(() => {});

  return res;
}
