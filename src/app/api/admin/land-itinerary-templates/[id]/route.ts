// src/app/api/admin/land-itinerary-templates/[id]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import LandItinerary from "@/models/LandItinerary";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { ok: false, error: "관리자 인증 실패" },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id가 없습니다." },
        { status: 400 }
      );
    }

    await connectDB();

    const doc = await LandItinerary.findById(id).lean();
    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "랜드 템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: doc });
  } catch (e: any) {
    console.error("GET /api/admin/land-itinerary-templates/[id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
