// /src/app/customer/(with-header)/checklist/[flowId]/[order]/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VisaNotice } from "@/components/checklist/VisaNotice";
import { CustomerItinerarySection } from "@/components/checklist/CustomerItinerarySection";

type Me = { id: string; email: string; name: string };

type FileRef = {
  name: string;
  url: string; // 레거시 fallback (서명 없는 S3 URL일 수 있음)
  s3Key?: string | null;
  uploadedAt?: string | Date;
  uploadedBy?: "admin" | "customer";
  uploadedByName?: string;
};

type SharedFileRef = FileRef & {
  __originOrder: number;
  __originSubKey: string;
  __isShared: true;
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
  stepKey?: string;
  icon?: string;
  kind: "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";
  done?: boolean;
  filesAdmin?: FileRef[];
  filesCustomer?: FileRef[];
  subtasks?: SubTask[];
};

type Flow = {
  steps: Step[];
  departDate?: string;
  customerName?: string;
  destination?: string;
  itineraryId?: string | null;
};

const MAX_BYTES = 60 * 1024 * 1024;

const IMG_ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

function stripRoleSuffix(title: string) {
  return title.replace(/\s*\((관리자|고객)\)\s*$/u, "").trim();
}

function fmtYMD(v?: string | Date) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ✅ url이 private일 수 있으므로 name/s3Key/url 모두 참고해 확장자로 이미지 판정
function isImageLike(f: Pick<FileRef, "name" | "url" | "s3Key">) {
  const base = (f.s3Key || f.name || f.url || "").split("?")[0];
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(base);
}

// ✅ 레거시 url만 있을 때 key 추출 (bucket 도메인/경로 스타일 모두 pathname이 key임)
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const key = u.pathname.replace(/^\/+/, "");
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
}

/** ✅ 현금영수증은 완전 제외, 카드 사본/카드 결제 내역만 허용 */
function isAllowedPaymentSubtask(sub: SubTask) {
  const t = stripRoleSuffix(sub.title);

  const isCash =
    /현금\s*영수증/.test(t) ||
    sub.key === "cash_receipt" ||
    /cash\s*receipt/i.test(sub.key || "");

  if (isCash) return false;

  const isCardCopy = /카드\s*사본/.test(t) || sub.key === "card_copy";
  const isCardPay = /카드\s*결제\s*내역/.test(t) || sub.key === "card_payment";

  return isCardCopy || isCardPay;
}

function getPaymentKind(sub: SubTask): "card_copy" | "card_payment" | null {
  const t = stripRoleSuffix(sub.title);
  if (/카드\s*사본/.test(t) || sub.key === "card_copy") return "card_copy";
  if (/카드\s*결제\s*내역/.test(t) || sub.key === "card_payment") return "card_payment";
  return null;
}

function getUploadLine(f: FileRef | SharedFileRef) {
  const dt = fmtYMD(f.uploadedAt);
  const isShared = (f as any).__isShared === true;

  if (isShared) return dt ? `공유됨 ${dt}` : "공유됨";
  const who = f.uploadedBy === "admin" ? "관리자 업로드" : "고객 업로드";
  return dt ? `${who} ${dt}` : who;
}

