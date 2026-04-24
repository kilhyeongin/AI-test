// src/app/api/auth/customer/register/route.ts
// [POST] 고객 회원가입: { loginId, name, password } (이메일 없음)
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { hashPassword } from "@/lib/crypto";

function normalizeLoginId(raw: unknown) {
  const v = String(raw ?? "").trim();
  const lower = v.toLowerCase();

  // ✅ 정책: 영문/숫자/_/- , 4~20자
  const ok = /^[a-z0-9_-]{4,20}$/.test(lower);
  return { v, lower, ok };
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { loginId, name, password } = body || {};

  if (!loginId || !name || !password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const { v: loginIdRaw, lower: loginIdLower, ok: idOk } = normalizeLoginId(loginId);
  if (!idOk) {
    return NextResponse.json({ ok: false, error: "invalid_login_id" }, { status: 400 });
  }

  const pw = String(password);
  if (pw.length < 8) {
    return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
  }
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  if (!hasLetter || !hasDigit) {
    return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
  }

  await connectDB();

  // ✅ 아이디 중복 체크 (반드시 loginIdLower)
  const exists = await Customer.findOne({ loginIdLower }).select("_id").lean();
  if (exists) return NextResponse.json({ ok: false, error: "login_id_exists" }, { status: 409 });

  const passwordHash = await hashPassword(pw);

  const c = await Customer.create({
    loginId: loginIdRaw,     // 표시용
    loginIdLower,            // 정규화/유니크
    name: String(name).trim(),
    status: "active",
    passwordHash,
  });

  return NextResponse.json({ ok: true, id: String(c._id) }, { status: 201 });
}
