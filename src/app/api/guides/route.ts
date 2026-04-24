// /src/app/api/guides/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Guide } from "@/models/Guide";

// ✅ _id가 unknown으로 잡히는 상황을 안전하게 처리
function toIdString(doc: any): string {
  const raw = doc?._id ?? doc?.id;
  if (!raw) return "";
  return typeof raw === "string" ? raw : String(raw);
}

/* ----------------------------------------------
   POST /api/guides
   여행안내 URL 생성
---------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const guide = await Guide.create({
      travelerName: body.travelerName ?? "",

      logoUrl: body.logoUrl ?? "",

      // 항공편
      segments: Array.isArray(body.segments) ? body.segments : [],

      // 체크인
      checkinAirline: body.checkinAirline ?? "",
      checkinTerminal: body.checkinTerminal ?? "",

      // 공항 미팅
      meetingPlace: body.meetingPlace ?? "",
      meetingDate: body.meetingDate ?? "",
      meetingTime: body.meetingTime ?? "",
      meetingStaffName: body.meetingStaffName ?? "",
      meetingStaffPhone: body.meetingStaffPhone ?? "",

      // 현지 미팅
      localBoardName: body.localBoardName ?? "",
      localStaffName: body.localStaffName ?? "",
      localPhone: body.localPhone ?? "",
      localEmergencyPhone: body.localEmergencyPhone ?? "",
      localImageUrl: body.localImageUrl ?? "",

      // 여행지
      country: body.country ?? "",
      city: body.city ?? "",
      weatherInfo: body.weatherInfo ?? "",
      outfitInfo: body.outfitInfo ?? "",
      exchangeInfo: body.exchangeInfo ?? "",
      immigrationInfo: body.immigrationInfo ?? "",
      visaInfo: body.visaInfo ?? "",
      localTimeInfo: body.localTimeInfo ?? "",
      plugInfo: body.plugInfo ?? "",

      // 회사 정보
      companyName: body.companyName ?? "",
      companyDesc: body.companyDesc ?? "",
    });

    const id = toIdString(guide);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "생성된 가이드 ID를 찾을 수 없습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id,
        guide: {
          ...guide.toObject(),
          id,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/guides error:", err);
    return NextResponse.json(
      { ok: false, error: "가이드를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/* ----------------------------------------------
   GET /api/guides
   여행안내 URL 목록 조회 (최신순)
---------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");

    let limit = parseInt(limitParam || "50", 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 200) limit = 200;

    // 최신순
    const docs = await Guide.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const guides = docs.map((g: any) => ({
      id: String(g._id),
      travelerName: g.travelerName || "",
      country: g.country || "",
      city: g.city || "",
      segments: Array.isArray(g.segments) ? g.segments : [],
      createdAt: g.createdAt,
    }));

    return NextResponse.json({ ok: true, guides }, { status: 200 });
  } catch (err) {
    console.error("GET /api/guides error:", err);
    return NextResponse.json(
      { ok: false, error: "가이드 목록 조회 오류" },
      { status: 500 }
    );
  }
}
