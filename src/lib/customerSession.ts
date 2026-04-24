// 고객 세션 헬퍼 (API 라우트에서 재사용)
// - cookies()의 customer/client 세션 쿠키를 읽어 고객 ID를 꺼냄
// - getCustomerId: 없으면 null
// - requireCustomerId: 없으면 Error 던짐

import "server-only";
import { cookies } from "next/headers";
import { verifyCustomerSession } from "@/lib/customerJwt";

const COOKIE_KEYS = ["customer_session", "client_session"] as const;

export async function getCustomerId(): Promise<string | null> {
  const c = await cookies();
  const token =
    c.get(COOKIE_KEYS[0])?.value ??
    c.get(COOKIE_KEYS[1])?.value ??
    "";

  const payload = token ? verifyCustomerSession(token) : null;
  if (!payload || payload.persona !== "customer") return null;
  return String(payload.sub);
}

export async function requireCustomerId(): Promise<string> {
  const id = await getCustomerId();
  if (!id) throw new Error("unauthenticated");
  return id;
}
