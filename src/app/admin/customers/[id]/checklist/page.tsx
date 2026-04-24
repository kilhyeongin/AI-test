// /src/app/admin/customers/[id]/checklist/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type FileRef = {
  name: string;
  url: string;
  uploadedAt?: string | Date;
  uploadedBy?: "admin" | "customer";
};

type SubTask = {
  key: string;
  title: string;
  role: "admin" | "customer";
  status: "pending" | "done";
  files?: FileRef[];
};

type Step = {
  order: number;
  title: string;
  stepKey?: string; // 템플릿 키 (ticket_payment, final_payment, passport_copy 등)
  icon?: string;
  kind: "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";
  done?: boolean;
  filesAdmin?: FileRef[];
  filesCustomer?: FileRef[];
  subtasks?: SubTask[];

  readAdminAt?: string | Date | null;
  readAdminName?: string | null;
  readCustomerAt?: string | Date | null;
  readCustomerName?: string | null;
};

type Flow = {
  _id?: string;
  id?: string;
  flowId?: string;
  departDate: string;
  steps: Step[];
  customerName?: string;
  customerEmail?: string;
  destination?: string;
  tripTitle?: string;

  itineraryId?: string | null;
  itineraryConnectedAt?: string | Date | null;
};

/** YYYY-MM-DD HH:mm */
function fmtDate(v?: string | Date | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${dd} ${hh}:${mi}`;
}

/** YYYY년 MM월 DD일 HH시 mm분 */
function fmtKoreanDateTime(v?: string | Date | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}년 ${m}월 ${dd}일 ${hh}시 ${mi}분`;
}

function stripRoleSuffix(title: string) {
  return title.replace(/\s*\((관리자|고객)\)\s*$/u, "").trim();
}

type UploadRole = "admin" | "customer";

/**
 * 이 단계에서 "주로" 누가 업로드하는 단계인지 판단
 * - 계약서/일정표/E-TICKET/최종 설명자료 등: 관리자
 * - 여권 사본/여행자 보험/VISA: 고객
 * - 4번 항공권 결제(PAYMENT_PIPELINE): 고객
 * - 7번 잔금 안내 및 납부(PAYMENT_PIPELINE): 관리자
 */
function getUploadRole(step: Step): UploadRole {
  if (step.kind === "ADMIN_UPLOAD_VIEW") return "admin";
  if (step.kind === "CLIENT_UPLOAD_REVIEW") return "customer";

  if (step.order === 4) return "customer"; // 항공권 결제
  if (step.order === 7) return "admin"; // 잔금 안내 및 납부

  return "admin";
}

/** 일정표 스텝인지 (stepKey + 제목 기반) */
function isItineraryStep(step: Step) {
  const clean = stripRoleSuffix(step.title);
  return (
    step.kind === "ADMIN_UPLOAD_VIEW" &&
    (step.stepKey === "itinerary" ||
      step.order === 2 ||
      /일정표/.test(clean) ||
      /일정표/.test(step.title.replace(/\s/g, "")))
  );
}

/** 언제든 업로드 가능한 스텝인지 (여권 사본, E-TICKET, 여행자 보험, 최종 설명자료) */
function isAlwaysOpenStep(step: Step) {
  const key = step.stepKey;
  const clean = stripRoleSuffix(step.title);

  if (key) {
    if (
      key === "passport_copy" ||
      key === "eticket" ||
      key === "insurance" ||
      key === "final_docs"
    ) {
      return true;
    }
  }

  if (/여권\s*사본/.test(clean)) return true;
  if (/E-?TICKET/i.test(clean)) return true;
  if (/여행자\s*보험/.test(clean)) return true;
  if (/최종\s*설명자료/.test(clean)) return true;

  return false;
}

/** 카드 사본 서브태스크인지 (제목 기반) */
function isCardCopySubTask(sub: SubTask) {
  const clean = stripRoleSuffix(sub.title);
  return /카드\s*사본/.test(clean);
}

