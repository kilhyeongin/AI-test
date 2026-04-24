// src/app/api/land/rates/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LandRate from "@/models/LandRate";

// 현재 버전: 로그인 여부 체크 없이 요금표만 저장
// 나중에 원하면 verifyLandSession를 이용해 landId를 채우도록 확장 가능

export async function POST(req: Request) {
  try {
    // MongoDB 연결
    await connectDB();

    // 클라이언트에서 넘어온 요금표 데이터
    const body = await req.json();

    // 바로 저장 (landId 없이)
    const saved = await LandRate.create(body);

    return NextResponse.json(
      { success: true, data: saved },
      { status: 201 }
    );
  } catch (error) {
    console.error("요금표 저장 실패", error);
    return NextResponse.json(
      { success: false, error: "요금표 저장 실패" },
      { status: 500 }
    );
  }
}
