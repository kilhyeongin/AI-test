// /src/lib/buildChecklistStepsFromTemplate.ts
// -------------------------------------------------------
// ChecklistTemplate.items → OnboardingFlow.steps 변환 유틸
//  - MAIN/EXTRA 영역에 따라 순서 구성
//  - defaultRole / defaultKind 에 따라 kind/role 결정
//  - PAYMENT_PIPELINE 항목은 서브태스크 3개 자동 생성
// -------------------------------------------------------

export type ChecklistTemplateItemInput = {
  key?: string;
  title?: string;
  defaultRole?: "admin" | "customer";
  defaultKind?:
    | "ADMIN_UPLOAD_VIEW"
    | "CLIENT_UPLOAD_REVIEW"
    | "PAYMENT_PIPELINE";
  area?: "main" | "extra" | "MAIN" | "EXTRA";
  icon?: string;
};

type Role = "admin" | "customer";
type Kind =
  | "ADMIN_UPLOAD_VIEW"
  | "CLIENT_UPLOAD_REVIEW"
  | "PAYMENT_PIPELINE";

export function buildChecklistStepsFromTemplate(
  items: ChecklistTemplateItemInput[],
) {
  const normArea = (area?: string) => {
    const a = (area || "main").toLowerCase();
    return a === "extra" ? "extra" : "main";
  };

  const mainItems = (items || []).filter(
    (it) => normArea(it.area) === "main",
  );
  const extraItems = (items || []).filter(
    (it) => normArea(it.area) === "extra",
  );

  const steps: any[] = [];
  let order = 1;

  const pushFromItem = (raw: ChecklistTemplateItemInput) => {
    const title = (raw.title || "").trim() || `단계 ${order}`;
    const stepKey = (raw.key || "").trim() || `step_${order}`;
    const defaultRole: Role =
      raw.defaultRole === "customer" ? "customer" : "admin";

    let kind: Kind =
      (raw.defaultKind as Kind | undefined) ||
      (defaultRole === "customer"
        ? "CLIENT_UPLOAD_REVIEW"
        : "ADMIN_UPLOAD_VIEW");

    const icon =
      raw.icon ||
      (kind === "PAYMENT_PIPELINE" ? "💳" : "•");

    const step: any = {
      order,
      title,
      stepKey,
      kind,
      icon,
      filesAdmin: [] as any[],
      filesCustomer: [] as any[],
      subtasks: [] as any[],
      readAdminAt: null,
      readAdminName: "",
      readCustomerAt: null,
      readCustomerName: "",
      done: false,
    };

    // 🔸 결제 파이프라인 → 서브태스크 3개 자동 생성
    if (kind === "PAYMENT_PIPELINE") {
      step.subtasks = [
        {
          key: `${stepKey}_card_copy`,
          title: "카드 사본",
          role: "customer" as Role,
          status: "pending" as const,
          files: [] as any[],
        },
        {
          key: `${stepKey}_card_payment_detail`,
          title: "카드 결제 내역",
          role: "admin" as Role,
          status: "pending" as const,
          files: [] as any[],
        },
        {
          key: `${stepKey}_cash_receipt`,
          title: "현금영수증",
          role: "admin" as Role,
          status: "pending" as const,
          files: [] as any[],
        },
      ];
    }

    steps.push(step);
    order += 1;
  };

  // 필수(MAIN) 먼저, 추가(EXTRA)는 뒤에
  mainItems.forEach(pushFromItem);
  extraItems.forEach(pushFromItem);

  return steps;
}
