// src/lib/checklistTemplates.ts
// ---------------------------------------------
// 온보딩/체크리스트 스텝 템플릿 정의
//  - Admin 고객 체크리스트 생성 화면에서 사용
//  - 각 item.key 가 Step.stepKey 로 저장됨
// ---------------------------------------------

export type Role = "admin" | "customer";
export type Kind =
  | "ADMIN_UPLOAD_VIEW"
  | "CLIENT_UPLOAD_REVIEW"
  | "PAYMENT_PIPELINE";

export type ChecklistTemplateSubtask = {
  key: string;
  title: string;
  role: Role;
};

export type ChecklistTemplateItem = {
  /** 이 항목을 식별하는 키 (Step.stepKey 로 들어감) */
  key: string;
  /** 카드/체크리스트에 표시되는 제목 */
  title: string;
  /** 기본 담당자 (관리자 / 고객) */
  defaultRole: Role;
  /** 기본 스텝 종류 */
  defaultKind: Kind;
  /** PAYMENT_PIPELINE 등에서 사용할 서브태스크 기본 구성 */
  defaultSubtasks?: ChecklistTemplateSubtask[];
};

export type ChecklistTemplate = {
  id: string;
  name: string;
  items: ChecklistTemplateItem[];
};

/**
 * 기본 템플릿
 */
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "default",
    name: "기본 템플릿",
    items: [
      {
        key: "contract",
        title: "계약서",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        key: "itinerary",
        title: "일정표",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (고객이 여권 사본 업로드)
        key: "passport_copy",
        title: "여권 사본",
        defaultRole: "customer",
        defaultKind: "CLIENT_UPLOAD_REVIEW",
      },
      {
        // ✅ 4. 항공권 결제 (결제 파이프라인)
        key: "ticket_payment",
        title: "항공권 결제",
        defaultRole: "customer",
        defaultKind: "PAYMENT_PIPELINE",
        defaultSubtasks: [
          {
            key: "card_copy",
            title: "카드 사본 (고객)",
            role: "customer",
          },
          {
            key: "card_payment_detail",
            title: "카드 결제 내역 (관리자)",
            role: "admin",
          },
          {
            key: "cash_receipt",
            title: "현금영수증 (관리자)",
            role: "admin",
          },
        ],
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (관리자가 E-TICKET 업로드)
        key: "eticket",
        title: "E-TICKET",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        key: "final_notice",
        title: "파이널 안내",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        // ✅ 7. 잔금 안내 및 납부 (결제 파이프라인)
        key: "final_payment",
        title: "잔금 안내 및 납부",
        defaultRole: "admin",
        defaultKind: "PAYMENT_PIPELINE",
        defaultSubtasks: [
          {
            key: "card_copy_final",
            title: "카드 사본 (고객)",
            role: "customer",
          },
          {
            key: "card_payment_detail_final",
            title: "카드 결제 내역 (관리자)",
            role: "admin",
          },
          {
            key: "cash_receipt_final",
            title: "현금영수증 (관리자)",
            role: "admin",
          },
        ],
      },
      {
        key: "visa",
        title: "VISA 발급",
        defaultRole: "customer",
        defaultKind: "CLIENT_UPLOAD_REVIEW",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (고객 여행자 보험 증서)
        key: "insurance",
        title: "여행자 보험",
        defaultRole: "customer",
        defaultKind: "CLIENT_UPLOAD_REVIEW",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (관리자 최종 설명자료)
        key: "final_docs",
        title: "최종 설명자료",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
    ],
  },
];

// 템플릿 id 타입 (나중에 다른 템플릿 추가해도 자동으로 따라감)
export type ChecklistTemplateId = (typeof CHECKLIST_TEMPLATES)[number]["id"];

/** id 로 템플릿 조회 */
export function getChecklistTemplate(
  id: ChecklistTemplateId,
): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((t) => t.id === id);
}
