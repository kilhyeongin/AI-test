// src/lib/jwtUtil.ts
// JWT 만료 보조 유틸

export function secondsLeft(exp?: number): number | null {
  if (!exp) return null;
  const now = Math.floor(Date.now() / 1000);
  return exp - now;
}

// 재발급 기준(초) — 24시간
export const RENEW_THRESHOLD_SECONDS = 60 * 60 * 24;
