import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyPassword } from "@/lib/crypto";
import { issueAdminSession } from "@/lib/jwt";
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

function isSecureRequest(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) return xfProto.split(",")[0].trim() === "https";
  return req.nextUrl.protocol === "https:";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent") || "";

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    await connectDB();
    const emailLower = String(email).trim().toLowerCase();

    const accountKey = makeThrottleKey("admin", emailLower);
    const ipKey = makeIpThrottleKey("admin", ip);

    const lock1 = await isLocked(accountKey);
    const lock2 = await isLocked(ipKey);
    if (lock1.locked || lock2.locked) {
      await writeAuthLog({
        persona: "admin",
        action: "login_fail",
        identifier: emailLower,
        ip,
        ua,
        reason: "too_many_attempts",
      });
      return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
    }

    const user = await User.findOne({ persona: "admin", emailLower })
      .select("email passwordHash roles status sessionVersion")
      .lean<{
        _id: unknown;
        email: string;
        passwordHash?: string;
        roles: string[];
        status: string;
        sessionVersion?: number;
      } | null>();

    if (!user) {
      await recordFail(accountKey);
      await recordIpFail(ipKey);
      await writeAuthLog({
        persona: "admin",
        action: "login_fail",
        identifier: emailLower,
        ip,
        ua,
        reason: "invalid_credentials",
      });
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    if (user.status !== "active") {
      await writeAuthLog({
        persona: "admin",
        action: "login_fail",
        identifier: emailLower,
        userId: String(user._id),
        ip,
        ua,
        reason: "account_disabled",
      });
      return NextResponse.json({ ok: false, error: "account_disabled" }, { status: 403 });
    }

    if (!user.passwordHash) {
      await writeAuthLog({
        persona: "admin",
        action: "login_fail",
        identifier: emailLower,
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
        persona: "admin",
        action: "login_fail",
        identifier: emailLower,
        userId: String(user._id),
        ip,
        ua,
        reason: "invalid_credentials",
      });
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (roles.length === 0) {
      await recordFail(accountKey);
      await recordIpFail(ipKey);
      await writeAuthLog({
        persona: "admin",
        action: "login_fail",
        identifier: emailLower,
        userId: String(user._id),
        ip,
        ua,
        reason: "not_admin",
      });
      return NextResponse.json({ ok: false, error: "not_admin" }, { status: 403 });
    }

    // 성공: 잠금/실패 기록 초기화
    await resetThrottle(accountKey);
    await resetThrottle(ipKey);

    const token = issueAdminSession({
      sub: String(user._id),
      roles,
      persona: "admin",
      sessionVersion: Number(user.sessionVersion ?? 0),
    });

    const res = NextResponse.json({ ok: true, user: { email: user.email, roles } });

    res.cookies.set("admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(req),
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    await writeAuthLog({
      persona: "admin",
      action: "login_success",
      identifier: emailLower,
      userId: String(user._id),
      ip,
      ua,
    });

    return res;
  } catch (e: any) {
    console.error("[api/auth/admin/login] unexpected_error:", e);
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