/** 해당 단계에서 (admin / customer 역할 기준) 마지막 업로드 시점 */
function getLatestUploadAt(
  step: Step,
  uploadRole: UploadRole,
  options?: {
    isItineraryStep?: boolean;
    itineraryConnectedAt?: string | Date | null;
  }
): Date | null {
  const times: number[] = [];

  const pushFiles = (files?: FileRef[]) => {
    (files || []).forEach((f) => {
      if (!f.uploadedAt) return;
      const d = new Date(f.uploadedAt);
      if (!isNaN(d.getTime())) times.push(d.getTime());
    });
  };

  if (uploadRole === "admin") {
    pushFiles(step.filesAdmin);
    (step.subtasks || [])
      .filter((s) => s.role === "admin")
      .forEach((s) => pushFiles(s.files));
  } else {
    pushFiles(step.filesCustomer);
    (step.subtasks || [])
      .filter((s) => s.role === "customer")
      .forEach((s) => pushFiles(s.files));
  }

  if (options?.isItineraryStep && options.itineraryConnectedAt) {
    const d = new Date(options.itineraryConnectedAt);
    if (!isNaN(d.getTime())) {
      times.push(d.getTime());
    }
  }

  if (!times.length) return null;
  return new Date(Math.max(...times));
}

export default function AdminCustomerChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const flowIdFromQuery = searchParams.get("flowId");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [customerName, setCustomerName] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const s = await fetch("/api/auth/admin/me", { cache: "no-store" });
        const sd = await s.json().catch(() => null);
        if (!s.ok || !sd?.ok) {
          location.href = `/admin/login?next=/admin/customers/${id}/checklist`;
          return;
        }

        const gotName = await reload();
        if (!gotName) await ensureCustomerName();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, flowIdFromQuery]);

  async function reload() {
    const qs = flowIdFromQuery
      ? `flowId=${encodeURIComponent(flowIdFromQuery)}`
      : `customerId=${encodeURIComponent(id)}`;

    const r = await fetch(`/api/onboarding/get?${qs}`, { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (r.ok && d?.ok && d.flow) {
      const f = d.flow as Flow;

      const normalized: Flow = {
        ...f,
        flowId: f.flowId || (f as any)._id || (f as any).id,
      };

      setFlow(normalized);
      if (normalized.customerName) {
        setCustomerName(normalized.customerName as string);
        return true;
      }
    }
    return false;
  }

  async function ensureCustomerName() {
    try {
      const r1 = await fetch(`/api/admin/customers/${id}/basic?fields=name`, {
        cache: "no-store",
      });
      if (r1.ok) {
        const d1 = await r1.json().catch(() => null);
        if (d1?.ok && d1?.customer?.name) {
          setCustomerName(d1.customer.name as string);
          return;
        }
      }
    } catch {}

    try {
      const r2 = await fetch(`/api/customers/name?customerId=${id}`, {
        cache: "no-store",
      });
      if (r2.ok) {
        const d2 = await r2.json().catch(() => null);
        if (d2?.ok && d2?.name) {
          setCustomerName(d2.name as string);
          return;
        }
      }
    } catch {}

    setCustomerName("고객");
  }

  const { departISO, daysLeft } = useMemo(() => {
    if (!flow?.departDate)
      return { departISO: "", daysLeft: null as number | null };

    const depart = new Date(flow.departDate);
    if (isNaN(depart.getTime())) {
      return { departISO: "", daysLeft: null as number | null };
    }

    const departISO = `${depart.getFullYear()}-${String(
      depart.getMonth() + 1
    ).padStart(2, "0")}-${String(depart.getDate()).padStart(2, "0")}`;

    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const end = new Date(
      depart.getFullYear(),
      depart.getMonth(),
      depart.getDate()
    ).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    return { departISO, daysLeft: diffDays };
  }, [flow?.departDate]);

  const currentFlowId =
    flow?.flowId ||
    (flow as any)?._id ||
    (flow as any)?.id ||
    flowIdFromQuery ||
    "";

  /** 🔗 항공권 결제/잔금 안내에서 공유할 "카드 사본" 파일들 모으기 */
  const { sharedCardCopyFiles, sharedCardCopyLatestAt } = useMemo(() => {
    if (!flow?.steps) {
      return {
        sharedCardCopyFiles: [] as FileRef[],
        sharedCardCopyLatestAt: null as Date | null,
      };
    }

    const files: FileRef[] = [];
    let latest: Date | null = null;
    const keySet = new Set<string>();

    for (const step of flow.steps) {
      for (const sub of step.subtasks || []) {
        if (!isCardCopySubTask(sub)) continue;
        for (const f of sub.files || []) {
          const k = `${f.name}::${f.url}`;
          if (!keySet.has(k)) {
            keySet.add(k);
            files.push(f);
          }
          if (f.uploadedAt) {
            const d = new Date(f.uploadedAt);
            if (!isNaN(d.getTime())) {
              if (!latest || d.getTime() > latest.getTime()) {
                latest = d;
              }
            }
          }
        }
      }
    }

    return {
      sharedCardCopyFiles: files,
      sharedCardCopyLatestAt: latest,
    };
  }, [flow?.steps]);

  if (loading) return <div style={{ padding: 24 }}>불러오는 중…</div>;
  if (!flow) return <div style={{ padding: 24 }}>데이터가 없습니다.</div>;

  const tripLine = flow.destination || flow.tripTitle || null;

  async function toggleAdminSub(order: number, sub: SubTask) {
    setBusy(true);
    try {
      const next = sub.status === "done" ? "pending" : "done";

      const body: any = {
        customerId: id,
        order,
        subKey: sub.key,
        status: next,
      };
      if (currentFlowId) body.flowId = currentFlowId;

      const r = await fetch("/api/onboarding/subtask", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "상태 변경 실패");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStepDone(step: Step) {
    setBusy(true);
    try {
      const nextDone = !step.done;

      const body: any = {
        customerId: id,
        order: step.order,
        done: nextDone,
      };
      if (currentFlowId) body.flowId = currentFlowId;

      const r = await fetch("/api/onboarding/step", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "단계 상태 변경 실패");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  // ✅ 메인 단계 / 추가 서류 단계 분리
  const sortedSteps = flow.steps.slice().sort((a, b) => a.order - b.order);
  const mainSteps = sortedSteps.filter((s) => !isAlwaysOpenStep(s));
  const alwaysSteps = sortedSteps.filter((s) => isAlwaysOpenStep(s));

  // 공통 카드 렌더 함수 (showOrderPrefix=false면 "7. " 이런 숫자 안 붙임)
  const renderStepCard = (step: Step, showOrderPrefix: boolean) => {
    const cleanStepTitle = stripRoleSuffix(step.title);

    const href = currentFlowId
      ? `/admin/customers/${id}/checklist/${step.order}?flowId=${encodeURIComponent(
          currentFlowId
        )}`
      : `/admin/customers/${id}/checklist/${step.order}`;

    const itStep = isItineraryStep(step);

    const isAirPaymentStep =
      step.kind === "PAYMENT_PIPELINE" &&
      (step.stepKey === "ticket_payment" ||
        step.order === 4 ||
        cleanStepTitle.includes("항공권 결제"));

    const isPaymentPipelineStep =
      step.kind === "PAYMENT_PIPELINE" &&
      (step.stepKey === "ticket_payment" ||
        step.stepKey === "final_payment" ||
        cleanStepTitle.includes("항공권 결제") ||
        cleanStepTitle.includes("잔금 안내") ||
        cleanStepTitle.includes("잔금 안내 및 납부"));

    const disableActions = isAirPaymentStep && step.done;

    const uploadRole = getUploadRole(step);
    let latestUploadAt = getLatestUploadAt(step, uploadRole, {
      isItineraryStep: itStep,
      itineraryConnectedAt: itStep
        ? flow.itineraryConnectedAt ?? null
        : null,
    });

    if (isPaymentPipelineStep && sharedCardCopyLatestAt) {
      if (
        !latestUploadAt ||
        sharedCardCopyLatestAt.getTime() > latestUploadAt.getTime()
      ) {
        latestUploadAt = sharedCardCopyLatestAt;
      }
    }

    let hasUpload = !!latestUploadAt;

    let readAtRaw =
      uploadRole === "customer"
        ? step.readAdminAt || null
        : step.readCustomerAt || null;
    let readerName =
      uploadRole === "customer"
        ? step.readAdminName || null
        : step.readCustomerName || null;

    let readAt = readAtRaw ? new Date(readAtRaw) : null;

    let isRead =
      !!readAt &&
      !!latestUploadAt &&
      !isNaN(readAt.getTime()) &&
      readAt.getTime() >= latestUploadAt.getTime();

    if (isAirPaymentStep && step.done) {
      hasUpload = true;
      isRead = true;
    }

    const statusBoxClass = [
      "card-status-box",
      hasUpload ? "has-upload" : "",
      isRead ? "is-read" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const readLabel =
      hasUpload && isRead && readerName
        ? `${fmtKoreanDateTime(readAt)} ${readerName} 읽음`
        : "";

    const baseFilesForList: FileRef[] = (() => {
      if (step.kind === "ADMIN_UPLOAD_VIEW") return step.filesAdmin || [];
      if (step.kind === "CLIENT_UPLOAD_REVIEW") return step.filesCustomer || [];
      return (step.subtasks || []).flatMap((s) => s.files || []);
    })();

    let filesForList: FileRef[] = [...baseFilesForList];

    if (isPaymentPipelineStep && sharedCardCopyFiles.length > 0) {
      const keySet = new Set(filesForList.map((f) => `${f.name}::${f.url}`));
      for (const f of sharedCardCopyFiles) {
        const k = `${f.name}::${f.url}`;
        if (!keySet.has(k)) {
          keySet.add(k);
          filesForList.push(f);
        }
      }
    }

    if (itStep && flow.itineraryId) {
      const label =
        flow.destination?.trim()
          ? `${flow.destination.trim()} 일정표`
          : flow.tripTitle?.trim()
          ? `${flow.tripTitle.trim()} 일정표`
          : "여행 일정표";

      const virtualFile: FileRef = {
        name: label,
        url: href,
        uploadedAt: flow.itineraryConnectedAt || undefined,
        uploadedBy: "admin",
      };

      filesForList.unshift(virtualFile);
    }

    const titlePrefix = showOrderPrefix ? `${step.order}. ` : "";

    const titleNode =
      disableActions && isAirPaymentStep ? (
        <span className="ttl" style={{ cursor: "default" }}>
          {titlePrefix}
          {cleanStepTitle}
        </span>
      ) : (
        <Link href={href} className="ttl">
          {titlePrefix}
          {cleanStepTitle}
        </Link>
      );

    return (
      <section key={step.order} className="card">
        <div className="card-top">
          <div className="card-title">
            <span className="ico">{step.icon || "•"}</span>
            {titleNode}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div className={statusBoxClass}>{isRead && "✓"}</div>

            {isAirPaymentStep && (
              <button
                type="button"
                className={step.done ? "btn white" : "btn black"}
                disabled={busy}
                onClick={() => toggleStepDone(step)}
                title={
                  step.done
                    ? "이 단계를 다시 대기로 변경"
                    : "결제가 완료된 경우 수동 완료 처리"
                }
              >
                {step.done ? "완료 해제" : "완료"}
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {filesForList.length > 0 ? (
            <div className="files">
              {filesForList.slice(0, 4).map((f, i) => (
                <Link
                  key={i}
                  href={disableActions ? "#" : href}
                  className="filechip"
                  title={f.name}
                  style={
                    disableActions
                      ? { pointerEvents: "none", opacity: 0.6 }
                      : undefined
                  }
                >
                  📎 {f.name}
                  {f.uploadedAt && (
                    <span style={{ marginLeft: 6, color: "#6b7280" }}>
                      ({fmtDate(f.uploadedAt)})
                    </span>
                  )}
                </Link>
              ))}
              {filesForList.length > 4 && (
                <Link
                  href={disableActions ? "#" : href}
                  className="filechip"
                  style={
                    disableActions
                      ? { pointerEvents: "none", opacity: 0.6 }
                      : undefined
                  }
                >
                  +{filesForList.length - 4} 더 보기
                </Link>
              )}
            </div>
          ) : (
            <p className="muted">
              {step.kind === "ADMIN_UPLOAD_VIEW"
                ? "관리자가 업로드한 파일이 없습니다."
                : step.kind === "CLIENT_UPLOAD_REVIEW"
                ? "고객 업로드 파일이 없습니다."
                : "서브태스크 파일이 없습니다."}
            </p>
          )}

          {step.kind === "PAYMENT_PIPELINE" && (
            <div className="subs" style={{ marginTop: 10 }}>
              {(step.subtasks || []).map((sub) => {
                const cleanTitle = stripRoleSuffix(sub.title);
                const roleLabel = sub.role === "admin" ? "관리자" : "고객";

                const isCardPaymentDetail =
                  cleanTitle.includes("카드 결제 내역");
                const isCashReceipt = cleanTitle.includes("현금영수증");
                const isUploadOnlyAdminSub =
                  sub.role === "admin" &&
                  (isCardPaymentDetail || isCashReceipt);

                return (
                  <div key={sub.key} className="subrow">
                    <div className="sub-left" style={{ gap: 10 }}>
                      <span className="dot" />
                      <span className="sub-ttl">{cleanTitle}</span>
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          color: "#374151",
                          background: "#fff",
                        }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    <div
                      className="sub-right"
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      {disableActions ? (
                        <span className="muted" style={{ fontSize: 12 }}>
                          완료된 단계입니다.
                        </span>
                      ) : isUploadOnlyAdminSub ? (
                        <Link
                          href={href}
                          className="btn black"
                          title="파일 업로드"
                        >
                          업로드
                        </Link>
                      ) : (
                        <>
                          <span className={`state ${sub.status}`}>
                            {sub.status === "done" ? "완료" : "대기"}
                          </span>

                          {sub.role === "admin" ? (
                            <button
                              className={
                                sub.status === "done" ? "btn white" : "btn black"
                              }
                              disabled={busy}
                              onClick={() => toggleAdminSub(step.order, sub)}
                              title={
                                sub.status === "done"
                                  ? "다시 대기 상태로 변경"
                                  : "완료로 표시"
                              }
                            >
                              {sub.status === "done"
                                ? "대기로 변경"
                                : "완료로 표시"}
                            </button>
                          ) : (
                            <Link
                              href={href}
                              className="btn line"
                              title="상세로 이동"
                            >
                              상세
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step.kind === "ADMIN_UPLOAD_VIEW" && (
            <div className="actions" style={{ marginTop: 16 }}>
              <Link
                href={href}
                className="btn black"
                style={{
                  fontSize: 15,
                  padding: "10px 20px",
                  borderRadius: "22px",
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                업로드
              </Link>
            </div>
          )}

          {step.kind === "CLIENT_UPLOAD_REVIEW" && (
            <div className="actions" style={{ marginTop: 16 }}>
              <Link href={href} className="btn line">
                상세
              </Link>
            </div>
          )}

          {hasUpload && readLabel && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#0f766e",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              {readLabel}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="page">
      <div className="wrap">
        <header className="hero">
          <div className="hero-main">
            {customerName ? `${customerName} 체크리스트` : "관리자 체크리스트"}
          </div>

          {tripLine && <div className="hero-sub">{tripLine}</div>}

          <div className="hero-sub">출발일 {departISO}</div>

          <div className="hero-hi" style={{ marginTop: 8 }}>
            {daysLeft !== null && daysLeft > 0 && (
              <>
                여행 출발까지 <b>{daysLeft}일</b> 남았습니다.
              </>
            )}
            {daysLeft !== null && daysLeft === 0 && (
              <>오늘 출발하는 일정입니다.</>
            )}
            {daysLeft !== null && daysLeft < 0 && <>이미 출발한 여행입니다.</>}
          </div>
        </header>

        {/* 순서대로 진행되는 메인 단계 (번호 표시) */}
        <main className="grid">
          {mainSteps.map((step) => renderStepCard(step, true))}
        </main>

        {/* 언제든 업로드 가능한 추가 서류 (번호 X) */}
        {alwaysSteps.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div
              className="card-top"
              style={{ marginBottom: 10, padding: "0 2px" }}
            >
              <div className="card-title">
                <span className="ico">🗂️</span>
                <span className="ttl">추가 서류 업로드</span>
              </div>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                margin: "0 0 12px 2px",
              }}
            >
              여권 사본, E-TICKET, 여행자 보험, 최종 설명자료는 고객 화면 하단의
              ‘추가 서류 업로드’ 영역에 표시됩니다.
            </p>

            <main className="grid">
              {alwaysSteps.map((step) => renderStepCard(step, false))}
            </main>
          </section>
        )}

        <style jsx global>{`
          .card-status-box {
            width: 26px;
            height: 26px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #6b7280;
            background: #ffffff;
          }
          .card-status-box.has-upload {
            background: #d1ddf3;
            border-color: #d1ddf3;
            color: #2f44ad;
          }
          .card-status-box.is-read {
            background: #d1ddf3;
            border-color: #d1ddf3;
            color: #2f44ad;
            font-size: 20px;
          }
          .card-status-box,
          .card-status-box.has-upload,
          .card-status-box.is-read {
            font-family: "Inter", "Segoe UI", Roboto, Arial, sans-serif !important;
          }
        `}</style>
      </div>
    </div>
  );
}
