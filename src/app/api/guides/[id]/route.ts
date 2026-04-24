// /src/app/api/guides/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Guide } from "@/models/Guide";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next 15 대응(타입도 통과)
    const guide = await Guide.findById(id).lean();

    if (!guide) {
      return NextResponse.json(
        { message: "해당 가이드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(guide, { status: 200 });
  } catch (err) {
    console.error("GET /api/guides/[id] error:", err);
    return NextResponse.json(
      { message: "가이드를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
