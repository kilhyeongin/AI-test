// src/app/api/admin/itineraries/import-from-land-template/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { LandItineraryTemplate } from "@/models/LandItineraryTemplate";
import AdminItinerary from "@/models/AdminItinerary";

// ✅ lean 결과 타입(필요한 필드만)
type LandTemplateLean = {
  _id: any;
  tripTitle?: string;
  destination?: string;
  duration?: string;
  summary?: string;
  commonSections?: any[];
  optionalSections?: any[];
  dayPlans?: any[];
};

export async function POST(req: Request) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, error: "관리자 인증 실패" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    const templateId = body?.templateId as string | undefined;

    if (!templateId) {
      return NextResponse.json({ ok: false, error: "templateId가 필요합니다." }, { status: 400 });
    }

    const tpl = await LandItineraryTemplate.findById(templateId).lean();
    if (!tpl) {
      return NextResponse.json({ ok: false, error: "랜드 템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // ✅ strict/ESLint 환경에서 any 없이 안전하게
    const t = tpl as unknown as LandTemplateLean;
    const tplId = t._id;

    // ✅ 세션 필드명은 프로젝트에 맞게 유지/조정
    const agencyId = (adminSession as any).agencyId ?? null;
    const createdByAdminId = (adminSession as any).userId ?? (adminSession as any)._id ?? null;

    const created = await AdminItinerary.create({
      agencyId,
      createdByAdminId,
      sourceLandTemplateId: tplId,

      tripTitle: t.tripTitle ?? "",
      destination: t.destination ?? "",
      duration: t.duration ?? "",
      summary: t.summary ?? "",

      commonSections: Array.isArray(t.commonSections) ? t.commonSections : [],
      optionalSections: Array.isArray(t.optionalSections) ? t.optionalSections : [],
      dayPlans: Array.isArray(t.dayPlans) ? t.dayPlans : [],

      status: "draft",
    });

    return NextResponse.json({ ok: true, itineraryId: created._id }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message ?? "불러오기 실패" }, { status: 500 });
  }
}
