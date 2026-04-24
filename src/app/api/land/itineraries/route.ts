// src/app/api/land/itineraries/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LandItinerary from "@/models/LandItinerary";
import { LandItineraryTemplate } from "@/models/LandItineraryTemplate";

type CommonKey = "includes" | "excludes" | "visa" | "remark";

function buildSectionsForTemplate(body: any) {
  const commonSections = Array.isArray(body?.commonSections) ? body.commonSections : [];
  const optionalSections = Array.isArray(body?.optionalSections) ? body.optionalSections : [];

  const common = commonSections
    .filter((s: any) => s?.key && s?.title)
    .map((s: any) => ({
      key: String(s.key as CommonKey),
      title: String(s.title ?? ""),
      html: String(s.html ?? ""),
      fixed: true,
    }));

  const optional = optionalSections
    .filter((s: any) => s?.id)
    .map((s: any) => ({
      id: String(s.id),
      title: String(s.title ?? "선택 섹션"),
      html: String(s.html ?? ""),
    }));

  return { commonSections: common, optionalSections: optional };
}

function normalizeDayPlans(body: any) {
  const dayPlans = Array.isArray(body?.dayPlans) ? body.dayPlans : [];
  return dayPlans.map((d: any, idx: number) => ({
    day: typeof d?.day === "number" ? d.day : idx + 1,
    region: String(d?.region ?? ""),
    transport: String(d?.transport ?? ""),
    rows: Array.isArray(d?.rows)
      ? d.rows.map((r: any) => ({
          id: String(r?.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`),
          time: String(r?.time ?? ""),
          text: String(r?.text ?? ""),
        }))
      : [],
    breakfast: String(d?.breakfast ?? "선택"),
    lunch: String(d?.lunch ?? "선택"),
    dinner: String(d?.dinner ?? "선택"),
    hotelKr: String(d?.hotelKr ?? ""),
    hotelEn: String(d?.hotelEn ?? ""),
    hotelGrade: String(d?.hotelGrade ?? ""),
    hotelAddress: String(d?.hotelAddress ?? ""),
  }));
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const tripTitle = String(body?.tripTitle ?? "").trim();
    if (!tripTitle) {
      return NextResponse.json(
        { ok: false, error: "상품명/일정명(tripTitle)은 필수입니다." },
        { status: 400 }
      );
    }

    const landId = body?.landId ? String(body.landId) : null;

    // 1) LandItinerary 저장(기존 로직 유지)
    const sectionsHtml = (() => {
      const commonSections = Array.isArray(body?.commonSections) ? body.commonSections : [];
      const optionalSections = Array.isArray(body?.optionalSections) ? body.optionalSections : [];

      return [
        ...commonSections
          .filter((s: any) => s?.key && s?.title)
          .map((s: any) => ({
            key: String(s.key as CommonKey),
            title: String(s.title),
            enabled: true,
            html: String(s.html ?? ""),
          })),
        ...optionalSections
          .filter((s: any) => s?.id)
          .map((s: any) => ({
            key: `opt_${String(s.id)}`,
            title: String(s.title ?? "선택 섹션"),
            enabled: true,
            html: String(s.html ?? ""),
          })),
      ];
    })();

    const dayPlansV2 = normalizeDayPlans(body);

    const saved = await LandItinerary.create({
      landId,

      tripTitle,
      destination: String(body?.destination ?? ""),
      duration: String(body?.duration ?? ""),
      summary: String(body?.summary ?? ""),

      sectionsHtml,
      dayPlansV2,

      // 호환 필드(있으면 저장)
      scheduleHtml: String(body?.scheduleHtml ?? ""),
      includes: String(body?.includes ?? ""),
      excludes: String(body?.excludes ?? ""),
      notes: String(body?.notes ?? ""),
    });

    // 2) ✅ LandItineraryTemplate도 생성/업데이트(여행사 템플릿 목록에 뜨게)
    // - 템플릿 목록 API가 LandItineraryTemplate을 보고 있으므로, 여기서 반드시 동기화해야 함.
    // - upsert 기준은 (landId + tripTitle + destination + duration) 조합
    //   (원하면 더 강하게: saved._id를 sourceItineraryId로 저장하는 구조도 가능)
    const { commonSections, optionalSections } = buildSectionsForTemplate(body);

    await LandItineraryTemplate.findOneAndUpdate(
      {
        landId,
        tripTitle,
        destination: String(body?.destination ?? ""),
        duration: String(body?.duration ?? ""),
      },
      {
        $set: {
          landId,
          tripTitle,
          destination: String(body?.destination ?? ""),
          duration: String(body?.duration ?? ""),
          summary: String(body?.summary ?? ""),
          commonSections,
          optionalSections,
          dayPlans: dayPlansV2, // 템플릿은 dayPlans 필드로 저장(너 기존 구조 기준)
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, itinerary: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/land/itineraries error:", error);
    return NextResponse.json(
      { ok: false, error: "여행일정 저장 실패" },
      { status: 500 }
    );
  }
}
