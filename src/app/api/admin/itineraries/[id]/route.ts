// /src/app/api/admin/itineraries/[id]/route.ts
// 일정표 단건 조회 / 수정 / 삭제 API
// - GET    /api/admin/itineraries/[id]  : 조회
// - PUT    /api/admin/itineraries/[id]  : 기본 정보 + 텍스트 영역 + 섹션 + days 수정
// - DELETE /api/admin/itineraries/[id]  : 삭제

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Itinerary from "@/models/Itinerary";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await connectDB();

    const doc = await Itinerary.findById(id).lean();

    if (!doc) {
      return NextResponse.json(
        { ok: false, message: "해당 일정표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const anyDoc: any = doc;
    const payload = {
      ...anyDoc,
      _id: String(anyDoc._id),
      createdAt: anyDoc.createdAt?.toISOString?.() ?? null,
      updatedAt: anyDoc.updatedAt?.toISOString?.() ?? null,
    };

    return NextResponse.json({ ok: true, itinerary: payload }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/itineraries/[id]]", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await connectDB();

    const deleted = await Itinerary.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: "해당 일정표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/admin/itineraries/[id]]", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();

    const {
      title,
      description,
      country,
      city,
      managerName,

      // 텍스트 호환
      includeText,
      excludeText,
      travelerText,
      shoppingText,

      // ✅ 공통/선택 섹션(HTML)
      commonSections,
      optionalSections,

      // 일정
      days,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { ok: false, message: "제목은 필수입니다." },
        { status: 400 }
      );
    }

    await connectDB();

    const update: any = {
      title,
      description: description ?? "",
      country: country ?? "",
      city: city ?? "",

      managerName: managerName ?? "",

      includeText: includeText ?? "",
      excludeText: excludeText ?? "",
      travelerText: travelerText ?? "",
      shoppingText: shoppingText ?? "",
    };

    // ✅ 섹션 수정 반영
    if (Array.isArray(commonSections)) update.commonSections = commonSections;
    if (Array.isArray(optionalSections)) update.optionalSections = optionalSections;

    // ✅ 일차별 일정 수정 반영
    if (Array.isArray(days)) update.days = days;

    const updated = await Itinerary.findByIdAndUpdate(id, update, { new: true });

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "해당 일정표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[PUT /api/admin/itineraries/[id]]", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
