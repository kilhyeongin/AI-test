// /src/app/customer/(with-header)/checklist/[flowId]/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type FileRef = { name: string; url: string; uploadedAt?: string | Date };

type SubTask = {
  key: string;
  title: string;
  role: "admin" | "customer";
  status: "pending" | "done";
  files?: FileRef[] | undefined;
};

type Step = {
  order: number;
  title: string;
  stepKey?: string;
  icon?: string;
  kind: "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";
  done?: boolean;
  filesAdmin?: FileRef[];
  filesCustomer?: FileRef[];
  subtasks?: SubTask[];
  readCustomerAt?: string | Date;
};

type Flow = {
  id: string;
  departDate: string;
  steps: Step[];
  customerName?: string;
  destination?: string;
  itineraryId?: string | null;
};

type Me = { id: string; email: string; name: string };

type ItinerarySummary = {
  _id: string;
  title: string;
  createdAt?: string | Date | null;
  country?: string;
  city?: string;
};

function stripRoleSuffix(title: string) {
  return title.replace(/\s*\((관리자|고객)\)\s*$/u, "").trim();
}

function fmtYMD(v?: string | Date) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getLatestUploadAt(step: Step): Date | null {
  const times: number[] = [];
  const pushFiles = (files?: FileRef[]) => {
    (files || []).forEach((f) => {
      if (!f.uploadedAt) return;
      const d = new Date(f.uploadedAt);
      if (!Number.isNaN(d.getTime())) times.push(d.getTime());
    });
  };

  pushFiles(step.filesAdmin);
  pushFiles(step.filesCustomer);
  (step.subtasks || []).forEach((sub) => pushFiles(sub.files as FileRef[]));

  if (!times.length) return null;
  return new Date(Math.max(...times));
}

function getLatestAdminUploadAt(step: Step): Date | null {
  const times: number[] = [];
  const pushFiles = (files?: FileRef[]) => {
    (files || []).forEach((f) => {
      if (!f.uploadedAt) return;
      const d = new Date(f.uploadedAt);
      if (!Number.isNaN(d.getTime())) times.push(d.getTime());
    });
  };

  pushFiles(step.filesAdmin);
  (step.subtasks || [])
    .filter((s) => s.role === "admin")
    .forEach((s) => pushFiles(s.files as FileRef[]));

  if (!times.length) return null;
  return new Date(Math.max(...times));
}

function getLatestCustomerUploadAt(step: Step): Date | null {
  const times: number[] = [];
  const pushFiles = (files?: FileRef[]) => {
    (files || []).forEach((f) => {
      if (!f.uploadedAt) return;
      const d = new Date(f.uploadedAt);
      if (!Number.isNaN(d.getTime())) times.push(d.getTime());
    });
  };

  pushFiles(step.filesCustomer);
  (step.subtasks || [])
    .filter((s) => s.role === "customer")
    .forEach((s) => pushFiles(s.files as FileRef[]));

  if (!times.length) return null;
  return new Date(Math.max(...times));
}

function isItineraryStep(step: Step) {
  const clean = stripRoleSuffix(step.title);
  return (
    step.kind === "ADMIN_UPLOAD_VIEW" &&
    (step.stepKey === "itinerary" ||
      /일정표/.test(clean) ||
      /일정표/.test(step.title.replace(/\s/g, "")))
  );
}

function isAlwaysOpenStep(step: Step) {
  const key = step.stepKey;
  const clean = stripRoleSuffix(step.title);

  if (key && ["passport_copy", "eticket", "insurance", "final_docs"].includes(key)) return true;

  if (/여권\s*사본/.test(clean)) return true;
  if (/E-?TICKET/i.test(clean)) return true;
  if (/여행자\s*보험/.test(clean)) return true;
  if (/최종\s*설명자료/.test(clean)) return true;

  return false;
}

/** ✅ 결제 파이프라인에서 “현금영수증” 제외, “카드 사본/카드 결제 내역”만 */
function isAllowedPaymentSubtask(sub: SubTask) {
  const t = stripRoleSuffix(sub.title);
  const isCardCopy = /카드\s*사본/.test(t) || sub.key === "card_copy";
  const isCardPay = /카드\s*결제\s*내역/.test(t) || sub.key === "card_payment";
  return isCardCopy || isCardPay;
}

