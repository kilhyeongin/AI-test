import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { verifyPassword } from "@/lib/crypto";
import { signCustomerSession } from "@/lib/customerJwt";
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

function normalizeLoginId(raw: unknown) {
  return String(raw ?? "").trim().toLowerCase();
}

function isHttps(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (!xfProto) return false;
  return xfProto.split(",")[0].trim() === "https";
}

export async function POST(req: NextRequest) {
  await connectDB();

  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";

  const { loginId, password } = await req.json();
  if (!loginId || !password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const loginIdLower = normalizeLoginId(loginId);

  // ✅ throttle: 계정 + IP 둘 다 체크
  const accountKey = makeThrottleKey("customer", loginIdLower);
  const ipKey = makeIpThrottleKey("customer", ip);

  const lock1 = await isLocked(accountKey);
  const lock2 = await isLocked(ipKey);
  if (lock1.locked || lock2.locked) {
    await writeAuthLog({
      persona: "customer",
      action: "login_fail",
      identifier: loginIdLower,
      ip,
      ua,
      reason: "too_many_attempts",
    });
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }

  const user = await Customer.findOne({ loginIdLower })
    .select("loginId name status passwordHash sessionVersion")
    .lean<{
      _id: unknown;
      loginId?: string;
      name?: string;
      status: string;
      passwordHash?: string;
      sessionVersion?: number;
    } | null>();

  if (!user) {
    await recordFail(accountKey);
    await recordIpFail(ipKey);
    await writeAuthLog({
      persona: "customer",
      action: "login_fail",
      identifier: loginIdLower,
      ip,
      ua,
      reason: "invalid_credentials",
    });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  if (user.status === "disabled") {
    await writeAuthLog({
      persona: "customer",
      action: "login_fail",
      identifier: loginIdLower,
      userId: String(user._id),
      ip,
      ua,
      reason: "account_disabled",
    });
    return NextResponse.json({ ok: false, error: "account_disabled" }, { status: 403 });
  }

  if (!user.passwordHash) {
    await writeAuthLog({
      persona: "customer",
      action: "login_fail",
      identifier: loginIdLower,
      userId: String(user._id),
      ip,
      ua,
      reason: "no_password_set",
    });
    return NextResponse.json({ ok: false, error: "no_password_set" }, { status: 400 });
  }

  const ok = await verifyPassword(String(password), user.passwordHash);
  if (!ok) {
    await recordFail(accountKey);
    await recordIpFail(ipKey);
    await writeAuthLog({
      persona: "customer",
      action: "login_fail",
      identifier: loginIdLower,
      userId: String(user._id),
      ip,
      ua,
      reason: "invalid_credentials",
    });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  // ✅ 성공: 잠금/실패 기록 초기화 (계정키+IP키 둘 다)
  await resetThrottle(accountKey);
  await resetThrottle(ipKey);

  const token = signCustomerSession({
    sub: String(user._id),
    persona: "customer",
    sessionVersion: Number(user.sessionVersion ?? 0),
  });

  const secure = process.env.NODE_ENV === "production" ? isHttps(req) : false;

  const res = NextResponse.json({
    ok: true,
    user: { id: String(user._id), loginId: user.loginId ?? "", name: user.name ?? "" },
  });

  res.cookies.set("client_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  await writeAuthLog({
    persona: "customer",
    action: "login_success",
    identifier: loginIdLower,
    userId: String(user._id),
    ip,
    ua,
  });

  return res;
}
