// /src/app/api/admin/onboarding/create-from-template/route.ts
// -------------------------------------------------------
// (이전 방식) 프론트에서 steps 배열을 직접 보내는 온보딩 생성 API
//  - PAYMENT_PIPELINE 단계도 buildChecklistStepsFromTemplate 를 사용해
//    카드 사본 / 카드 결제 내역 / 현금영수증 서브태스크 자동 생성
// -------------------------------------------------------

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OnboardingFlow from "@/models/OnboardingFlow";
import {
  buildChecklistStepsFromTemplate,
  ChecklistTemplateItemInput,
} from "@/lib/buildChecklistStepsFromTemplate";

type Role = "admin" | "customer";
type Kind =
  | "ADMIN_UPLOAD_VIEW"
  | "CLIENT_UPLOAD_REVIEW"
  | "PAYMENT_PIPELINE";

type StepInput = {
  order: number;
  title: string;
  role: Role;
  kind: Kind;
  stepKey: string;
};

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = (await req.json().catch(() => null)) as {
      customerId?: string;
      templateId?: string;
      destination?: string;
      nights?: number;
      days?: number;
      departDate?: string | null;
      steps?: StepInput[];
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "잘못된 요청입니다.(body 없음)" },
        { status: 400 },
      );
    }

    const {
      customerId,
      templateId,
      destination,
      nights,
      days,
      departDate,
      steps: rawSteps,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId 가 필요합니다." },
        { status: 400 },
      );
    }
    if (!destination || !destination.trim()) {
      return NextResponse.json(
        { ok: false, error: "여행지를 입력해 주세요." },
        { status: 400 },
      );
    }
    if (!nights || nights <= 0) {
      return NextResponse.json(
        { ok: false, error: "박수를 입력해 주세요." },
        { status: 400 },
      );
    }
    if (!days || days <= 0) {
      return NextResponse.json(
        { ok: false, error: "일수를 입력해 주세요." },
        { status: 400 },
      );
    }
    if (!departDate) {
      return NextResponse.json(
        { ok: false, error: "출발일을 선택해 주세요." },
        { status: 400 },
      );
    }
    if (!rawSteps || rawSteps.length === 0) {
      return NextResponse.json(
        { ok: false, error: "최소 1개 이상의 단계가 필요합니다." },
        { status: 400 },
      );
    }

    // 프론트에서 넘어온 StepInput[] → ChecklistTemplateItemInput[] 로 변환
    const templateLikeItems: ChecklistTemplateItemInput[] = rawSteps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        key: s.stepKey,
        title: s.title,
        defaultRole: s.role,
        defaultKind: s.kind,
        area: "main",
      }));

    // 동일 유틸로 steps 생성 (PAYMENT_PIPELINE → 서브태스크 자동 포함)
    const steps = buildChecklistStepsFromTemplate(templateLikeItems);

    const doc = await OnboardingFlow.create({
      customerId,
      templateId: templateId || "",
      destination: destination.trim(),
      nights,
      days,
      departDate,
      steps,
    });

    return NextResponse.json(
      {
        ok: true,
        flowId: String(doc._id),
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("create-from-template error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "서버 오류" },
      { status: 500 },
    );
  }
}
