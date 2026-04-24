// /src/app/api/onboarding/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { cookies } from "next/headers";
import { verifyCustomerSession } from "@/lib/customerJwt";
import { verifyAdminSession } from "@/lib/jwt";
import { Types } from "mongoose";

// 고객 정보 모델 불러오기
import { Customer } from "@/models/Customer";

// ✅ lean 결과 최소 타입(필요한 필드만)
type CustomerLean = {
  _id: unknown;
  name?: string;
  email?: string;
};

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const flowId = searchParams.get("flowId");
  const customerId = searchParams.get("customerId");

  if (!flowId && !customerId) {
    return NextResponse.json(
      { ok: false, error: "missing_flowId_or_customerId" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_session")?.value || "";
  const clientToken =
    cookieStore.get("customer_session")?.value ||
    cookieStore.get("client_session")?.value ||
    "";

  const admin = adminToken ? verifyAdminSession(adminToken) : null;
  const client = clientToken ? verifyCustomerSession(clientToken) : null;

  let flowDoc: any = null;

  // -----------------------
  // 📌 (1) flowId 우선 조회
  // -----------------------
  if (flowId) {
    if (!Types.ObjectId.isValid(flowId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_flow_id" },
        { status: 400 }
      );
    }
    flowDoc = await OnboardingFlow.findById(flowId).lean();
    if (!flowDoc) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const isCustomerSelf =
      client &&
      client.persona === "customer" &&
      String(client.sub) === String(flowDoc.customerId);

    if (!admin && !isCustomerSelf) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  // -----------------------
  // 📌 (2) customerId 조회
  // -----------------------
  else {
    if (!Types.ObjectId.isValid(customerId!)) {
      return NextResponse.json(
        { ok: false, error: "invalid_customer_id" },
        { status: 400 }
      );
    }

    const isCustomerSelf =
      client &&
      client.persona === "customer" &&
      String(client.sub) === String(customerId);

    if (!admin && !isCustomerSelf) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    flowDoc = await OnboardingFlow.findOne({ customerId }).lean();
    if (!flowDoc) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
  }

  // --------------------------------
  // 📌 고객명/이메일 보강 (중요!)
  // --------------------------------
  let customerName = flowDoc.customerName || "";
  let customerEmail = flowDoc.customerEmail || "";

  try {
    // ✅ 필요한 필드만 select + ✅ lean 결과 타입 고정
    const cust = (await Customer.findById(flowDoc.customerId)
      .select("name email")
      .lean()) as CustomerLean | null;

    if (cust) {
      if (!customerName) customerName = cust.name ?? "";
      if (!customerEmail) customerEmail = cust.email ?? "";
    }
  } catch {}

  // 보강한 값 적용
  flowDoc.customerName = customerName;
  flowDoc.customerEmail = customerEmail;

  return NextResponse.json({
    ok: true,
    flow: {
      ...flowDoc,
      destination: flowDoc.destination || "",
      customerName,
      customerEmail,
      id: String(flowDoc._id),
    },
  });
}
