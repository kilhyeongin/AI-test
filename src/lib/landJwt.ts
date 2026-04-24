// src/lib/landJwt.ts
// 랜드 세션 JWT 유틸 (상용 기준)
// - ✅ SECRET fallback 제거 (운영 안전)
// - ✅ payload 최소화: { sub, persona:"land", sessionVersion }
// - ✅ 만료: 14일
// - ✅ verify 타입가드(string/object) 처리

import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/**
 * ✅ (제거된 부분)
 *  - process.env.LAND_JWT_SECRET || process.env.JWT_SECRET || "change-me"
 *  - 운영에서 env 누락 시 "change-me"로 토큰 위조 가능
 *
 * ✅ (최종)
 *  - 반드시 환경변수로 설정되어 있어야 함
 */
const LAND_JWT_SECRET: string = requireEnv("JWT_SECRET");
// 만약 LAND 전용 시크릿을 쓰고 싶다면 아래로 변경(단, fallback은 금지)
// const LAND_JWT_SECRET: string = requireEnv("LAND_JWT_SECRET");

export type LandSessionPayload = {
  sub: string;              // LandAgency _id
  persona: "land";
  sessionVersion: number;   // DB sessionVersion
};

/**
 * ✅ (제거된 부분)
 *  - payload에 { id, landName, email, status } 모두 넣던 방식
 *  - 토큰 유출/동기화 문제 + sessionVersion 기반 무효화 어려움
 *
 * ✅ (최종)
 *  - 최소 정보만 토큰에 담고, 화면/권한 정보는 /me에서 DB 조회로 해결
 */
export function signLandSession(payload: LandSessionPayload): string {
  return jwt.sign(payload, LAND_JWT_SECRET, { expiresIn: "14d" });
}

export function verifyLandSession(token?: string | null) {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, LAND_JWT_SECRET);

    // ✅ jsonwebtoken은 string | object(JwtPayload) 가능 → string 제거
    if (typeof decoded === "string") return null;

    const p = decoded as JwtPayload & Partial<LandSessionPayload>;

    const sub = typeof p.sub === "string" ? p.sub : null;
    const persona = p.persona === "land" ? "land" : null;

    const svRaw = (p as any).sessionVersion;
    const sessionVersion =
      typeof svRaw === "number" ? svRaw : Number(svRaw ?? NaN);

    if (!sub || !persona || !Number.isFinite(sessionVersion)) return null;

    return {
      sub,
      persona,
      sessionVersion,
      iat: typeof p.iat === "number" ? p.iat : undefined,
      exp: typeof p.exp === "number" ? p.exp : undefined,
    };
  } catch {
    return null;
  }
}
