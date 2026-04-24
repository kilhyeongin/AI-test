// src/lib/landSession.ts
import "server-only";
import { cookies } from "next/headers";
import { verifyLandSession } from "@/lib/landJwt";

export async function getLandSession() {
  const store = await cookies();

  // ✅ 쿠키명이 프로젝트마다 다를 수 있어서 2개 후보를 지원
  const token =
    store.get("land_session")?.value ??
    store.get("landSession")?.value ??
    null;

  if (!token) return null;
  return verifyLandSession(token);
}