export default function CustomerStepDetailPage() {
  const params = useParams();
  const router = useRouter();

  const flowId = String((params as any)?.flowId || "");
  const order = String((params as any)?.order || "");

  const [me, setMe] = useState<Me | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [step, setStep] = useState<Step | null>(null);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ 핵심: presigned URL 캐시는 "state"가 아니라 "ref"로 저장
   * -> setState로 effect가 재트리거되어 무한 호출 나는 문제를 원천 차단
   */
  const viewUrlRef = useRef<Map<string, string>>(new Map());
  const inFlight = useRef<Set<string>>(new Set());
  const [viewVer, setViewVer] = useState(0); // 화면 갱신 트리거

  const getKey = useCallback((f: Pick<FileRef, "s3Key" | "url">) => {
    return (f.s3Key || extractS3KeyFromUrl(f.url || ""))?.trim() || "";
  }, []);

  const fetchViewUrl = useCallback(async (key: string): Promise<string | null> => {
    const r = await fetch("/api/uploads/view-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      cache: "no-store",
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok || !d.viewUrl) return null;
    return String(d.viewUrl);
  }, []);

  const ensureViewUrlsForKeys = useCallback(
    async (keys: string[]) => {
      const uniq = Array.from(new Set(keys)).filter(Boolean);

      const todo = uniq.filter((k) => !viewUrlRef.current.has(k) && !inFlight.current.has(k));
      if (todo.length === 0) return;

      todo.forEach((k) => inFlight.current.add(k));
      try {
        const results = await Promise.all(
          todo.map(async (k) => {
            const url = await fetchViewUrl(k);
            return [k, url] as const;
          })
        );

        let changed = false;
        for (const [k, url] of results) {
          if (url && !viewUrlRef.current.has(k)) {
            viewUrlRef.current.set(k, url);
            changed = true;
          }
        }
        if (changed) setViewVer((v) => v + 1);
      } finally {
        todo.forEach((k) => inFlight.current.delete(k));
      }
    },
    [fetchViewUrl]
  );

  /**
   * ✅ 중요: 미리보기(img)는 presigned 없으면 src를 비워서 “요청 자체”를 막는다.
   * (S3 원본 url로 먼저 요청했다가 403/캐시 꼬임/재시도 루프 방지)
   */
  const resolveImgSrc = useCallback(
    (f: FileRef | SharedFileRef) => {
      const key = getKey(f);
      if (!key) return "";
      return viewUrlRef.current.get(key) || "";
    },
    [getKey, viewVer]
  );

  /**
   * ✅ “열기” 버튼은 항상 presigned 우선
   * - 캐시에 있으면 캐시 사용
   * - 없으면 단건 발급 후 캐시에 저장
   * - 실패 시에만 레거시 url fallback (403일 수 있음)
   */
  const openFile = useCallback(
    async (f: FileRef | SharedFileRef) => {
      try {
        const key = getKey(f);
        if (key) {
          const cached = viewUrlRef.current.get(key);
          if (cached) {
            window.open(cached, "_blank", "noopener,noreferrer");
            return;
          }

          if (!inFlight.current.has(key)) {
            inFlight.current.add(key);
            try {
              const url = await fetchViewUrl(key);
              if (url) {
                viewUrlRef.current.set(key, url);
                setViewVer((v) => v + 1);
                window.open(url, "_blank", "noopener,noreferrer");
                return;
              }
            } finally {
              inFlight.current.delete(key);
            }
          }
        }

        window.open(f.url, "_blank", "noopener,noreferrer");
      } catch {
        alert("파일 열기에 실패했습니다.");
      }
    },
    [fetchViewUrl, getKey]
  );

  // ✅ 고객 인증 + 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/customer/me", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          location.href = `/customer/login?next=/customer/checklist/${encodeURIComponent(flowId)}/${encodeURIComponent(order)}`;
          return;
        }
        setMe(d.user as Me);
        await reload();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, order]);

  async function reload() {
    const r = await fetch(`/api/onboarding/get?flowId=${encodeURIComponent(flowId)}`, { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok || !d.flow) return;

    const steps = (d.flow.steps || []) as Step[];
    const target = steps.find((s) => s.order === Number(order));

    const inferredName =
      d.flow?.customerName ||
      d.flow?.customer?.name ||
      d.customer?.name ||
      d.user?.name ||
      d.name ||
      "";

    setFlow({
      ...d.flow,
      steps,
      customerName: inferredName || d.flow?.customerName || undefined,
    });

    setStep(target || null);
  }

  const departISO = useMemo(() => {
    if (!flow?.departDate) return "";
    const d = new Date(flow.departDate);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [flow?.departDate]);

  const customerName = flow?.customerName || me?.name || "";
  const destination = flow?.destination || "";

  const isVisaStep = !!step && (step.order === 8 || /visa/i.test(step.title) || /비자/.test(step.title));
  const isPaymentStep = step?.kind === "PAYMENT_PIPELINE";

  const isItineraryStep =
    !!step &&
    step.kind === "ADMIN_UPLOAD_VIEW" &&
    (() => {
      const clean = stripRoleSuffix(step.title);
      return step.stepKey === "itinerary" || /일정표/.test(clean);
    })();

  // ✅ 결제 공유(카드사본/결제내역) 전역 합치기
  const sharedPayment = useMemo(() => {
    const base = { card_copy: [] as SharedFileRef[], card_payment: [] as SharedFileRef[] };
    if (!flow?.steps) return base;

    const seen = { card_copy: new Set<string>(), card_payment: new Set<string>() };

    for (const st of flow.steps) {
      for (const sub of st.subtasks || []) {
        if (!isAllowedPaymentSubtask(sub)) continue;
        const kind = getPaymentKind(sub);
        if (!kind) continue;

        for (const f of sub.files || []) {
          const k = `${f.name}::${f.url}`;
          if (seen[kind].has(k)) continue;
          seen[kind].add(k);

          base[kind].push({
            ...f,
            __originOrder: st.order,
            __originSubKey: sub.key,
            __isShared: true,
          });
        }
      }
    }
    return base;
  }, [flow?.steps]);

  const { images, documents } = useMemo(() => {
    const acc: { images: FileRef[]; documents: FileRef[] } = { images: [], documents: [] };
    if (!step) return acc;
    if (isPaymentStep) return acc;

    const collect = (arr?: FileRef[]) => {
      for (const f of arr || []) {
        if (isImageLike(f)) acc.images.push(f);
        else acc.documents.push(f);
      }
    };

    if (step.kind === "CLIENT_UPLOAD_REVIEW") collect(step.filesCustomer);
    else if (step.kind === "ADMIN_UPLOAD_VIEW") collect(step.filesAdmin);
    else collect(step.filesAdmin);

    return acc;
  }, [step, isPaymentStep]);

  /**
   * ✅ 프리패치: 현재 화면에서 필요한 "이미지 key"만 모아서 한 번에 캐싱
   * - signature는 viewUrlRef/viewVer와 무관하게 "step + 파일목록" 기반으로만 결정
   * - 그래서 viewUrlRef가 채워져도 signature가 바뀌지 않아 무한호출 안 남
   */
  const imageKeySignature = useMemo(() => {
    if (!step) return "";

    const keys: string[] = [];

    const push = (arr?: FileRef[]) => {
      for (const f of arr || []) {
        if (!isImageLike(f)) continue;
        const k = getKey(f);
        if (k) keys.push(k);
      }
    };

    if (!isPaymentStep) {
      if (step.kind === "CLIENT_UPLOAD_REVIEW") push(step.filesCustomer);
      else if (step.kind === "ADMIN_UPLOAD_VIEW") push(step.filesAdmin);
    } else {
      for (const sub of step.subtasks || []) {
        if (!isAllowedPaymentSubtask(sub)) continue;
        for (const f of sub.files || []) {
          if (!isImageLike(f)) continue;
          const k = getKey(f);
          if (k) keys.push(k);
        }
      }
    }

    return Array.from(new Set(keys)).sort().join("|");
  }, [getKey, isPaymentStep, step]);

  useEffect(() => {
    (async () => {
      if (!imageKeySignature) return;
      const keys = imageKeySignature.split("|").filter(Boolean);
      if (keys.length === 0) return;
      await ensureViewUrlsForKeys(keys);
    })();
  }, [ensureViewUrlsForKeys, imageKeySignature]);

  // ================== 업로드/삭제 ==================
  async function presignAndUpload(file: File, opts: { kind: "image" | "doc"; subKey?: string }) {
    if (!me || !step) return null;

    if (file.size > MAX_BYTES) {
      alert("최대 60MB까지 업로드 가능합니다.");
      return null;
    }

    if (opts.kind === "image" && !IMG_ACCEPT.includes(file.type)) {
      alert("이미지 파일만 업로드해주세요.");
      return null;
    }
    if (opts.kind === "doc" && ![...DOC_ACCEPT, "application/octet-stream"].includes(file.type)) {
      alert("문서/PDF/ZIP 등 파일만 가능합니다.");
      return null;
    }

    const presignRes = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
        customerId: me.id,
        flowId,
        order: step.order,
        actor: "customer",
        ...(opts.subKey ? { subKey: opts.subKey } : {}),
      }),
    });

    const ps = await presignRes.json().catch(() => null);
    if (!presignRes.ok || !ps?.ok) {
      alert(ps?.error || "업로드 URL 발급 실패");
      return null;
    }

    const put = await fetch(ps.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!put.ok) {
      alert("S3 업로드 실패");
      return null;
    }

    const upUrl = new URL(ps.uploadUrl as string);
    const publicUrl = `${upUrl.origin}${upUrl.pathname}`;

    return { publicUrl, s3Key: ps.object?.key || null };
  }

  async function doUploadGeneric(file: File, kind: "image" | "doc") {
    if (!me || !step) return;
    setBusy(true);
    try {
      const uploaded = await presignAndUpload(file, { kind });
      if (!uploaded) return;

      const regist = await fetch("/api/onboarding/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: me.id,
          flowId,
          order: step.order,
          actor: "customer",
          file: { name: file.name, url: uploaded.publicUrl, s3Key: uploaded.s3Key },
        }),
      });

      const d = await regist.json().catch(() => null);
      if (!regist.ok || !d?.ok) {
        alert(d?.error || "반영 실패");
        return;
      }

      // ✅ 업로드 직후 캐시 선채움(이미지)
      if (uploaded.s3Key && kind === "image") {
        const k = String(uploaded.s3Key);
        const v = await fetchViewUrl(k);
        if (v) {
          viewUrlRef.current.set(k, v);
          setViewVer((x) => x + 1);
        }
      }

      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeGeneric(file: FileRef) {
    if (!me || !step) return;
    if (!confirm("파일을 삭제할까요?")) return;

    setBusy(true);
    try {
      const del = await fetch("/api/onboarding/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: me.id,
          flowId,
          order: step.order,
          actor: "customer",
          fileUrl: file.url,
          fileKey: file.s3Key || undefined,
        }),
      });

      const d = await del.json().catch(() => null);
      if (!del.ok || !d?.ok) {
        alert(d?.error || "삭제 실패");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function doUploadForSub(sub: SubTask, file: File) {
    if (!me || !step) return;
    if (step.kind !== "PAYMENT_PIPELINE") return;

    if (sub.role !== "customer") {
      alert("고객 업로드 항목이 아닙니다.");
      return;
    }
    if (!isAllowedPaymentSubtask(sub)) return;

    setBusy(true);
    try {
      const uploaded = await presignAndUpload(file, { kind: "image", subKey: sub.key });
      if (!uploaded) return;

      const regist = await fetch("/api/onboarding/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: me.id,
          flowId,
          order: step.order,
          actor: "customer",
          subKey: sub.key,
          file: { name: file.name, url: uploaded.publicUrl, s3Key: uploaded.s3Key },
        }),
      });

      const d = await regist.json().catch(() => null);
      if (!regist.ok || !d?.ok) {
        alert(d?.error || "저장 실패");
        return;
      }

      if (uploaded.s3Key) {
        const k = String(uploaded.s3Key);
        const v = await fetchViewUrl(k);
        if (v) {
          viewUrlRef.current.set(k, v);
          setViewVer((x) => x + 1);
        }
      }

      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeForSubAt(opts: { order: number; subKey: string; file: FileRef }) {
    if (!me) return;
    if (!confirm("파일을 삭제할까요?")) return;

    setBusy(true);
    try {
      const del = await fetch("/api/onboarding/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: me.id,
          flowId,
          order: opts.order,
          actor: "customer",
          subKey: opts.subKey,
          fileUrl: opts.file.url,
          fileKey: opts.file.s3Key || undefined,
        }),
      });

      const d = await del.json().catch(() => null);
      if (!del.ok || !d?.ok) {
        alert(d?.error || "삭제 실패");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  // ---------- render ----------
  if (loading) return <div style={{ padding: 24 }}>불러오는 중…</div>;
  if (!me || !flow || !step) return <div style={{ padding: 24 }}>not_found</div>;

  const cleanStepTitle = stripRoleSuffix(step.title);

  return (
    <div className="wrap">
      {/* HEADER */}
      <header className="head">
        <button className="back" onClick={() => router.push(`/customer/checklist/${encodeURIComponent(flowId)}`)}>
          ←
        </button>

        <div className="title" style={{ textAlign: "center" }}>
          <div className="sub">
            {customerName} · {destination || "여행"} · 출발일 {departISO || "-"}
          </div>
          <h1>
            <span className="ico" style={{ marginRight: 6 }}>
              {step.icon || "•"}
            </span>
            {step.order}. {cleanStepTitle}
          </h1>
        </div>

        <span style={{ width: 36 }} />
      </header>

      {isVisaStep && <VisaNotice />}

      {isItineraryStep && (
        <section className="sec" style={{ marginTop: 12, marginBottom: 24 }}>
          <CustomerItinerarySection flowId={flowId} />
        </section>
      )}

      {/* 일반 단계 */}
      {!isPaymentStep && (
        <>
          {/* 이미지 */}
          <section className="sec">
            <div className="sec-title">
              <span>{isVisaStep ? "📎 파일 첨부" : "📷 사진 갤러리"}</span>
              <span className="chip-count">{images.length}장</span>
              <div className="sec-actions">
                <label className="btn black upbtn">
                  {isVisaStep ? "이미지 첨부" : "이미지 업로드"}
                  <input
                    type="file"
                    accept={IMG_ACCEPT.join(",")}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) doUploadGeneric(f, "image");
                      e.currentTarget.value = "";
                    }}
                    disabled={busy}
                  />
                </label>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="empty">{isVisaStep ? "발급받은 VISA 확인서를 이미지로 첨부해주세요." : "이미지 파일이 없습니다."}</div>
            ) : (
              <div className="gallery-grid">
                {images.map((f, i) => {
                  const src = resolveImgSrc(f); // ✅ presigned 없으면 ""
                  return (
                    <div key={i} className="gallery-card">
                      {src ? (
                        <img className="gallery-thumb" src={src} alt={f.name} />
                      ) : (
                        <div
                          className="gallery-thumb"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f8fafc",
                            color: "#94a3b8",
                            fontSize: 12,
                          }}
                        >
                          불러오는 중…
                        </div>
                      )}

                      <div className="gallery-meta">
                        <span className="gallery-name" title={f.name}>
                          {f.name}
                        </span>
                        <div className="gallery-actions">
                          <button className="open" type="button" onClick={() => openFile(f)}>
                            열기
                          </button>
                          <button className="del-btn" onClick={() => removeGeneric(f)}>
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 문서 */}
          {!isVisaStep && (
            <section className="sec">
              <div className="sec-title">
                <span>📎 첨부 문서</span>
                <span className="chip-count">{documents.length}개</span>
                <div className="sec-actions">
                  <label className="btn white upbtn">
                    파일 업로드
                    <input
                      type="file"
                      accept={[...DOC_ACCEPT, ".pdf", ".zip"].join(",")}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) doUploadGeneric(f, "doc");
                        e.currentTarget.value = "";
                      }}
                      disabled={busy}
                    />
                  </label>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="empty">첨부 문서가 없습니다.</div>
              ) : (
                <div className="doc-list">
                  {documents.map((f, i) => {
                    const dt = fmtYMD(f.uploadedAt);
                    return (
                      <div key={i} className="doc-item">
                        <div className="doc-left">
                          <div className="doc-icon">📄</div>
                          <div>
                            <div className="doc-name" title={f.name}>
                              {f.name}
                            </div>
                            <div className="doc-sub">{dt ? dt : ""}</div>
                          </div>
                        </div>
                        <div className="doc-actions">
                          <button className="doc-link" type="button" onClick={() => openFile(f)}>
                            열기
                          </button>
                          <button className="del-btn" onClick={() => removeGeneric(f)}>
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 결제 파이프라인 */}
      {isPaymentStep && (
        <section className="sec">
          <div className="sec-title">
            <span>💳 {cleanStepTitle || "결제 증빙"}</span>
          </div>

          <div className="subs" style={{ marginTop: 10 }}>
            {(step.subtasks || [])
              .filter(isAllowedPaymentSubtask)
              .map((sub) => {
                const cleanSubTitle = stripRoleSuffix(sub.title);
                const isCustomerSub = sub.role === "customer";
                const kind = getPaymentKind(sub);

                const mergedFiles: (FileRef | SharedFileRef)[] = (() => {
                  const base = (sub.files || []) as (FileRef | SharedFileRef)[];
                  if (!kind) return base;

                  const shared = sharedPayment[kind] || [];
                  const keySet = new Set(base.map((f) => `${f.name}::${f.url}`));
                  const out = [...base];

                  for (const sf of shared) {
                    const k = `${sf.name}::${sf.url}`;
                    if (!keySet.has(k)) {
                      keySet.add(k);
                      out.push(sf);
                    }
                  }
                  return out;
                })();

                const imageFiles = mergedFiles.filter((f) => isImageLike(f));
                const otherFiles = mergedFiles.filter((f) => !isImageLike(f));

                return (
                  <div key={sub.key} className="pay-block">
                    <div className="pay-preview-row">
                      {imageFiles.length === 0 ? (
                        <span className="pay-preview-empty">첨부된 이미지가 없습니다.</span>
                      ) : (
                        imageFiles.map((f, i) => {
                          const line2 = getUploadLine(f);
                          const isShared = (f as any).__isShared === true;
                          const src = resolveImgSrc(f);

                          return (
                            <div key={i} className="pay-preview-card">
                              {src ? (
                                <img className="pay-preview-img" src={src} alt={f.name} />
                              ) : (
                                <div
                                  className="pay-preview-img"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#f8fafc",
                                    color: "#94a3b8",
                                    fontSize: 12,
                                  }}
                                >
                                  불러오는 중…
                                </div>
                              )}

                              <div className="pay-preview-meta">
                                <div className="pay3-name" title={f.name}>
                                  {f.name}
                                </div>
                                <div className="pay3-sub">{line2}</div>
                                <div className="pay3-actions">
                                  <button type="button" className="pay3-open" onClick={() => openFile(f)}>
                                    열기
                                  </button>

                                  {isCustomerSub && (
                                    <button
                                      className="pay3-del"
                                      onClick={() => {
                                        const sf = f as SharedFileRef;
                                        if (isShared) {
                                          removeForSubAt({ order: sf.__originOrder, subKey: sf.__originSubKey, file: f });
                                        } else {
                                          removeForSubAt({ order: step.order, subKey: sub.key, file: f });
                                        }
                                      }}
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {otherFiles.length > 0 && (
                      <div className="pay-other-list">
                        {otherFiles.map((f, i) => {
                          const line2 = getUploadLine(f);
                          const isShared = (f as any).__isShared === true;

                          return (
                            <div key={i} className="pay-other-item3">
                              <div className="pay3-name" title={f.name}>
                                {f.name}
                              </div>
                              <div className="pay3-sub">{line2}</div>
                              <div className="pay3-actions">
                                <button type="button" className="pay3-open" onClick={() => openFile(f)}>
                                  열기
                                </button>

                                {isCustomerSub && (
                                  <button
                                    className="pay3-del"
                                    onClick={() => {
                                      const sf = f as SharedFileRef;
                                      if (isShared) {
                                        removeForSubAt({ order: sf.__originOrder, subKey: sf.__originSubKey, file: f });
                                      } else {
                                        removeForSubAt({ order: step.order, subKey: sub.key, file: f });
                                      }
                                    }}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="subrow">
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
                          {isCustomerSub ? "고객" : "관리자"}
                        </span>
                      </div>

                      <div className="sub-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCustomerSub ? (
                          <label className="btn black upbtn">
                            파일 첨부
                            <input
                              type="file"
                              accept={IMG_ACCEPT.join(",")}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) doUploadForSub(sub, f);
                                e.currentTarget.value = "";
                              }}
                              disabled={busy}
                            />
                          </label>
                        ) : (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>이 항목은 관리자 업로드 전용입니다.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* 결제 파이프라인 스타일(기존 유지) */}
          <style jsx global>{`
            .pay-block {
              margin-bottom: 18px;
              padding: 14px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              background: #ffffff;
              box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
            }
            .pay-block .subrow {
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px dashed #e5e7eb;
            }
            .pay-preview-row {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 10px;
            }
            @media (max-width: 980px) {
              .pay-preview-row {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            @media (max-width: 560px) {
              .pay-preview-row {
                grid-template-columns: 1fr;
              }
            }
            .pay-preview-card {
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              background: #fff;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
              transition: transform 120ms ease, box-shadow 120ms ease;
            }
            .pay-preview-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
            }
            .pay-preview-img {
              width: 100%;
              height: 170px;
              object-fit: contain;
              background: #f8fafc;
              border-bottom: 1px solid #eef2f7;
            }
            .pay-preview-meta {
              padding: 12px 12px 10px;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .pay3-name {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .pay3-sub {
              font-size: 12px;
              color: #64748b;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .pay3-actions {
              display: flex;
              gap: 10px;
              align-items: center;
              margin-top: 2px;
            }
            .pay3-open {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 6px 10px;
              border-radius: 10px;
              border: 1px solid #dbeafe;
              color: #1d4ed8;
              font-size: 12px;
              text-decoration: none;
              transition: filter 120ms ease;
              background: #fff;
              cursor: pointer;
            }
            .pay3-open:hover {
              filter: brightness(0.97);
            }
            .pay3-del {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 6px 10px;
              border-radius: 10px;
              border: 1px solid #fee2e2;
              color: #b91c1c;
              font-size: 12px;
              cursor: pointer;
              background: #fff;
            }
            .pay3-del:hover {
              filter: brightness(0.98);
            }
            .pay-preview-empty {
              font-size: 12px;
              color: #94a3b8;
              padding: 10px 2px;
            }
            .pay-other-list {
              margin: 10px 0 0;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
              padding-top: 10px;
              border-top: 1px solid #eef2f7;
            }
            @media (max-width: 560px) {
              .pay-other-list {
                grid-template-columns: 1fr;
              }
            }
            .pay-other-item3 {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              background: #f8fafc;
              padding: 12px;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .sec-title {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }
            .upbtn input {
              display: none;
            }
          `}</style>
        </section>
      )}
    </div>
  );
}
