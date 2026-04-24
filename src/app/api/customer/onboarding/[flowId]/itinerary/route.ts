// /src/app/api/customer/onboarding/[flowId]/itinerary/route.ts
// 고객 체크리스트(OnboardingFlow)에 연결된 일정표(Itinerary)를 조회하는 API
// GET /api/customer/onboarding/:flowId/itinerary

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db"; // ✅ 형인 프로젝트 스타일 (named export)
import { OnboardingFlow } from "@/models/OnboardingFlow";
import Itinerary from "@/models/Itinerary";

type Params = {
  params: Promise<{ flowId: string }>;
};

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { flowId } = await params;

    // 1) DB 연결
    await connectDB();

    // 2) 체크리스트(OnboardingFlow) 조회
    const flow = await OnboardingFlow.findById(flowId).lean();

    if (!flow) {
      return NextResponse.json(
        { ok: false, message: "해당 ID의 체크리스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 3) itineraryId 없으면 "아직 일정표 없음"
    if (!flow.itineraryId) {
      return NextResponse.json({ ok: true, hasItinerary: false }, { status: 200 });
    }

    // 4) 연결된 일정표 조회
    //    👉 타입 귀찮게 안 보고 싶으니까 any로 캐스팅해서 빨간줄 제거
    const itinerary = (await Itinerary.findById(flow.itineraryId).lean()) as any;

    if (!itinerary) {
      // 연결은 되어 있는데 실제 문서가 삭제된 경우
      return NextResponse.json(
        {
          ok: true,
          hasItinerary: false,
          message: "연결된 일정표를 찾을 수 없습니다.",
        },
        { status: 200 }
      );
    }

    // 5) 프론트에서 쓰기 좋은 형태로 필요한 필드만 정리해서 반환
    return NextResponse.json(
      {
        ok: true,
        hasItinerary: true,
        itinerary: {
          _id: String(itinerary._id),
          title: itinerary.title,
          description: itinerary.description || "",
          country: itinerary.country || "",
          city: itinerary.city || "",
          includeText: itinerary.includeText || "",
          excludeText: itinerary.excludeText || "",
          travelerText: itinerary.travelerText || "",
          shoppingText: itinerary.shoppingText || "",
          managerName: itinerary.managerName || "",
          mode: itinerary.mode,
          dayBlocks: itinerary.dayBlocks || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET itinerary by flow error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
