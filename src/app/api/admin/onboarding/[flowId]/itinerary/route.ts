// /src/app/api/admin/onboarding/[flowId]/itinerary/route.ts
// 관리자: 특정 OnboardingFlow에 일정표 연결/변경/해제 API
// - PATCH → itineraryId 연결/변경/해제 (관리자 전용)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import Itinerary from "@/models/Itinerary";
import { getAdminSession } from "@/lib/session";

type Ctx = {
  params: Promise<{ flowId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    // 관리자 인증
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
    }

    const { flowId } = await params;

    const body = (await req.json().catch(() => ({}))) as {
      itineraryId?: string | null;
    };

    if (!Object.prototype.hasOwnProperty.call(body, "itineraryId")) {
      return NextResponse.json(
        { ok: false, message: "itineraryId 필드가 필요합니다." },
        { status: 400 }
      );
    }

    await connectDB();

    let updated: any = null;

    // 1) 일정표 연결 해제 (null 또는 빈 문자열)
    if (body.itineraryId === null || body.itineraryId === "") {
      updated = await OnboardingFlow.findByIdAndUpdate(
        flowId,
        {
          $unset: {
            itineraryId: "",
            itineraryConnectedAt: "",
          },
        },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json(
          { ok: false, message: "해당 체크리스트를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, flow: updated }, { status: 200 });
    }

    // 2) 특정 itineraryId로 연결/변경
    const itineraryId = body.itineraryId as string;

    const exists = await Itinerary.exists({ _id: itineraryId });
    if (!exists) {
      return NextResponse.json(
        { ok: false, message: "해당 여행 일정표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    updated = await OnboardingFlow.findByIdAndUpdate(
      flowId,
      {
        itineraryId,
        itineraryConnectedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "해당 체크리스트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, flow: updated }, { status: 200 });
  } catch (error) {
    console.error("admin PATCH /api/admin/onboarding/[flowId]/itinerary error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
