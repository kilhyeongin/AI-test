// src/app/api/land/register/route.ts
// [POST] 랜드사 회원가입
// - 입력: { landName, ownerName, phone, email, homepage, businessRegNo, businessRegFileUrl, password }
// - 저장: emailLower 자동 생성(pre validate), status=PENDING, sessionVersion=0
// - 비밀번호: bcrypt 해시
// - 중복: emailLower unique

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import bcrypt from "bcryptjs";

function normEmailLower(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  await connectDB();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json", 400);
  }

  const {
    landName,
    ownerName,
    phone,
    email,
    homepage,
    businessRegNo,
    businessRegFileUrl,
    password,
  } = body || {};

  if (
    !landName ||
    !ownerName ||
    !phone ||
    !email ||
    !businessRegNo ||
    !businessRegFileUrl ||
    !password
  ) {
    return bad("missing_fields", 400);
  }

  const emailLower = normEmailLower(email);

  // ✅ 비밀번호 규칙(최소): 8자 이상 + 영문 + 숫자
  const pw = String(password);
  const lenOK = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  if (!lenOK || !hasLetter || !hasDigit) {
    return bad("weak_password", 400);
  }

  // ✅ 중복 체크 (emailLower unique라서 여기서도 선검사)
  const dup = await LandAgency.findOne({ emailLower }).select("_id").lean();
  if (dup) {
    return bad("email_exists", 409);
  }

  const passwordHash = await bcrypt.hash(pw, 10);

  // ✅ 생성
  const doc = await LandAgency.create({
    landName: String(landName).trim(),
    ownerName: String(ownerName).trim(),
    phone: String(phone).trim(),
    email: String(email).trim(),
    // emailLower는 model pre("validate")에서 자동 생성되지만, 안전하게 넣어도 됨
    emailLower,
    homepage: String(homepage ?? "").trim(),
    businessRegNo: String(businessRegNo).trim(),
    businessRegFileUrl: String(businessRegFileUrl).trim(),
    passwordHash,
    status: "PENDING",
    sessionVersion: 0,
  });

  return NextResponse.json(
    { ok: true, id: String(doc._id), status: doc.status },
    { status: 201 }
  );
}
