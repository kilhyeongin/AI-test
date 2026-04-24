// src/app/api/health/route.ts
import { NextResponse } from "next/server";

// ✅ ELB 헬스체크 전용
// - 로그인 필요 없음
// - 항상 200 반환
export async function GET() {
  return NextResponse.json(
    { ok: true, message: "healthy" },
    { status: 200 }
  );
}

// 일부 헬스체크는 HEAD 요청을 쓰므로 같이 처리
export async function HEAD() {
  return new Response(null, { status: 200 });
}
