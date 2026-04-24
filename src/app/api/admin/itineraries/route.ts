// /src/app/api/admin/itineraries/route.ts
// 일정표 생성 API (POST /api/admin/itineraries)

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Itinerary, { type DayPlan, type CommonSection, type OptionalSection } from "@/models/Itinerary";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      title,
      description,
      country,
      city,

      // (기존 텍스트 영역 호환)
      includeText,
      excludeText,
      travelerText,
      shoppingText,

      // ✅ 공통/선택 섹션(HTML)
      commonSections,
      optionalSections,

      managerName,
      mode,
      segments = [],

      // days / dayPlans 둘 다 허용
      days: daysRaw,
      dayPlans: dayPlansRaw,
    } = body;

    const days: DayPlan[] = Array.isArray(daysRaw)
      ? daysRaw
      : Array.isArray(dayPlansRaw)
      ? dayPlansRaw
      : [];

    if (!title || !title.trim() || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json(
        { ok: false, message: "제목과 일정(일차 정보)은 필수입니다." },
        { status: 400 }
      );
    }

    // ✅ DayPlan 정규화 (region/transport 포함)
    const normalizedDays: DayPlan[] = days.map((d: any, index: number) => ({
      day: typeof d.day === "number" ? d.day : index + 1,
      date: d.date ?? "",

      region: d.region ?? "",
      transport: d.transport ?? "",

      schedules: Array.isArray(d.schedules) ? d.schedules : [],
      breakfast: d.breakfast ?? "선택",
      lunch: d.lunch ?? "선택",
      dinner: d.dinner ?? "선택",
      hotelKr: d.hotelKr ?? "",
      hotelEn: d.hotelEn ?? "",
      hotelGrade: d.hotelGrade ?? "",
      hotelAddress: d.hotelAddress ?? "",
      hotelHomepage: d.hotelHomepage ?? "",
    }));

    // ✅ 섹션도 정규화 (선택)
    const normalizedCommon: CommonSection[] = Array.isArray(commonSections)
      ? commonSections.map((s: any) => ({
          key: s.key,
          title: s.title ?? "",
          html: s.html ?? "",
          fixed: true,
        }))
      : [];

    const normalizedOptional: OptionalSection[] = Array.isArray(optionalSections)
      ? optionalSections.map((s: any) => ({
          id: s.id ?? "",
          title: s.title ?? "",
          html: s.html ?? "",
        }))
      : [];

    const doc = await Itinerary.create({
      title: title.trim(),
      description,
      country,
      city,

      includeText,
      excludeText,
      travelerText,
      shoppingText,

      // ✅ 공통/선택 섹션 저장
      commonSections: normalizedCommon,
      optionalSections: normalizedOptional,

      managerName,
      mode,
      segments,

      days: normalizedDays,
    });

    return NextResponse.json({ ok: true, itinerary: doc }, { status: 201 });
    } catch (err: any) {
      console.error("POST /api/admin/itineraries error:", err);

      // ✅ Mongoose ValidationError면 상세 내려주기
      if (err?.name === "ValidationError") {
        return NextResponse.json(
          {
            ok: false,
            message: err.message,
            errors: Object.fromEntries(
              Object.entries(err.errors || {}).map(([k, v]: any) => [k, v?.message])
            ),
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: "일정표 저장 중 서버 오류가 발생했습니다.",
          name: err?.name,
        },
        { status: 500 }
      );
    }

}