function isStepCompletedForCustomer(
  step: Step,
  options?: { itineraryCreatedAt?: Date | null }
): boolean {
  if (step.kind === "PAYMENT_PIPELINE") return !!step.done;

  const adminUploadAt = getLatestAdminUploadAt(step);
  const customerUploadAt = getLatestCustomerUploadAt(step);

  const itineraryFlag = isItineraryStep(step);
  const adminBaseTime =
    itineraryFlag && options?.itineraryCreatedAt ? options.itineraryCreatedAt : adminUploadAt;

  if (step.kind === "ADMIN_UPLOAD_VIEW") {
    if (!adminBaseTime) return false;
    if (!step.readCustomerAt) return false;
    const readAt = new Date(step.readCustomerAt);
    if (Number.isNaN(readAt.getTime())) return false;
    return readAt.getTime() >= adminBaseTime.getTime();
  }

  if (step.kind === "CLIENT_UPLOAD_REVIEW") {
    return !!customerUploadAt;
  }

  return false;
}

export default function CustomerFlowPage() {
  const params = useParams();
  const flowId = String((params as Record<string, string | string[] | undefined>)?.flowId || "");

  const [me, setMe] = useState<Me | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);

  const [itinerary, setItinerary] = useState<ItinerarySummary | null>(null);

  // ✅ 모바일 판정(클라이언트에서만)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/customer/me", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          location.href = `/customer/login?next=/customer/checklist/${flowId}`;
          return;
        }
        setMe(d.user as Me);

        const r2 = await fetch(`/api/onboarding/get?flowId=${encodeURIComponent(flowId)}`, {
          cache: "no-store",
        });
        const f = await r2.json().catch(() => null);

        if (r2.ok && f?.ok && f.flow) {
          const realFlowId = String(f.flow._id || f.flow.id || flowId);
          const fl: Flow = {
            id: realFlowId,
            departDate: f.flow.departDate,
            steps: (f.flow.steps || []) as Step[],
            customerName: f.flow.customerName,
            destination: f.flow.destination,
            itineraryId: f.flow.itineraryId || null,
          };
          setFlow(fl);
        } else {
          setFlow(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [flowId]);

  // 일정표 요약(완료판정에만 사용)
  useEffect(() => {
    (async () => {
      if (!flow?.itineraryId) {
        setItinerary(null);
        return;
      }
      try {
        const res = await fetch(`/api/admin/itineraries/${encodeURIComponent(flow.itineraryId)}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok || !data.itinerary) {
          setItinerary(null);
          return;
        }
        const it = data.itinerary as any;
        setItinerary({
          _id: String(it._id),
          title: it.title || "여행 일정표",
          createdAt: it.createdAt || null,
          country: it.country || "",
          city: it.city || "",
        });
      } catch {
        setItinerary(null);
      }
    })();
  }, [flow?.itineraryId]);

  const { daysLeft, departISO } = useMemo(() => {
    if (!flow?.departDate) return { daysLeft: null as number | null, departISO: "" };

    const depart = new Date(flow.departDate);
    const departISO = fmtYMD(depart) || "";

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(depart.getFullYear(), depart.getMonth(), depart.getDate()).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    return { daysLeft: diffDays, departISO };
  }, [flow?.departDate]);

  const itineraryCreatedAt = useMemo(() => {
    if (!itinerary?.createdAt) return null;
    const d = new Date(itinerary.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }, [itinerary?.createdAt]);

  /** ✅ 공유 파일 수집: 카드 사본 + 카드 결제 내역 */
  const sharedPayment = useMemo(() => {
    const base = {
      cardCopyFiles: [] as FileRef[],
      cardCopyLatestAt: null as Date | null,
      cardPayFiles: [] as FileRef[],
      cardPayLatestAt: null as Date | null,
    };

    if (!flow?.steps) return base;

    const seenCopy = new Set<string>();
    const seenPay = new Set<string>();

    const push = (kind: "copy" | "pay", f: FileRef) => {
      const key = `${f.name}::${f.url}`;
      if (kind === "copy") {
        if (!seenCopy.has(key)) {
          seenCopy.add(key);
          base.cardCopyFiles.push(f);
        }
        if (f.uploadedAt) {
          const d = new Date(f.uploadedAt);
          if (!Number.isNaN(d.getTime())) {
            if (!base.cardCopyLatestAt || d.getTime() > base.cardCopyLatestAt.getTime())
              base.cardCopyLatestAt = d;
          }
        }
      } else {
        if (!seenPay.has(key)) {
          seenPay.add(key);
          base.cardPayFiles.push(f);
        }
        if (f.uploadedAt) {
          const d = new Date(f.uploadedAt);
          if (!Number.isNaN(d.getTime())) {
            if (!base.cardPayLatestAt || d.getTime() > base.cardPayLatestAt.getTime())
              base.cardPayLatestAt = d;
          }
        }
      }
    };

    for (const st of flow.steps) {
      for (const sub of st.subtasks || []) {
        if (!isAllowedPaymentSubtask(sub)) continue;

        const t = stripRoleSuffix(sub.title);
        const isCopy = /카드\s*사본/.test(t) || sub.key === "card_copy";
        const isPay = /카드\s*결제\s*내역/.test(t) || sub.key === "card_payment";

        for (const f of (sub.files || []) as FileRef[]) {
          if (isCopy) push("copy", f);
          if (isPay) push("pay", f);
        }
      }
    }

    return base;
  }, [flow?.steps]);

  const { mainSteps, alwaysSteps, lockedOrders } = useMemo(() => {
    if (!flow?.steps) {
      return { mainSteps: [] as Step[], alwaysSteps: [] as Step[], lockedOrders: new Set<number>() };
    }

    const allSorted = [...flow.steps].sort((a, b) => a.order - b.order);
    const alwaysSteps = allSorted.filter((s) => isAlwaysOpenStep(s));
    const mainSteps = allSorted.filter((s) => !isAlwaysOpenStep(s));

    const lockedOrders = new Set<number>();
    let currentIdx = -1;

    for (let i = 0; i < mainSteps.length; i++) {
      const completed = isStepCompletedForCustomer(mainSteps[i], { itineraryCreatedAt });
      if (!completed) {
        currentIdx = i;
        break;
      }
    }

    if (currentIdx >= 0) {
      for (let j = currentIdx + 1; j < mainSteps.length; j++) lockedOrders.add(mainSteps[j].order);
    }

    return { mainSteps, alwaysSteps, lockedOrders };
  }, [flow?.steps, itineraryCreatedAt]);

  if (loading) return <div style={{ padding: 24 }}>불러오는 중…</div>;
  if (!me) return <div style={{ padding: 24 }}>로그인이 필요합니다.</div>;
  if (!flow) return <div style={{ padding: 24 }}>해당 체크리스트를 찾을 수 없어요.</div>;

  const flowIdSafe = flow.id;
  const displayName = flow.customerName || me.name;

  async function markStepRead(step: Step) {
    try {
      await fetch("/api/onboarding/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: flowIdSafe,
          order: step.order,
          role: "customer",
          readerName: displayName,
        }),
      });
    } catch {}
  }

  function StepCard(props: { step: Step; isLocked: boolean; displayIndex?: number | null }) {
    const { step, isLocked, displayIndex } = props;

    const detailHref = `/customer/checklist/${flowIdSafe}/${step.order}`;
    const cleanTitle = stripRoleSuffix(step.title);

    let filesForList: FileRef[] = (() => {
      if (step.kind === "ADMIN_UPLOAD_VIEW") return step.filesAdmin || [];
      if (step.kind === "CLIENT_UPLOAD_REVIEW") return step.filesCustomer || [];
      return (step.subtasks || [])
        .filter((s) => s.role === "customer" && isAllowedPaymentSubtask(s))
        .flatMap((s) => (s.files || []) as FileRef[]);
    })();

    const isPaymentPipelineStep = step.kind === "PAYMENT_PIPELINE";

    // 결제 파이프라인 카드: 공유 파일 합침
    if (isPaymentPipelineStep) {
      const seen = new Set(filesForList.map((f) => `${f.name}::${f.url}`));
      for (const f of [...sharedPayment.cardCopyFiles, ...sharedPayment.cardPayFiles]) {
        const k = `${f.name}::${f.url}`;
        if (!seen.has(k)) {
          seen.add(k);
          filesForList.push(f);
        }
      }
    }

    let latestUploadAt = getLatestUploadAt(step);

    // 결제 단계는 공유 업로드 시각도 인정
    if (isPaymentPipelineStep) {
      const candidates = [latestUploadAt, sharedPayment.cardCopyLatestAt, sharedPayment.cardPayLatestAt]
        .filter(Boolean) as Date[];
      latestUploadAt = candidates.length
        ? new Date(Math.max(...candidates.map((d) => d.getTime())))
        : null;
    }

    const hasUpload = !!latestUploadAt;
    const readAt = step.readCustomerAt ? new Date(step.readCustomerAt) : null;
    const isRead = !!readAt && !!latestUploadAt && readAt.getTime() >= latestUploadAt.getTime();

    const statusBoxClass = ["card-status-box", hasUpload ? "has-upload" : "", isRead ? "is-read" : ""]
      .filter(Boolean)
      .join(" ");

    const isCompletedForCustomer = isStepCompletedForCustomer(step, { itineraryCreatedAt });

    // ✅ 모바일에서는 완료/미완료 상관없이 "초기값 무조건 접힘"
    //    PC에서는 기존대로(완료면 접힘, 미완료면 펼침)
    const initialCollapsed = isMobile ? true : isCompletedForCustomer;

    const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);

    // ✅ isMobile 값이 뒤늦게 결정될 수 있어서, 모바일로 판정되면 한 번 접어줌
    useEffect(() => {
      if (isMobile) setCollapsed(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile]);

    const isCollapsed = collapsed;

    // ✅ 잠금은 펼치기 불가, 잠금 아니면 탭해서 펼치기 가능
    const canToggle = !isLocked;

    const titlePrefix = displayIndex ? `${displayIndex}. ` : "";

    return (
      <section
        className={`card ${isLocked ? "is-locked" : ""} ${isCollapsed ? "mobile-collapsed" : ""}`}
        onClick={() => {
          // 모바일에서 접혀있을 때 탭하면 펼치기 (잠금은 불가)
          if (isMobile && canToggle && isCollapsed) setCollapsed(false);
        }}
      >
        <div className="card-top">
          <div className="card-title">
            <span className="ico">{step.icon || "•"}</span>

            {isLocked ? (
              <span className="ttl ttl-disabled">
                {titlePrefix}
                {cleanTitle}
              </span>
            ) : isCollapsed ? (
              <span className="ttl ttl-collapsed">
                {titlePrefix}
                {cleanTitle}
              </span>
            ) : (
              <Link href={detailHref} className="ttl" onClick={() => markStepRead(step)}>
                {titlePrefix}
                {cleanTitle}
              </Link>
            )}
          </div>

          <div className="card-top-right">
            <div className={statusBoxClass}>{isRead && "✓"}</div>
          </div>
        </div>

        <div className={`card-body ${isCollapsed ? "body-collapsed" : ""}`}>
          {filesForList.length > 0 ? (
            <div className="files">
              {filesForList.slice(0, 4).map((f, i) => {
                const dt = fmtYMD(f.uploadedAt);
                return (
                  <Link
                    key={i}
                    href={detailHref}
                    className="filechip"
                    title={f.name}
                    onClick={() => markStepRead(step)}
                  >
                    📎 {f.name}
                    {dt && <span style={{ marginLeft: 6, color: "#6b7280" }}>({dt})</span>}
                  </Link>
                );
              })}
              {filesForList.length > 4 && (
                <Link href={detailHref} className="filechip" onClick={() => markStepRead(step)}>
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
              {(step.subtasks || [])
                .filter(isAllowedPaymentSubtask)
                .map((sub) => {
                  const cleanSubTitle = stripRoleSuffix(sub.title);
                  const roleLabel = sub.role === "admin" ? "관리자" : "고객";

                  return (
                    <div key={sub.key} className="subrow">
                      <div className="sub-left" style={{ gap: 10 }}>
                        <span className="dot" />
                        <span className="sub-ttl">{cleanSubTitle}</span>
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

                      <div className="sub-right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link href={detailHref} className="btn line" onClick={() => markStepRead(step)}>
                          상세
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {step.kind === "CLIENT_UPLOAD_REVIEW" && !isLocked && (
            <div className="actions" style={{ marginTop: 16 }}>
              <Link href={detailHref} className="btn black" onClick={() => markStepRead(step)}>
                업로드 / 수정
              </Link>
            </div>
          )}

          {step.kind === "ADMIN_UPLOAD_VIEW" && !isLocked && (
            <div className="actions" style={{ marginTop: 16 }}>
              <Link href={detailHref} className="btn line" onClick={() => markStepRead(step)}>
                상세
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <div className="wrap wrap-customer">
        <header className="hero">
          <div className="hero-main">{displayName} 체크리스트</div>
          {flow.destination && <div className="hero-sub">{flow.destination}</div>}
          <div className="hero-sub">출발일 {departISO}</div>

          <div className="hero-hi" style={{ marginTop: 8 }}>
            {daysLeft !== null && daysLeft > 0 && (
              <>
                여행 출발까지 <b>{daysLeft}일</b> 남았어요!
              </>
            )}
            {daysLeft !== null && daysLeft === 0 && <>오늘 출발하는 날이에요!</>}
            {daysLeft !== null && daysLeft < 0 && <>여행이 시작되었어요. 즐거운 여행 되세요!</>}
          </div>
        </header>

        <main className="grid grid-two">
          {mainSteps.map((step, idx) => (
            <StepCard key={step.order} step={step} isLocked={lockedOrders.has(step.order)} displayIndex={idx + 1} />
          ))}
        </main>

        {alwaysSteps.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#111827" }}>
              추가 서류 업로드
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px 0" }}>
              여권 사본, E-TICKET, 여행자 보험, 최종 설명자료는 미리 올려 두셔도 괜찮습니다.
            </p>

            <div className="grid grid-two">
              {alwaysSteps.map((step) => (
                <StepCard key={step.order} step={step} isLocked={false} displayIndex={null} />
              ))}
            </div>
          </section>
        )}

        <style jsx global>{`
          .wrap.wrap-customer {
            max-width: 1280px !important;
          }

          .grid.grid-two {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          @media (max-width: 900px) {
            .grid.grid-two {
              grid-template-columns: 1fr;
            }
          }

          .card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .card-top-right {
            display: flex;
            align-items: center;
            gap: 6px;
          }

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

          .card.is-locked {
            opacity: 0.45;
            pointer-events: none;
            user-select: none;
          }
          .ttl.ttl-disabled {
            color: #9ca3af;
            cursor: default;
          }
          .ttl.ttl-collapsed {
            cursor: pointer;
          }

          /* ✅ 모바일에서 "접힌 상태"는 간격/여백을 확 줄여서 빽빽하지 않게 */
          @media (max-width: 768px) {
            /* 접힌 카드끼리 간격 줄이기 */
            .grid.grid-two {
              gap: 10px !important;
            }

            /* 접힌 카드 자체 padding/내부 gap 줄이기 */
            .card.mobile-collapsed {
              padding: 12px 14px !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04) !important;
            }
            .card.mobile-collapsed .card-top {
              gap: 6px !important;
            }
            .card.mobile-collapsed .ico {
              font-size: 20px !important;
            }
            .card.mobile-collapsed .ttl {
              font-size: 15px !important;
            }

            /* 접힌 상태면 본문은 완전히 숨김 */
            .card-body.body-collapsed {
              display: none !important;
            }

            .wrap.wrap-customer {
              padding-top: 16px !important;
            }

            .hero {
              padding: 12px 14px !important;
              margin-bottom: 12px !important;
              border-radius: 14px !important;
              box-shadow: none !important; /* 덜 두껍게 */
            }

            .hero-main {
              margin-top: 2px !important;
              font-size: 18px !important;
              font-weight: 800 !important;
              line-height: 1.2 !important;
            }

            .hero-sub {
              margin-top: 4px !important;
              font-size: 12px !important;
              line-height: 1.35 !important;
            }

            .hero-hi {
              margin-top: 6px !important;
              font-size: 12px !important;
              line-height: 1.35 !important;
            }

            .hero-hi b {
              font-weight: 800 !important;
            }
            .card + .card {
              margin-top: 0px;
            }
          }

          /* 더 작은 폰(아이폰 SE급)에서 한 번 더 압축 */
          @media (max-width: 420px) {
            .hero {
              padding: 10px 12px !important;
              margin-bottom: 10px !important;
              border-radius: 12px !important;
            }

            .hero-main {
              font-size: 17px !important;
            }

            .hero-sub,
            .hero-hi {
              font-size: 11.5px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
