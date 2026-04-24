// [POST] OWNER가 관리자 계정을 직접 생성하는 API
// - 입력: { email, name, password, role } (모두 필수)
// - 가드: 호출자가 OWNER인지 확인
// - 전역 유일: persona=admin + emailLower
// - 비밀번호 규칙: 8자 이상 + 영문 + 숫자

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/crypto";
import { requireOwnerUser } from "@/lib/authz";

// 간단한 강도 체크: 8자 이상 + 영문 + 숫자
function isStrongPassword(pw: string) {
  if (typeof pw !== "string") return false;
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/\d/.test(pw)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 OWNER 가드
    await requireOwnerUser();

    await connectDB();
    const { email, name, password, role } = await req.json();

    // ⚠️ 모든 필수값 검사
    if (!email || !password || !role || !name || String(name).trim().length === 0) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // ✅ 서버에서도 비밀번호 규칙 검사
    if (!isStrongPassword(String(password))) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }

    const emailLower = String(email).trim().toLowerCase();

    // 중복 검사: 전역에서 persona=admin + emailLower 유일
    const exists = await User.findOne({ persona: "admin", emailLower }).lean();
    if (exists) {
      return NextResponse.json({ ok: false, error: "already_registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const doc = await User.create({
      email,
      emailLower,
      name: String(name).trim(),
      passwordHash,
      persona: "admin",
      roles: [role],      // 기본 한 개 권한
      status: "active",
    });

    return NextResponse.json({
      ok: true,
      user: { id: String(doc._id), email: doc.email, roles: doc.roles, name: doc.name },
    });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg === "unauthenticated") {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (msg === "forbidden") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
