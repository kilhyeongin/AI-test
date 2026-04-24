// /src/lib/onboardingDefaults.ts

// 기본 10단계(관리자/고객 권한 포함)를 한곳에서 정의
export type StepKind =
  | "ADMIN_UPLOAD_VIEW"
  | "CLIENT_UPLOAD_REVIEW"
  | "PAYMENT_PIPELINE";

export function buildDefaultSteps() {
  return [
    {
      order: 1,
      title: "계약서 (관리자)",
      icon: "📄",
      kind: "ADMIN_UPLOAD_VIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },
    {
      order: 2,
      title: "일정표 (관리자)",
      icon: "🗓️",
      kind: "ADMIN_UPLOAD_VIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [], 
      subtasks: [],
    },
    {
      order: 3,
      title: "여권 사본 전송 (고객)",
      icon: "🛂",
      kind: "CLIENT_UPLOAD_REVIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },

    // 4번: 결제 파이프라인(혼합) — 고객: 카드 사본 / 관리자: 카드 결제 내역, 현금영수증
    {
      order: 4,
      title: "항공권 결제",
      icon: "💳",
      kind: "PAYMENT_PIPELINE",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [
        {
          key: "card-copy",
          title: "카드 사본 (고객)",
          role: "customer",
          status: "pending",
          files: [],
        },
        {
          key: "card-receipt",
          title: "카드 결제 내역 (관리자)",
          role: "admin",
          status: "pending",
          files: [],
        },
      ],
    },

    {
      order: 5,
      title: "E-TICKET (관리자)",
      icon: "🎫",
      kind: "ADMIN_UPLOAD_VIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },
    {
      order: 6,
      title: "파이널 안내 (관리자)",
      icon: "📣",
      kind: "ADMIN_UPLOAD_VIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },

    // 7번: 잔금 안내 및 납부 — 관리자 진행(파이프라인이지만 관리자 업무만)
    {
      order: 7,
      title: "잔금 안내 및 납부",
      icon: "💰",
      kind: "PAYMENT_PIPELINE",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [
        {
          key: "last-card-copy",
          title: "카드 사본 (고객)",
          role: "customer",
          status: "pending",
          files: [],
        },
        {
          key: "last-card-receipt",
          title: "카드 결제 내역 (관리자)",
          role: "admin",
          status: "pending",
          files: [],
        },
      ],
    },

    {
      order: 8,
      title: "VISA 발급 (고객)",
      icon: "🪪",
      kind: "CLIENT_UPLOAD_REVIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },

    // ✅ 9번: 여행자 보험 (고객)
    {
      order: 9,
      title: "여행자 보험 (고객)",
      icon: "🛡",
      kind: "CLIENT_UPLOAD_REVIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },

    // ✅ 10번: 최종 설명자료 (관리자)
    {
      order: 10,
      title: "최종 설명자료 (관리자)",
      icon: "📘",
      kind: "ADMIN_UPLOAD_VIEW",
      done: false,
      filesAdmin: [],
      filesCustomer: [],
      subtasks: [],
    },
  ] as const;
}
