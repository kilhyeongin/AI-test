// src/app/api/land/rates/[id]/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LandRate from "@/models/LandRate";

// ✅ Next 15 타입체커 통과: params는 Promise 단일로 고정
type RouteContext = { params: Promise<{ id: string }> };

// GET: 한 건 조회
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await connectDB();

    const { id } = await params;
    const doc = await LandRate.findById(id).lean();

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "요금표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, rate: doc });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "요금표 조회 실패" },
      { status: 500 }
    );
  }
}

// PATCH: 텍스트 + 요금 행(rateRows)까지 업데이트 가능
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};

    // 텍스트 필드들
    const textFields = [
      "saleNotes",
      "inclusions",
      "exclusions",
      "resortBenefits",
      "honeymoonBenefits",
      "hbBenefits",
      "aiBenefits",
      "paymentAndCancel",
      "extraCancel",
    ] as const;

    for (const key of textFields) {
      if (key in body) {
        update[key] = (body as Record<string, unknown>)[key] ?? "";
      }
    }

    // 요금 행 전체 교체 (가격/기간/객실/투숙인원 등)
    if ("rateRows" in body && Array.isArray((body as any).rateRows)) {
      update.rateRows = (body as any).rateRows;
    }

    const doc = await LandRate.findByIdAndUpdate(id, update, { new: true });

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "요금표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "요금표 수정 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 요금표 전체 삭제
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await connectDB();

    const { id } = await params;
    const doc = await LandRate.findByIdAndDelete(id);

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "요금표를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "요금표 삭제 실패" },
      { status: 500 }
    );
  }
}
