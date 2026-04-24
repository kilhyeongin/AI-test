// /src/app/api/admin/onboarding/seed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAdminSession } from "@/lib/jwt";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { Types } from "mongoose";
import { buildDefaultSteps } from "@/lib/onboardingDefaults";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // 관리자 인증
    const cookie = req.cookies.get("admin_session")?.value || "";
    const admin = verifyAdminSession(cookie);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const { customerId, destination, nights, days, departDate } = body || {};

    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_customerId" },
        { status: 400 }
      );
    }

    if (
      !destination ||
      !Number.isFinite(Number(nights)) ||
      !Number.isFinite(Number(days)) ||
      !departDate
    ) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const dep = new Date(departDate);
    if (Number.isNaN(dep.getTime())) {
      return NextResponse.json(
        { ok: false, error: "invalid_departDate" },
        { status: 400 }
      );
    }

    // ❗ 이전 버전은 "이미 있으면 생성 안함" → 이 로직이 문제라 삭제함

    const flow = await OnboardingFlow.create({
      customerId,
      destination,
      nights: Number(nights),
      days: Number(days),
      departDate: dep,
      steps: buildDefaultSteps(),
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      created: true,
      flowId: String(flow._id),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "failed" },
      { status: 500 }
    );
  }
}
