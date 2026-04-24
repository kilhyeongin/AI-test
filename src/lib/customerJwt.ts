// src/lib/customerJwt.ts
// 고객 세션용 JWT 유틸 (상용 기준)
// - ✅ SECRET fallback 제거
// - signCustomerSession / verifyCustomerSession 유지
// - 하위호환 alias 유지

import * as jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const JWT_SECRET = requireEnv("JWT_SECRET");

export type CustomerSessionPayload = {
  sub: string;
  persona: "customer";
  sessionVersion: number;
};

export function signCustomerSession(payload: CustomerSessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

export function verifyCustomerSession(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") return null;
    const p = decoded as JwtPayload & Partial<CustomerSessionPayload>;

    const sub = typeof p.sub === "string" ? p.sub : null;
    const persona = p.persona === "customer" ? "customer" : null;

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

// ✅ 하위호환(기존 이름 유지)
export const signClientSession = signCustomerSession;
export const verifyClientSession = verifyCustomerSession;
