// /src/app/api/land/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LandAgency } from "@/models/LandAgency";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  await connectDB();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const {
    landName,           // 랜드사 이름
    ownerName,          // 대표명
    phone,              // 전화번호
    email,              // 이메일주소
    homepage,           // 대표 URL
    businessRegNo,      // 사업자등록번호
    businessRegFileUrl, // 사업자등록증 파일 URL
    password,
  } = body || {};

  console.log("[land/register] body =", {
    landName,
    ownerName,
    phone,
    email,
    homepage,
    businessRegNo,
    businessRegFileUrl,
    password: password ? "(length:" + String(password).length + ")" : "",
  });

  if (
    !landName ||
    !ownerName ||
    !phone ||
    !email ||
    !businessRegNo ||
    !password ||
    !businessRegFileUrl
  ) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 }
    );
  }

  const exists = await LandAgency.findOne({ email }).lean();
  if (exists) {
    return NextResponse.json(
      { ok: false, error: "already_exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const doc = await LandAgency.create({
    landName,
    ownerName,
    phone,
    email,
    homepage,
    businessRegNo,
    businessRegFileUrl,
    passwordHash,
    status: "PENDING",
  });

  return NextResponse.json({ ok: true, id: String(doc._id) }, { status: 201 });
}
