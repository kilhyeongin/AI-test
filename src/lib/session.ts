// src/lib/session.ts
// 서버에서 관리자 세션 읽기(쿠키 → JWT 검증 → DB 조회)
// - cookies()는 비동기(await 필요)
// - token.sessionVersion !== user.sessionVersion 이면 null 반환(세션 무효)

import "server-only";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/jwt";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

type AdminUserLean = {
  _id: unknown;
  email: string;
  name: string;
  roles: string[];
  status: "active" | "disabled";
  persona?: "admin" | "customer";
  sessionVersion: number;
};

export type AdminSessionResult = {
  tokenPayload: {
    sub: string;
    roles: string[];
    persona: "admin";
    sessionVersion: number;
    iat?: number;
    exp?: number;
  };
  user: {
    id: string;
    // ✅ A안: 이 프로젝트에서는 user._id를 agencyId로 간주
    agencyId: string;

    email: string;
    name: string;
    roles: string[];
  };
} | null;

export async function getAdminSession(): Promise<AdminSessionResult> {
  const store = await cookies(); // ✅ await 필요
  const token = store.get("admin_session")?.value ?? null;
  if (!token) return null;

  const payload = verifyAdminSession(token);
  if (!payload || payload.persona !== "admin") return null;

  await connectDB();

  const doc = await User.findById(payload.sub)
    .select("email name roles status persona sessionVersion")
    .lean<AdminUserLean | null>();

  // ✅ 스키마에 persona를 추가했지만,
  // 기존 데이터에 persona가 없을 수도 있으니 기본값 admin 처리
  const persona = (doc?.persona ?? "admin") as "admin" | "customer";

  if (!doc || persona !== "admin" || doc.status !== "active") return null;

  // ✅ 세션 버전 불일치 시 세션 무효
  if (Number(payload.sessionVersion ?? 0) !== Number(doc.sessionVersion ?? 0)) {
    return null;
  }

  const userId = String(doc._id);

  return {
    tokenPayload: {
      sub: String(payload.sub),
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      persona: "admin",
      sessionVersion: Number(payload.sessionVersion ?? 0),
      iat: (payload as any).iat,
      exp: (payload as any).exp,
    },
    user: {
      id: userId,
      agencyId: userId, // ✅ A안 핵심
      email: doc.email,
      name: doc.name,
      roles: Array.isArray(doc.roles) ? doc.roles : [],
    },
  };
}
