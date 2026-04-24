// 개발용 임시 비번 초기화 API - 사용 후 반드시 이 파일 삭제할 것
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  // 로컬 개발환경에서만 동작
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "프로덕션에서는 사용 불가" }, { status: 403 });
  }

  const { email, newPassword } = await req.json();
  if (!email || !newPassword) {
    return NextResponse.json({ ok: false, error: "email, newPassword 필요" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ emailLower: email.toLowerCase() });
  if (!user) {
    return NextResponse.json({ ok: false, error: "해당 이메일 계정 없음" }, { status: 404 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = hash;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();

  return NextResponse.json({ ok: true, message: `${email} 비번 변경 완료` });
}
