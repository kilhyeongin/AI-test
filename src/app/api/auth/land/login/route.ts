// src/app/api/auth/land/login/route.ts
// [POST] 랜드 로그인
// - 입력: { email, password }
// - 동작: emailLower로 조회 → 상태/비번 검증 → JWT(sub/persona/sessionVersion) 발급 → HttpOnly 쿠키 저장
// - ✅ 실패 제한: 계정(emailLower) + IP 병행 throttle
// - ✅ 감사로그(AuthLog): 성공/실패 기록
// - ✅ secure 판정: x-forwarded-proto 기반(EB/ALB 대응)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import bcrypt from "bcryptjs";

import {
  makeThrottleKey,
  makeIpThrottleKey,
  isLocked,
  recordFail,
  recordIpFail,
  resetThrottle,
} from "@/lib/authThrottle";
import { getClientIp } from "@/lib/requestIp";
import { writeAuthLog } from "@/lib/authLog";
import { signLandSession } from "@/lib/landJwt";

function isHttps(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (!xfProto) return false;
  return xfProto.split(",")[0].trim() === "https";
}

export async function POST(req: NextRequest) {
  await connectDB();

  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const emailLower = String(email).trim().toLowerCase();

  // ✅ throttle: 계정 + IP 둘 다 체크
  const accountKey = makeThrottleKey("land", emailLower);
  const ipKey = makeIpThrottleKey("land", ip);

  const lock1 = await isLocked(accountKey);
  const lock2 = await isLocked(ipKey);
  if (lock1.locked || lock2.locked) {
    await writeAuthLog({
      persona: "land",
      action: "login_fail",
      identifier: emailLower,
      ip,
      ua,
      reason: "too_many_attempts",
    });
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }

  // ✅ 표준: emailLower로 조회
  const doc = await LandAgency.findOne({ emailLower })
    .select("email landName ownerName passwordHash status sessionVersion")
    .lean<{
      _id: unknown;
      email: string;
      landName: string;
      ownerName: string;
      passwordHash: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      sessionVersion?: number;
    } | null>();

  // 계정 없음 → 실패 누적(열거 방지)
  if (!doc) {
    await recordFail(accountKey);
    await recordIpFail(ipKey);
    await writeAuthLog({
      persona: "land",
      action: "login_fail",
      identifier: emailLower,
      ip,
      ua,
      reason: "invalid_credentials",
    });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  // 비밀번호 검증
  const ok = await bcrypt.compare(String(password), String(doc.passwordHash));
  if (!ok) {
    await recordFail(accountKey);
    await recordIpFail(ipKey);
    await writeAuthLog({
      persona: "land",
      action: "login_fail",
      identifier: emailLower,
      userId: String(doc._id),
      ip,
      ua,
      reason: "invalid_credentials",
    });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  // 상태 체크 (미승인/거절은 로그인 불가)
  if (doc.status === "PENDING") {
    // 운영 정책상 카운트 누적은 선택이지만, 열거 방지 관점에서 누적하는 편이 안전
    await recordFail(accountKey);
    await recordIpFail(ipKey);
    await writeAuthLog({
      persona: "land",
      action: "login_fail",
      identifier: emailLower,
      userId: String(doc._id),
      ip,
      ua,
      reason: "pending",
    });
    return NextResponse.json({ ok: false, error: "pending" }, { status: 403 });
  }

  if (doc.status === "REJECTED") {
    await recordFail(accountKey);
    await recordIpFail(ipKey);
    await writeAuthLog({
      persona: "land",
      action: "login_fail",
      identifier: emailLower,
      userId: String(doc._id),
      ip,
      ua,
      reason: "rejected",
    });
    return NextResponse.json({ ok: false, error: "rejected" }, { status: 403 });
  }

  // ✅ 성공: 실패 기록 초기화(계정키 + IP키)
  await resetThrottle(accountKey);
  await resetThrottle(ipKey);

  // ✅ landJwt 표준 payload(sub/persona/sessionVersion)
  const token = signLandSession({
    sub: String(doc._id),
    persona: "land",
    sessionVersion: Number(doc.sessionVersion ?? 0),
  });

  const secure = process.env.NODE_ENV === "production" ? isHttps(req) : false;

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

  res.cookies.set("land_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14일
  });

  await writeAuthLog({
    persona: "land",
    action: "login_success",
    identifier: emailLower,
    userId: String(doc._id),
    ip,
    ua,
  });

  return res;
}
