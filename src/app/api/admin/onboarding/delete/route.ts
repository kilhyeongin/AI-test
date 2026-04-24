// /src/app/api/admin/onboarding/delete/route.ts
// ---------------------------------------------
// 체크리스트(온보딩 플로우) 삭제 API
//  - POST /api/admin/onboarding/delete
//    body: { flowId: string, customerId?: string }
// ---------------------------------------------

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OnboardingFlow from "@/models/OnboardingFlow";
import { getAdminSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    // 관리자 인증
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1) 요청 body 파싱
    const body = (await req.json().catch(() => null)) as {
      flowId?: string;
      customerId?: string;
    } | null;

    if (!body || !body.flowId) {
      return NextResponse.json(
        { ok: false, error: "flowId 가 필요합니다." },
        { status: 400 },
      );
    }

    const { flowId, customerId } = body;

    // 2) 삭제 조건 구성 (customerId 있으면 같이 매칭)
    const query: any = { _id: flowId };
    if (customerId) {
      query.customerId = customerId;
    }

    const deleted = await OnboardingFlow.findOneAndDelete(query);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "해당 체크리스트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 3) 성공 응답
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/admin/onboarding/delete error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 },
    );
  }
}
