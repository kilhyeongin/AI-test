// /src/app/api/onboarding/[flowId]/itinerary/route.ts
// 고객/관리자 공용: 특정 OnboardingFlow에 연결된 일정표 조회 (읽기 전용)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import Itinerary from "@/models/Itinerary";

type Params = {
  // ✅ Next.js 15: params 를 Promise 로 받고 await
  params: Promise<{ flowId: string }>;
};

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { flowId } = await params;

    await connectDB();

    // 플로우 + 연결된 일정표 같이 조회
    const flow: any = await OnboardingFlow.findById(flowId)
      .populate("itineraryId")
      .lean();

    if (!flow) {
      return NextResponse.json(
        {
          ok: false,
          hasItinerary: false,
          message: "체크리스트를 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    if (!flow.itineraryId) {
      // 일정표 아직 연결 안 된 경우
      return NextResponse.json(
        { ok: true, hasItinerary: false },
        { status: 200 }
      );
    }

    const it: any =
      flow.itineraryId && flow.itineraryId._id
        ? flow.itineraryId
        : await Itinerary.findById(flow.itineraryId).lean();

    if (!it) {
      return NextResponse.json(
        {
          ok: true,
          hasItinerary: false,
          message: "연결된 여행 일정표를 찾을 수 없습니다.",
        },
        { status: 200 }
      );
    }

    // ============ ① raw days (관리자와 동일 구조) ============

    const rawDays: any[] = Array.isArray(it.days) ? it.days : [];

    const days = rawDays.map((d) => {
      // 날짜 문자열
      let dateStr = "";
      if (typeof d.date === "string") {
        dateStr = d.date;
      } else if (d.date instanceof Date) {
        dateStr = `${d.date.getFullYear()}-${String(
          d.date.getMonth() + 1
        ).padStart(2, "0")}-${String(d.date.getDate()).padStart(2, "0")}`;
      }

      // 시간/일정 라인들 (관리자 상세에서 쓰는 schedules 구조와 동일)
      const schedules = Array.isArray(d.schedules)
        ? d.schedules.map((s: any) => ({
            time: s.time || "",
            text: s.text || "",
          }))
        : [];

      return {
        day: d.day || 0,
        date: dateStr,
        schedules,
        breakfast: d.breakfast || "",
        lunch: d.lunch || "",
        dinner: d.dinner || "",
        hotelKr: d.hotelKr || "",
        hotelEn: d.hotelEn || "",
        hotelGrade: d.hotelGrade || "",
        hotelAddress: d.hotelAddress || d.hotelAddressKr || "",
        hotelHomepage: d.hotelHomepage || "",
      };
    });

    // ============ ② 카드/요약용 dayBlocks (기존 카드용) ============

    const dayBlocks =
      days.length > 0
        ? days.map((d) => {
            const first =
              Array.isArray(d.schedules) && d.schedules.length > 0
                ? d.schedules[0]
                : null;

            const titleParts: string[] = [];
            if (first?.time) titleParts.push(first.time);
            if (first?.text) titleParts.push(first.text);
            const title = titleParts.join(" ");

            const lines: string[] = [];
            if (Array.isArray(d.schedules)) {
              d.schedules.forEach((s: any) => {
                if (!s.text) return;
                const t = s.time ? `${s.time} ` : "";
                lines.push(`${t}${s.text}`);
              });
            }

            const hotelLines: string[] = [];
            if (d.hotelKr) hotelLines.push(`호텔: ${d.hotelKr}`);
            if (d.hotelAddress) hotelLines.push(`주소: ${d.hotelAddress}`);
            if (hotelLines.length) {
              lines.push("");
              lines.push(hotelLines.join(" / "));
            }

            const mealParts: string[] = [];
            if (d.breakfast) mealParts.push(`조식 ${d.breakfast}`);
            if (d.lunch) mealParts.push(`중식 ${d.lunch}`);
            if (d.dinner) mealParts.push(`석식 ${d.dinner}`);
            const meal = mealParts.join(" · ");

            return {
              day: d.day,
              date: d.date,
              title,
              description: lines.join("\n"),
              meal: meal || "-",
            };
          })
        : [];

    return NextResponse.json(
      {
        ok: true,
        hasItinerary: true,
        itinerary: {
          _id: String(it._id),
          title: it.title || "",
          description: it.description || "",
          country: it.country || "",
          city: it.city || "",
          includeText: it.includeText || "",
          excludeText: it.excludeText || "",
          travelerText: it.travelerText || "",
          shoppingText: it.shoppingText || "",
          managerName: it.managerName || "",
          mode: it.mode || "MANUAL",

          // 🔹 고객/관리자 상세에서 공통으로 쓰는 raw days
          days,

          // 🔹 카드/요약용
          dayBlocks,

          // 메타 정보
          createdAt: it.createdAt ? it.createdAt.toISOString() : null,
          connectedAt: flow.itineraryConnectedAt
            ? flow.itineraryConnectedAt.toISOString()
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/onboarding/[flowId]/itinerary error:", error);
    return NextResponse.json(
      {
        ok: false,
        hasItinerary: false,
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
