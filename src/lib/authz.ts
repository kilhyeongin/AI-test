// src/lib/authz.ts
// 권한 유틸리티: 세션에서 관리자 정보 읽기 + OWNER 가드
import "server-only";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/jwt";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

type AdminDocLean = {
  _id: unknown;
  email: string;
  name: string;
  roles: string[];
  status: string;
  persona?: string; // ✅ 레거시 데이터 대비 (없을 수 있음)
  sessionVersion?: number;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get("admin_session")?.value ?? null;
  if (!token) return null;

  const payload = verifyAdminSession(token);
  if (!payload || payload.persona !== "admin") return null;

  await connectDB();

  const doc = await User.findById(payload.sub)
    .select("email name roles status persona sessionVersion")
    .lean<AdminDocLean | null>();

  // ✅ 레거시 데이터: persona 없으면 admin으로 간주
  const persona = (doc?.persona ?? "admin") as "admin" | "customer";

  if (!doc || persona !== "admin" || doc.status !== "active") return null;

  // ✅ sessionVersion 불일치 시 무효
  if (Number(payload.sessionVersion ?? 0) !== Number(doc.sessionVersion ?? 0)) return null;

  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    roles: Array.isArray(doc.roles) ? doc.roles : [],
  };
}

// OWNER 권한 요구
export async function requireOwnerUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthenticated");
  if (!user.roles.includes("OWNER")) throw new Error("forbidden");
  return user;
}
