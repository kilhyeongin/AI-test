// /src/app/api/onboarding/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { cookies } from "next/headers";
import { verifyCustomerSession } from "@/lib/customerJwt";
import { verifyAdminSession } from "@/lib/jwt";
import { Types } from "mongoose";

// ✅ 고객 기본정보 모델에서 이름/이메일 가져오기
import { Customer } from "@/models/Customer";

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

  // 1) flowId 우선 조회
  if (flowId) {
    if (!Types.ObjectId.isValid(flowId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_flow_id" },
        { status: 400 }
      );
    }

    flowDoc = await OnboardingFlow.findById(flowId).lean();
    if (!flowDoc) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    // 접근 제어: 고객이면 본인 플로우만 접근 가능
    const isCustomerSelf =
      client &&
      client.persona === "customer" &&
      String(client.sub) === String(flowDoc.customerId);
    if (!admin && !isCustomerSelf) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }
  } else {
    // 2) flowId 없으면 customerId로 단일 플로우 조회(기존 호환)
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
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    flowDoc = await OnboardingFlow.findOne({ customerId }).lean();
    if (!flowDoc) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
  }

  // ✅ 여기서 customerName / customerEmail 보강
  let customerName: string = flowDoc.customerName || "";
  let customerEmail: string = flowDoc.customerEmail || "";

  if (!customerName || !customerEmail) {
    try {
      const cust = await Customer.findById(flowDoc.customerId)
        .select("name email")
        .lean();

      if (cust) {
        if (!customerName && (cust as any).name) {
          customerName = (cust as any).name;
        }
        if (!customerEmail && (cust as any).email) {
          customerEmail = (cust as any).email;
        }
      }
    } catch {
      // Customer 조회 실패해도 에러로 터뜨리지는 않고, 빈 값이면 그대로 둠
    }
  }

  // flowDoc에 최종값 반영
  flowDoc.customerName = customerName || flowDoc.customerName || "";
  flowDoc.customerEmail = customerEmail || flowDoc.customerEmail || "";

  return NextResponse.json({
    ok: true,
    flow: {
      ...flowDoc,
      destination: flowDoc.destination || "",
      customerName: flowDoc.customerName || "",
      customerEmail: flowDoc.customerEmail || "",
      id: String(flowDoc._id),
    },
  });
}
