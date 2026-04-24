// /src/app/api/admin/itineraries/list/route.ts
// 관리자용 여행 일정표 목록 조회 API
// - GET /api/admin/itineraries/list
//   → 일정표 리스트 (간단 정보) 반환

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Itinerary from "@/models/Itinerary";

export async function GET() {
  try {
    await connectDB();

    const docs = await Itinerary.find().sort({ createdAt: -1 }).lean();

    const itineraries = docs.map((d: any) => {
      const days = Array.isArray(d.days) ? d.days : [];
      const startDate = days.length > 0 ? days[0].date || "" : "";
      const endDate =
        days.length > 0 ? days[days.length - 1].date || "" : "";

      return {
        _id: String(d._id),
        title: d.title || "",
        country: d.country || "",
        city: d.city || "",
        mode: d.mode === "MANUAL" ? "MANUAL" : "PNR",
        createdAt: d.createdAt?.toISOString?.() ?? null,
        startDate,
        endDate,
        daysCount: days.length,
      };
    });

    return NextResponse.json({ ok: true, itineraries });
  } catch (error) {
    console.error("[GET /api/admin/itineraries/list]", error);
    return NextResponse.json(
      { ok: false, message: "여행 일정표 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
