// src/app/api/land/itineraries/[id]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LandItinerary from "@/models/LandItinerary";

type RouteContext = {
  // ✅ Next 15 타입체커 통과: params를 Promise로 단일 고정
  params: Promise<{ id: string }>;
};

type CommonKey = "includes" | "excludes" | "visa" | "remark";

function buildSectionsHtmlFromBody(body: unknown) {
  const b = body as any;

  // 1) sectionsHtml로 바로 오면 그대로 사용
  if (Array.isArray(b?.sectionsHtml)) return b.sectionsHtml;

  // 2) common/optional로 오면 변환
  const commonSections = Array.isArray(b?.commonSections) ? b.commonSections : [];
  const optionalSections = Array.isArray(b?.optionalSections) ? b.optionalSections : [];

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
}

function buildDayPlansV2FromBody(body: unknown) {
  const b = body as any;

  // 1) dayPlansV2로 오면 그대로 사용
  if (Array.isArray(b?.dayPlansV2)) return b.dayPlansV2;

  // 2) dayPlans로 오면 V2로 저장(신규 UI 구조)
  if (Array.isArray(b?.dayPlans)) return b.dayPlans;

  return undefined;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next 15 대응 (유니온 제거)
    const doc = await LandItinerary.findById(id).lean();

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "여행일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, itinerary: doc });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "여행일정 조회 실패" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next 15 대응 (유니온 제거)
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const update: any = {};

    if ("tripTitle" in body) update.tripTitle = (body as any).tripTitle ?? "";
    if ("destination" in body) update.destination = (body as any).destination ?? "";
    if ("duration" in body) update.duration = (body as any).duration ?? "";
    if ("summary" in body) update.summary = (body as any).summary ?? "";

    // ✅ 섹션: 어떤 형태로 오든 sectionsHtml로 저장
    if ("sectionsHtml" in body || "commonSections" in body || "optionalSections" in body) {
      update.sectionsHtml = buildSectionsHtmlFromBody(body);
    }

    // ✅ 일정: 어떤 형태로 오든 dayPlansV2로 저장
    if ("dayPlansV2" in body || "dayPlans" in body) {
      update.dayPlansV2 = buildDayPlansV2FromBody(body) ?? [];
    }

    // 옵션/호환
    if ("scheduleHtml" in body) update.scheduleHtml = (body as any).scheduleHtml ?? "";
    if ("includes" in body) update.includes = (body as any).includes ?? "";
    if ("excludes" in body) update.excludes = (body as any).excludes ?? "";
    if ("notes" in body) update.notes = (body as any).notes ?? "";

    const doc = await LandItinerary.findByIdAndUpdate(id, update, { new: true });

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "여행일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, itinerary: doc });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "여행일정 수정 실패" },
      { status: 500 }
    );
  }
}
