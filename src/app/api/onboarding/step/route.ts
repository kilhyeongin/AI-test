// /src/app/api/onboarding/step/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { Types } from "mongoose";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/jwt";

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    // 관리자 인증
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value || "";
    const admin = token ? verifyAdminSession(token) : null;

    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const { customerId, order, done, flowId } = body || {};

    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_customerId" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(Number(order))) {
      return NextResponse.json(
        { ok: false, error: "invalid_order" },
        { status: 400 }
      );
    }

    if (typeof done !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "invalid_done" },
        { status: 400 }
      );
    }

    // 어느 플로우를 수정할지 결정
    let flowQuery: any = { customerId };

    if (flowId) {
      if (!Types.ObjectId.isValid(flowId)) {
        return NextResponse.json(
          { ok: false, error: "invalid_flowId" },
          { status: 400 }
        );
      }
      flowQuery._id = flowId;
    }

    // flowId 없으면 해당 고객의 가장 최근 플로우에서 찾기
    const flowDoc = flowId
      ? await OnboardingFlow.findOne(flowQuery).select("_id steps").lean()
      : await OnboardingFlow.findOne(flowQuery).sort({ createdAt: -1 }).select("_id steps").lean();

    if (!flowDoc) {
      return NextResponse.json(
        { ok: false, error: "flow_not_found" },
        { status: 404 }
      );
    }

    const stepExists = (flowDoc as any).steps?.some(
      (s: any) => Number(s.order) === Number(order)
    );

    if (!stepExists) {
      return NextResponse.json(
        { ok: false, error: "step_not_found" },
        { status: 404 }
      );
    }

    // 원자적 업데이트 — findOneAndUpdate + positional operator
    const updated = await OnboardingFlow.findOneAndUpdate(
      { _id: (flowDoc as any)._id, "steps.order": Number(order) },
      { $set: { "steps.$.done": done } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      flowId: String((flowDoc as any)._id),
      order,
      done,
    });
  } catch (e: any) {
    console.error("step PATCH error", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "failed" },
      { status: 500 }
    );
  }
}
