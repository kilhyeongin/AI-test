// /src/app/api/admin/onboarding/create/route.ts
// -------------------------------------------------------
// 관리자용 온보딩 플로우(체크리스트) 생성 API
//  - POST /api/admin/onboarding/create
//  body:
//    {
//      customerId?: string;
//      customerName: string;
//      customerEmail?: string;
//      destination?: string;
//      departDate: string;      // ISO 문자열
//      templateId: string;      // ChecklistTemplate _id
//    }
//  - ChecklistTemplate.items 를 이용해 steps 생성
//    (PAYMENT_PIPELINE 항목은 카드 사본/결제내역/현금영수증 서브태스크 자동 생성)
// -------------------------------------------------------

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnboardingFlow } from "@/models/OnboardingFlow";
import { ChecklistTemplate } from "@/models/ChecklistTemplate";
import { getAdminSession } from "@/lib/session";
import { buildChecklistStepsFromTemplate } from "@/lib/buildChecklistStepsFromTemplate";

export async function POST(req: Request) {
  try {
    // 1) 관리자 세션 확인
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "관리자 인증 실패" },
        { status: 401 },
      );
    }

    await connectDB();

    // 2) 요청 body 파싱
    const body = (await req.json().catch(() => null)) as {
      customerId?: string;
      customerName?: string;
      customerEmail?: string;
      destination?: string;
      departDate?: string;
      templateId?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "잘못된 요청입니다.(body 없음)" },
        { status: 400 },
      );
    }

    const {
      customerId,
      customerName,
      customerEmail,
      destination,
      departDate,
      templateId,
    } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json(
        { ok: false, error: "고객 이름을 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!departDate) {
      return NextResponse.json(
        { ok: false, error: "출발일을 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { ok: false, error: "체크리스트 템플릿을 선택해 주세요." },
        { status: 400 },
      );
    }

    // 3) 템플릿 로드
    const tplDoc = await ChecklistTemplate.findById(templateId).lean();
    if (!tplDoc) {
      return NextResponse.json(
        { ok: false, error: "선택한 템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // any 단언으로 TS 경고 회피
    const tpl: any = tplDoc;
    const items = ((tpl && tpl.items) || []) as any[];

    // 4) 템플릿 items → steps 변환
    const steps = buildChecklistStepsFromTemplate(items);

    const adminId = (admin as any)?.id || null;
    const adminName = (admin as any)?.name || "";

    // 5) 온보딩 플로우 생성
    const doc = await OnboardingFlow.create({
      customerId: customerId || null,
      customerName: customerName.trim(),
      customerEmail: customerEmail?.trim() || undefined,
      destination: destination?.trim() || "",
      departDate,
      steps,
      itineraryId: null,
      createdByAdminId: adminId,
      createdByAdminName: adminName,
    });

    return NextResponse.json(
      {
        ok: true,
        flowId: String(doc._id),
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("POST /api/admin/onboarding/create error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 },
    );
  }
}
