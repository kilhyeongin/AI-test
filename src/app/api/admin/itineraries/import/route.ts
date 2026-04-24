// src/app/api/admin/itineraries/import/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

// ✅ 모델 export 방식에 맞춰 import 해야 함
// 대부분 프로젝트는 mongoose model을 default export로 둠
import Itinerary from "@/models/Itinerary";
import LandItinerary from "@/models/LandItinerary";

type Body = {
  templateId?: string;
  agencyId?: string; // 프론트에서 넘어오지만, 가능하면 세션에서 뽑는 걸 우선
};

export async function POST(req: Request) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, error: "관리자 인증 실패" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const templateId = body.templateId?.trim();
    if (!templateId) {
      return NextResponse.json(
        { ok: false, error: "templateId가 없습니다." },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ 지금 드롭다운에서 선택하는 건 LandItinerary의 _id 이므로 여기서 찾는다
    const src: any = await LandItinerary.findById(templateId).lean();

    if (!src) {
      return NextResponse.json(
        { ok: false, error: "랜드 템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // ✅ agencyId: 세션 우선, 없으면 body fallback
    const agencyId =
      (adminSession as any)?.agencyId ||
      (adminSession as any)?.user?.agencyId ||
      body.agencyId ||
      null;

    if (!agencyId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "agencyId를 찾을 수 없습니다. 세션(/api/auth/admin/me) 응답을 확인하세요.",
        },
        { status: 400 }
      );
    }

    // ✅ LandItinerary → 여행사 Itinerary로 스냅샷 생성
    const title = src.tripTitle || src.title || "제목 없음";
    const description = src.summary || src.description || "";

    const country = src.country || "";
    const city = src.city || src.destination || "";

    const doc = await Itinerary.create({
      agencyId,

      title,
      description,
      country,
      city,

      days: src.days || [],

      commonSections: src.commonSections || [],
      optionalSections: src.optionalSections || [],

      includeText: src.includeText || "",
      excludeText: src.excludeText || "",

      managerName: src.managerName || "",

      mode: src.mode || "MANUAL",
      segments: src.segments || [],

      importedFrom: {
        kind: "LandItinerary",
        sourceId: String(src._id),
      },
    });

    return NextResponse.json({ ok: true, itinerary: doc });
  } catch (e: any) {
    console.error("POST /api/admin/itineraries/import error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
