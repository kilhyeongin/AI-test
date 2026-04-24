// src/lib/requestIp.ts
import { NextRequest } from "next/server";

/**
 * ALB/프록시 환경 기준 IP 추출
 * - x-forwarded-for: "client, proxy1, proxy2"
 * - 없으면 req.ip (환경에 따라 비어있을 수 있음)
 */
export function getClientIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  // NextRequest.ip는 런타임/배포 환경에 따라 undefined 가능
  // @ts-ignore
  const ip = (req as any).ip;
  return typeof ip === "string" && ip ? ip : "unknown";
}
