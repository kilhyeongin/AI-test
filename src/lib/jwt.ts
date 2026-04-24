// src/lib/jwt.ts
// 관리자 세션용 JWT 유틸 (상용 기준)
// - ✅ SECRET fallback 완전 제거
// - sessionVersion 포함
// - issueAdminSession / verifyAdminSession 유지

import * as jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const JWT_SECRET = requireEnv("JWT_SECRET");

export type AdminTokenPayload = {
  sub: string;             // 사용자 ID
  roles: string[];         // 권한 목록
  persona: "admin";        // 관리자 고정
  sessionVersion: number;  // 비번 변경/초기화 시 +1
  iat?: number;
  exp?: number;
};

// ✅ 로그인 시 토큰 발급
export function issueAdminSession(
  payload: Omit<AdminTokenPayload, "iat" | "exp">
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

// 과거 코드 호환용 별칭
export const signAdminSession = issueAdminSession;

// ✅ 토큰 검증 (타입 가드 포함)
export function verifyAdminSession(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") return null;

    const p = decoded as JwtPayload & Partial<AdminTokenPayload>;

    if (
      typeof p.sub !== "string" ||
      p.persona !== "admin" ||
      !Array.isArray(p.roles)
    ) {
      return null;
    }

    const svRaw = (p as any).sessionVersion;
    const sessionVersion =
      typeof svRaw === "number" ? svRaw : Number(svRaw ?? NaN);

    if (!Number.isFinite(sessionVersion)) return null;

    return {
      sub: p.sub,
      roles: p.roles,
      persona: "admin",
      sessionVersion,
      iat: typeof p.iat === "number" ? p.iat : undefined,
      exp: typeof p.exp === "number" ? p.exp : undefined,
    };
  } catch {
    return null;
  }
}
