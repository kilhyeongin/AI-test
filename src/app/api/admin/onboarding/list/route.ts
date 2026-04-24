// /src/app/api/admin/onboarding/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { verifyAdminSession } from "@/lib/jwt";
import { cookies } from "next/headers";
import { Types } from "mongoose";
import { Customer } from "@/models/Customer";

type RawFlow = {
  _id: any;
  customerId: any;
  destination?: string;
  nights?: number;
  days?: number;
  departDate?: Date | string;
  createdAt?: Date | string;
  steps?: { done?: boolean }[];
  customerName?: string;
};

type StateItem = {
  id: string;
  destination: string;
  nights: number;
  days: number;
  departDate?: string | null;
  createdAt?: string | null;
  progress: string; // "3/9" | "전체 완료" | "-"
};

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: "missing_customerId" },
      { status: 400 }
    );
  }

  if (!Types.ObjectId.isValid(customerId)) {
    return NextResponse.json(
      { ok: false, error: "invalid_customerId" },
      { status: 400 }
    );
  }

  // 관리자 인증
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_session")?.value || "";
  const admin = adminToken ? verifyAdminSession(adminToken) : null;

  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // 해당 고객의 모든 플로우 조회
  const flows = (await OnboardingFlow.find({ customerId })
    .sort({ createdAt: -1 })
    .lean()) as RawFlow[];

  let customerName = "";

  // 1) 플로우 자체에 customerName 저장된 경우
  if (flows[0]?.customerName) {
    customerName = flows[0].customerName || "";
  }

  // 2) Customer 모델에서 이름 가져오기
  if (!customerName) {
    try {
      const cust = (await Customer.findById(customerId)
        .select("name")
        .lean()) as any; // ⚡ 타입 단언으로 .name 빨간줄 제거

      if (cust?.name) {
        customerName = cust.name;
      }
    } catch {
      // ignore
    }
  }

  if (!customerName) {
    customerName = "고객";
  }

  // 화면용 변환
  const mapped: StateItem[] = flows.map((it) => {
    const dest = it.destination || "";
    const n = it.nights ?? 0;
    const d = it.days ?? 0;

    // 날짜 형식 통일 (ISO 문자열)
    const departDate =
      it.departDate instanceof Date
        ? it.departDate.toISOString()
        : it.departDate
        ? new Date(it.departDate).toISOString()
        : null;

    const createdAt =
      it.createdAt instanceof Date
        ? it.createdAt.toISOString()
        : it.createdAt
        ? new Date(it.createdAt).toISOString()
        : null;

    const total = Array.isArray(it.steps) ? it.steps.length : 0;
    const doneCount = Array.isArray(it.steps)
      ? it.steps.filter((s) => s.done).length
      : 0;

    let progress = "-";
    if (total > 0) {
      progress = doneCount === total ? "전체 완료" : `${doneCount}/${total}`;
    }

    return {
      id: String(it._id),
      destination: dest,
      nights: n,
      days: d,
      departDate,
      createdAt,
      progress,
    };
  });

  return NextResponse.json({
    ok: true,
    customerName,
    items: mapped,
  });
}
