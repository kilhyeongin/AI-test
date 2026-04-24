// /src/app/api/onboarding/subtask/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { verifyAdminSession } from "@/lib/jwt";
import { Types } from "mongoose";

/**
 * PATCH  관리자가 PAYMENT_PIPELINE의 서브태스크 상태를 수동으로 변경
 * body: { customerId, flowId?, order, subKey, status: "pending" | "done" }
 */
export async function PATCH(req: NextRequest) {
  await connectDB();

  // 관리자 인증
  const adminCookie = req.cookies.get("admin_session")?.value || "";
  const adminSess = verifyAdminSession(adminCookie);
  if (!adminSess) {
    return NextResponse.json({ ok: false, error: "unauthorized_admin" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok:false, error:"invalid_json" }, { status:400 }); }

  const customerId = String(body?.customerId || "").trim();
  const flowId = String(body?.flowId || "").trim();
  const order = Number(body?.order);
  const subKey = String(body?.subKey || "").trim();
  const status = String(body?.status || "").toLowerCase() as "pending" | "done";

  if (!customerId || !Number.isFinite(order) || !subKey || (status !== "pending" && status !== "done")) {
    return NextResponse.json({ ok:false, error:"missing_fields" }, { status:400 });
  }
  if (!Types.ObjectId.isValid(customerId)) {
    return NextResponse.json({ ok:false, error:"invalid_customer_id" }, { status:400 });
  }
  if (flowId && !Types.ObjectId.isValid(flowId)) {
    return NextResponse.json({ ok:false, error:"invalid_flow_id" }, { status:400 });
  }

  // flowId 있으면 특정 flow, 없으면 최신 flow
  const flowQuery: any = { customerId };
  if (flowId) flowQuery._id = flowId;

  const flow = flowId
    ? await OnboardingFlow.findOne(flowQuery)
    : await OnboardingFlow.findOne(flowQuery).sort({ createdAt: -1 });

  if (!flow) return NextResponse.json({ ok:false, error:"flow_not_found" }, { status:404 });

  const step: any = flow.steps.find((s: any) => s.order === order);
  if (!step) return NextResponse.json({ ok:false, error:"step_not_found" }, { status:404 });

  if (step.kind !== "PAYMENT_PIPELINE") {
    return NextResponse.json({ ok:false, error:"not_payment_pipeline" }, { status:400 });
  }

  const sub = (step.subtasks || []).find((t: any) => t.key === subKey);
  if (!sub) return NextResponse.json({ ok:false, error:"subtask_not_found" }, { status:404 });
  if (sub.role !== "admin") {
    return NextResponse.json({ ok:false, error:"only_admin_subtask_toggle" }, { status:403 });
  }

  try {
    // 원자적 업데이트 — arrayFilters 사용
    const updated = await OnboardingFlow.findOneAndUpdate(
      { _id: flow._id, "steps.order": order, "steps.subtasks.key": subKey },
      { $set: { "steps.$[step].subtasks.$[sub].status": status } },
      {
        arrayFilters: [{ "step.order": order }, { "sub.key": subKey }],
        new: true,
      }
    );

    if (!updated) {
      return NextResponse.json({ ok:false, error:"update_failed" }, { status:500 });
    }

    // step.done 재계산: 모든 서브태스크가 done이면 완료
    const updatedStep = (updated as any).steps?.find((s: any) => s.order === order);
    const allDone = (updatedStep?.subtasks || []).every((t: any) => t.status === "done");

    await OnboardingFlow.updateOne(
      { _id: flow._id, "steps.order": order },
      { $set: { "steps.$.done": allDone } }
    );

    return NextResponse.json({ ok:true, stepDone: allDone, subStatus: status });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:"internal_error", debug:e?.message || String(e) }, { status:500 });
  }
}
