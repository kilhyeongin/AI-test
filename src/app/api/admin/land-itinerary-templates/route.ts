// src/app/api/admin/land-itinerary-templates/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

// ✅ 여기 모델명을 형인 프로젝트 실제 모델로 맞춰주세요.
// 보통 /land/itineraries 에서 쓰는 모델일 가능성이 큼.
import LandItinerary from "@/models/LandItinerary";

export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    await connectDB();

    // ✅ 랜드사가 만든 일정 목록을 관리자에서 “템플릿”처럼 고르는 목적이라면
    // 최신순으로 200개 정도까지 내려주면 충분합니다.
    const docs = await LandItinerary.find({})
      .select("_id tripTitle destination duration summary createdAt") // 필요한 것만
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ ok: true, items: docs });
  } catch (e: any) {
    console.error("admin land-itinerary-templates GET error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
