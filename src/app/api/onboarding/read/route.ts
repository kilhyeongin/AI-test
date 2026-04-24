// /src/app/api/onboarding/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { getAdminSession } from "@/lib/session";
import { getCustomerId } from "@/lib/customerSession";
import { Types } from "mongoose";

/**
 * 읽음 처리 API
 *
 * POST /api/onboarding/read
 * body:
 * {
 *   flowId: string;
 *   order: number;
 *   viewerRole: "admin" | "customer";
 *   viewerName?: string;
 * }
 *
 * 역할:
 *   - admin    → steps.$.readAdminAt,    steps.$.readAdminName
 *   - customer → steps.$.readCustomerAt, steps.$.readCustomerName
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      flowId?: string;
      order?: number;
      viewerRole?: "admin" | "customer";
      viewerName?: string;
      role?: "admin" | "customer";
      readerName?: string;
    };

    const { flowId, order, viewerRole, viewerName, role, readerName } = body;

    const effectiveRole = (viewerRole ?? role) as "admin" | "customer" | undefined;
    const effectiveName = (viewerName ?? readerName) || "";

    if (!flowId || typeof order !== "number" || !effectiveRole) {
      return NextResponse.json(
        { ok: false, error: "flowId, order, viewerRole(or role)은 필수입니다." },
        { status: 400 }
      );
    }

    if (effectiveRole !== "admin" && effectiveRole !== "customer") {
      return NextResponse.json(
        { ok: false, error: "viewerRole/role은 'admin' 또는 'customer' 여야 합니다." },
        { status: 400 }
      );
    }

    // 세션 검증
    if (effectiveRole === "admin") {
      const admin = await getAdminSession();
      if (!admin) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    } else {
      const customerId = await getCustomerId();
      if (!customerId) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      if (!Types.ObjectId.isValid(flowId)) {
        return NextResponse.json({ ok: false, error: "invalid_flowId" }, { status: 400 });
      }
      await connectDB();
      const owns = await OnboardingFlow.exists({ _id: flowId, customerId });
      if (!owns) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    await connectDB();

    const query = {
      _id: flowId,
      "steps.order": order,
    };

    const now = new Date();
    const set: Record<string, any> = {};

    if (effectiveRole === "admin") {
      set["steps.$.readAdminAt"] = now;
      set["steps.$.readAdminName"] = effectiveName;
    } else {
      set["steps.$.readCustomerAt"] = now;
      set["steps.$.readCustomerName"] = effectiveName;
    }

    const updated = await OnboardingFlow.findOneAndUpdate(
      query,
      { $set: set },
      {
        new: true,
        projection: { steps: 1 },
      }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "해당 플로우 또는 단계를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const step = (updated as any).steps?.find(
      (s: any) => s.order === order
    );

    return NextResponse.json({ ok: true, step }, { status: 200 });
  } catch (err) {
    console.error("POST /api/onboarding/read error:", err);
    return NextResponse.json(
      { ok: false, error: "읽음 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
