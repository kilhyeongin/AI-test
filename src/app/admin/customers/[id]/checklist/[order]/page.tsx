// /src/app/admin/customers/[id]/checklist/[order]/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { VisaNotice } from "@/components/checklist/VisaNotice";

type FileRef = {
  name: string;
  url: string;
  s3Key?: string | null;
  uploadedAt?: string | Date;
  uploadedBy?: "admin" | "customer";
  uploadedByName?: string;
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
const isImage = (url: string) => /\.(png|jpe?g|webp|gif)$/i.test(url);

type ScheduleLine = { time?: string; text?: string };
type DayPlan = {
  day: number;
  date?: string;
  schedules?: ScheduleLine[];
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  hotelKr?: string;
  hotelEn?: string;
  hotelGrade?: string;
  hotelAddress?: string;
  hotelHomepage?: string;
};
type ItineraryDoc = {
  _id: string;
  title: string;
  description?: string;
  country?: string;
  city?: string;
  includeText?: string;
  excludeText?: string;
  travelerText?: string;
  shoppingText?: string;
  managerName?: string;
  mode: "PNR" | "MANUAL";
  createdAt?: string;
  days?: DayPlan[];
};

function stripRoleSuffix(title: string) {
  return title.replace(/\s*\((관리자|고객)\)\s*$/u, "").trim();
}

function isCardCopySubTask(sub: SubTask) {
  const clean = stripRoleSuffix(sub.title);
  return /카드\s*사본/.test(clean);
}

function extractS3KeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const pathKey = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    return pathKey || null;
  } catch {
    return null;
  }
}

function normalizeKey(k: string) {
  return (k || "").replace(/^\/+/, "").trim();
}

// ✅ 배치 presign
async function fetchViewUrlMap(keys: string[]) {
  const uniq = Array.from(new Set(keys.map(normalizeKey).filter(Boolean)));
  if (uniq.length === 0) return { map: {} as Record<string, string> };

  const r = await fetch("/api/uploads/view-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys: uniq }),
    cache: "no-store",
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.ok) return { map: {} as Record<string, string> };
  return { map: (d.map || {}) as Record<string, string> };
}

export default function AdminStepDetailPage() {
  const { id, order } = useParams<{ id: string; order: string }>();
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flowId") || undefined;

  const [flow, setFlow] = useState<Flow | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [adminName, setAdminName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [itinerary, setItinerary] = useState<ItineraryDoc | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);

  const [viewUrlMap, setViewUrlMap] = useState<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const s = await fetch("/api/auth/admin/me", { cache: "no-store" });
      const sd = await s.json().catch(() => null);
      if (!sd?.ok) {
        location.href = "/admin/login";
        return;
      }
      setAdminName(sd.user?.name || "관리자");
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, order, flowId]);

  async function reload() {
    if (!flowId) return;
    const r = await fetch(`/api/onboarding/get?flowId=${encodeURIComponent(flowId)}`, { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r?.ok || !d?.ok || !d.flow) return;

    const f = d.flow as Flow;
    const target = (f.steps || []).find((s: Step) => s.order === Number(order));
    setFlow(f);
    setStep(target || null);
  }

  useEffect(() => {
    async function fetchItinerary(itineraryId: string) {
      try {
        setItineraryLoading(true);
        setItinerary(null);

        const res = await fetch(`/api/admin/itineraries/${encodeURIComponent(itineraryId)}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok || !data.itinerary) return;

        const it = data.itinerary as ItineraryDoc;
        setItinerary({
          ...it,
          _id: String(it._id),
          createdAt:
            typeof it.createdAt === "string"
              ? it.createdAt
              : it.createdAt
              ? new Date(it.createdAt).toISOString()
              : undefined,
        });
      } finally {
        setItineraryLoading(false);
      }
    }

    if (flow?.itineraryId) fetchItinerary(flow.itineraryId);
    else {
      setItinerary(null);
      setItineraryLoading(false);
    }
  }, [flow?.itineraryId]);

  const departISO = useMemo(() => {
    if (!flow?.departDate) return "";
    const d = new Date(flow.departDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [flow?.departDate]);

  const customerName = flow?.customerName || "";
  const destination = flow?.destination || "";

  const isVisaStep = useMemo(() => !!step && (step.order === 8 || /visa/i.test(step.title) || /비자/.test(step.title)), [step]);
  const isPaymentStep = useMemo(() => step?.kind === "PAYMENT_PIPELINE", [step]);
  const isItineraryStep = useMemo(() => !!step && step.kind === "ADMIN_UPLOAD_VIEW" && /일정표/.test(step.title), [step]);

  const { images } = useMemo(() => {
    const acc: { images: FileRef[] } = { images: [] };
    if (!step) return acc;
    if (isPaymentStep) return acc;

    const collect = (arr?: FileRef[]) => (arr || []).forEach((f) => isImage(f.url) && acc.images.push(f));

    if (step.kind === "CLIENT_UPLOAD_REVIEW") {
      collect(step.filesCustomer);
      collect(step.filesAdmin);
    } else if (step.kind === "ADMIN_UPLOAD_VIEW") {
      collect(step.filesAdmin);
    }
    return acc;
  }, [step, isPaymentStep]);

  const canUploadGeneric =
    !isPaymentStep && !!step && (step.kind === "ADMIN_UPLOAD_VIEW" || step.kind === "CLIENT_UPLOAD_REVIEW");

  const sharedCardCopyFiles: FileRef[] = useMemo(() => {
    if (!flow?.steps) return [];
    const files: FileRef[] = [];
    const keySet = new Set<string>();

    for (const st of flow.steps) {
      for (const sub of st.subtasks || []) {
        if (!isCardCopySubTask(sub)) continue;
        for (const f of sub.files || []) {
          const k = `${f.name}::${f.url}`;
          if (!keySet.has(k)) {
            keySet.add(k);
            files.push(f);
          }
        }
      }
    }
    return files;
  }, [flow?.steps]);

  const paymentImageFilesForPrefetch = useMemo(() => {
    if (!isPaymentStep || !step?.subtasks) return [] as FileRef[];

    const all: FileRef[] = [];
    for (const sub of step.subtasks || []) {
      const baseFiles = sub.files || [];
      let mergedFiles: FileRef[] = baseFiles;

      if (isCardCopySubTask(sub) && sharedCardCopyFiles.length > 0) {
        const keySet = new Set(baseFiles.map((f) => `${f.name}::${f.url}`));
        const extras: FileRef[] = [];
        for (const f of sharedCardCopyFiles) {
          const k = `${f.name}::${f.url}`;
          if (!keySet.has(k)) {
            keySet.add(k);
            extras.push(f);
          }
        }
        mergedFiles = [...baseFiles, ...extras];
      }

      for (const f of mergedFiles) {
        if (isImage(f.url)) all.push(f);
      }
    }
    return all;
  }, [isPaymentStep, step?.subtasks, sharedCardCopyFiles]);

  async function ensureViewUrlsFor(files: FileRef[]) {
    const keys = files
      .filter((f) => isImage(f.url))
      .map((f) => normalizeKey(f.s3Key || extractS3KeyFromUrl(f.url) || ""))
      .filter(Boolean);

    const todo = Array.from(new Set(keys)).filter((k) => !viewUrlMap[k] && !inFlight.current.has(k));
    if (todo.length === 0) return;

    todo.forEach((k) => inFlight.current.add(k));
    try {
      const { map } = await fetchViewUrlMap(todo);
      setViewUrlMap((prev) => ({ ...prev, ...map }));
    } finally {
      todo.forEach((k) => inFlight.current.delete(k));
    }
  }

  useEffect(() => {
    ensureViewUrlsFor(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.map((f) => `${f.s3Key || ""}::${f.url}`).join("|")]);

  useEffect(() => {
    if (!isPaymentStep) return;
    ensureViewUrlsFor(paymentImageFilesForPrefetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentStep, paymentImageFilesForPrefetch.map((f) => `${f.s3Key || ""}::${f.url}`).join("|")]);

  function getDisplayUrl(f: FileRef) {
    const key = normalizeKey(f.s3Key || extractS3KeyFromUrl(f.url) || "");
    if (key && viewUrlMap[key]) return viewUrlMap[key];
    return ""; // ✅ img에 원본 url 넣지 않음
  }

  async function openFile(f: FileRef) {
    const key = normalizeKey(f.s3Key || extractS3KeyFromUrl(f.url) || "");
    if (key && viewUrlMap[key]) {
      window.open(viewUrlMap[key], "_blank", "noopener,noreferrer");
      return;
    }
    if (key) {
      const { map } = await fetchViewUrlMap([key]);
      if (map[key]) {
        setViewUrlMap((prev) => ({ ...prev, [key]: map[key] }));
        window.open(map[key], "_blank", "noopener,noreferrer");
        return;
      }
    }
    window.open(f.url, "_blank", "noopener,noreferrer");
  }

  if (!flowId) {
    return (
      <div className="wrap" style={{ padding: 24 }}>
        <p>잘못된 접근입니다. (flowId가 없습니다)</p>
        <p style={{ marginTop: 8 }}>고객 체크리스트 목록에서 다시 진입해 주세요.</p>
      </div>
    );
  }

  if (!step) return <div style={{ padding: 20 }}>불러오는 중…</div>;

  const qs = new URLSearchParams();
  if (id) qs.set("customerId", String(id));
  if (flowId) qs.set("flowId", flowId);
  const selectHref = `/admin/itineraries/select?${qs.toString()}`;

  async function presignAndUpload(file: File, extra: { order: number; actor: "admin" | "customer"; subKey?: string }) {
    if (file.size > MAX_BYTES) {
      alert("60MB 이하만 업로드 가능합니다.");
      return null;
    }

    const presign = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        fileSize: file.size,
        contentType: file.type,
        customerId: id,
        order: extra.order,
        actor: extra.actor,
        flowId,
        ...(extra.subKey ? { subKey: extra.subKey } : {}),
      }),
    });

    const ps = await presign.json().catch(() => null);
    if (!presign.ok || !ps?.ok) {
      alert(ps?.error || "업로드 URL 발급 실패");
      return null;
    }

    await fetch(ps.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

    const url = new URL(ps.uploadUrl);
    const publicUrl = `${url.origin}${url.pathname}`;

    return { publicUrl, s3Key: ps.object?.key as string | undefined };
  }

  async function doUploadGeneric(file: File) {
    setBusy(true);
    try {
      const uploaded = await presignAndUpload(file, { order: step!.order, actor: "admin" });
      if (!uploaded) return;

      const rr = await fetch("/api/onboarding/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: id,
          order: step!.order,
          actor: "admin",
          flowId,
          file: { name: file.name, url: uploaded.publicUrl, s3Key: uploaded.s3Key, uploadedBy: "admin", uploadedByName: adminName },
        }),
      });

      const d = await rr.json().catch(() => null);
      if (!rr.ok || !d?.ok) {
        alert(d?.error || "저장 실패");
        return;
      }

      // ✅ 업로드 직후 1개 presign
      if (uploaded.s3Key) {
        const k = normalizeKey(uploaded.s3Key);
        const { map } = await fetchViewUrlMap([k]);
        if (map[k]) setViewUrlMap((prev) => ({ ...prev, [k]: map[k] }));
      }

      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeGeneric(file: FileRef) {
    if (!confirm("삭제할까요?")) return;

    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id, order: step!.order, actor: "admin", flowId, fileUrl: file.url, fileKey: file.s3Key }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "삭제 실패");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function doUploadForSub(sub: SubTask, file: File) {
    if (sub.role !== "admin") {
      alert("이 서브태스크는 고객 업로드용입니다.");
      return;
    }

    setBusy(true);
    try {
      const uploaded = await presignAndUpload(file, { order: step!.order, actor: "admin", subKey: sub.key });
      if (!uploaded) return;

      const rr = await fetch("/api/onboarding/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: id,
          order: step!.order,
          actor: "admin",
          flowId,
          subKey: sub.key,
          file: { name: file.name, url: uploaded.publicUrl, s3Key: uploaded.s3Key, uploadedBy: "admin", uploadedByName: adminName },
        }),
      });

      const d = await rr.json().catch(() => null);
      if (!rr.ok || !d?.ok) {
        alert(d?.error || "저장 실패");
        return;
      }

      if (uploaded.s3Key) {
        const k = normalizeKey(uploaded.s3Key);
        const { map } = await fetchViewUrlMap([k]);
        if (map[k]) setViewUrlMap((prev) => ({ ...prev, [k]: map[k] }));
      }

      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeForSub(sub: SubTask, file: FileRef) {
    if (!confirm("삭제할까요?")) return;

    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: id,
          order: step!.order,
          actor: "admin",
          flowId,
          subKey: sub.key,
          fileUrl: file.url,
          fileKey: file.s3Key,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "삭제 실패");
        return;
      }
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function detachItinerary() {
    if (!flowId) {
      alert("flowId가 없습니다. 체크리스트 화면에서 다시 진입해 주세요.");
      return;
    }
    if (!flow?.itineraryId) {
      alert("현재 연결된 여행 일정표가 없습니다.");
      return;
    }
    if (!confirm("현재 연결된 여행 일정표 연결을 해제할까요?")) return;

    try {
      setBusy(true);
      const res = await fetch(`/api/admin/onboarding/${encodeURIComponent(flowId)}/itinerary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itineraryId: null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.message || "여행 일정표 연결을 해제하는 중 오류가 발생했습니다.");
        return;
      }
      setItinerary(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const createdAtString = itinerary?.createdAt && typeof itinerary.createdAt === "string" ? itinerary.createdAt : "";
  const days: DayPlan[] = Array.isArray(itinerary?.days) ? (itinerary!.days as DayPlan[]) : [];
  const paymentSectionTitle = isPaymentStep ? `💳 ${stripRoleSuffix(step.title)}` : "";

  return (
    <div className="wrap">
      <header className="head">
        <button className="btn line" onClick={() => history.back()}>
          ← 뒤로
        </button>

        <div className="title" style={{ textAlign: "center" }}>
          <div className="sub">
            {customerName ? `${customerName} 체크리스트 · ${destination || ""} · 출발일 ${departISO}` : `체크리스트 · 출발일 ${departISO}`}
          </div>
          <h1>
            <span className="ico">{step.icon || "•"}</span> {step.order}. {step.title}
          </h1>
        </div>

        <span style={{ width: 60 }} />
      </header>

      {isItineraryStep && (
        <section className="sec">
          <div className="sec-title">
            <span>🗓️ 여행 일정표</span>
          </div>

          {!flow?.itineraryId ? (
            <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 16, border: "1px dashed #e5e7eb", background: "#f9fafb" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>아직 이 체크리스트에 연결된 여행 일정표가 없습니다.</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>기존에 만들어 둔 여행 일정표를 선택해 연결해 주세요.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={selectHref} className="btn black">
                  기존 일정표 불러오기
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 16, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>이 체크리스트에 여행 일정표가 연결되어 있습니다.</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>아래에서 일차별 일정과 포함/불포함 내역을 확인할 수 있습니다.</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn outline-black" onClick={detachItinerary} disabled={busy}>
                    일정표 연결 해제
                  </button>
                  <Link href={selectHref} className="btn line">
                    다른 일정표로 변경
                  </Link>
                </div>
              </div>

              {itineraryLoading && <div style={{ padding: "10px 0", fontSize: 13, color: "#6b7280" }}>여행 일정표를 불러오는 중입니다…</div>}
              {!itineraryLoading && !itinerary && <div style={{ padding: "10px 0", fontSize: 13, color: "#ef4444" }}>일정표 정보를 불러오지 못했습니다. 다시 시도해 주세요.</div>}

              {/* (일정표 상세 JSX는 원본 그대로 유지 가능) */}
              {!itineraryLoading && itinerary && (
                <div style={{ marginTop: 8 }}>
                  {/* ... 원본 일정표 JSX 그대로 ... */}
                  <section className="it-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>여행 일정표</div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{itinerary.title}</h2>
                      </div>
                    </div>

                    {itinerary.description && <p style={{ marginTop: 8, fontSize: 14, color: "#4b5563", whiteSpace: "pre-line" }}>{itinerary.description}</p>}

                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px 16px", fontSize: 13 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "#6b7280", minWidth: 70 }}>여행 국가</span>
                        <span style={{ fontWeight: 500 }}>{itinerary.country || "-"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "#6b7280", minWidth: 70 }}>여행 도시</span>
                        <span style={{ fontWeight: 500 }}>{itinerary.city || "-"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "#6b7280", minWidth: 70 }}>생성 방식</span>
                        <span style={{ fontWeight: 500 }}>{itinerary.mode === "PNR" ? "PNR 자동" : "수동 생성"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "#6b7280", minWidth: 70 }}>생성일</span>
                        <span style={{ fontWeight: 500 }}>
                          {createdAtString ? new Date(createdAtString).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "-"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "#6b7280", minWidth: 70 }}>상품담당자</span>
                        <span style={{ fontWeight: 500 }}>{itinerary.managerName || "-"}</span>
                      </div>
                    </div>
                  </section>

                  <section className="it-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 15 }}>일차별 일정</h3>
                    </div>

                    {!days.length && <p className="days-empty">등록된 일차별 일정이 없습니다.</p>}
                    {!!days.length && (
                      <div className="it-detail-days-readonly">
                        <div className="days-table-header">
                          <span>일차</span>
                          <span>날짜</span>
                          <span>시간</span>
                          <span>일정</span>
                          <span>식사</span>
                        </div>

                        {days.map((d) => {
                          const schedules = Array.isArray(d.schedules) && d.schedules.length > 0 ? d.schedules : [{ time: "", text: `${d.day}일차 일정` }];
                          return (
                            <div key={d.day} className="day-block-row">
                              <div className="day-row-flex">
                                <div className="day-col">
                                  <div className="day-main">{d.day}일차</div>
                                </div>
                                <div className="day-col">
                                  <div className="it-ro-input it-ro-input-full">{d.date || ""}</div>
                                </div>
                                <div className="time-col">
                                  {schedules.map((s, idx) => (
                                    <div key={`${d.day}-${idx}-time`} className="it-ro-input">
                                      {s.time || ""}
                                    </div>
                                  ))}
                                </div>
                                <div className="schedule-col">
                                  {schedules.map((s, idx) => (
                                    <div key={`${d.day}-${idx}-text`} className="it-ro-schedule-line">
                                      <div className="it-ro-input it-ro-input-full">{s.text || ""}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="meal-col">
                                  <div className="meal-row">
                                    <span className="meal-label">조식</span>
                                    <div className="it-ro-input-meal">{d.breakfast || "-"}</div>
                                  </div>
                                  <div className="meal-row">
                                    <span className="meal-label">중식</span>
                                    <div className="it-ro-input-meal">{d.lunch || "-"}</div>
                                  </div>
                                  <div className="meal-row">
                                    <span className="meal-label">석식</span>
                                    <div className="it-ro-input-meal">{d.dinner || "-"}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="notice">상기 일정은 항공 시간 및 현지 사정에 따라 일자의 순서 및 내용이 변경될 수 있습니다.</p>
                  </section>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {isVisaStep && <VisaNotice />}

      {canUploadGeneric && (
        <section className="sec">
          <div className="sec-title">
            <span>{isVisaStep ? "📷 VISA 증빙 이미지" : `📎 첨부 파일 (${step.title})`}</span>
            <span className="chip-count">{images.length}장</span>

            <div className="sec-actions">
              <label className="btn black upbtn">
                파일 첨부
                <input
                  type="file"
                  accept={IMG_ACCEPT.join(",")}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) doUploadGeneric(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={busy}
                />
              </label>
            </div>
          </div>

          {images.length === 0 ? (
            <div className="empty">첨부된 이미지가 없습니다.</div>
          ) : (
            <div className="gallery-grid">
              {images.map((f, i) => {
                const displayUrl = getDisplayUrl(f);
                return (
                  <div key={i} className="gallery-card">
                    {displayUrl ? (
                      <img className="gallery-thumb" src={displayUrl} alt={f.name} />
                    ) : (
                      <div className="gallery-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8", background: "#f8fafc" }}>
                        미리보기 준비중…
                      </div>
                    )}

                    <div className="gallery-meta">
                      <span className="gallery-name">{f.name}</span>
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
      )}

      {isPaymentStep && (
        <section className="sec">
          <div className="sec-title">
            <span>{paymentSectionTitle}</span>
          </div>

          <div className="subs" style={{ marginTop: 6 }}>
            {(step.subtasks || []).map((sub) => {
              const baseFiles = sub.files || [];
              let mergedFiles: FileRef[] = baseFiles;

              if (isCardCopySubTask(sub) && sharedCardCopyFiles.length > 0) {
                const keySet = new Set(baseFiles.map((f) => `${f.name}::${f.url}`));
                const extras: FileRef[] = [];
                for (const f of sharedCardCopyFiles) {
                  const k = `${f.name}::${f.url}`;
                  if (!keySet.has(k)) {
                    keySet.add(k);
                    extras.push(f);
                  }
                }
                mergedFiles = [...baseFiles, ...extras];
              }

              const imageFiles = mergedFiles.filter((f) => isImage(f.url));
              const roleLabel = sub.role === "admin" ? "관리자" : "고객";

              return (
                <div key={sub.key} className="pay-block">
                  <div className="pay-preview-row">
                    {imageFiles.length === 0 ? (
                      <span className="pay-preview-empty">첨부된 이미지가 없습니다.</span>
                    ) : (
                      imageFiles.map((f, i) => {
                        const displayUrl = getDisplayUrl(f);
                        return (
                          <div key={i} className="pay-preview-card">
                            {displayUrl ? (
                              <img className="pay-preview-img" src={displayUrl} alt={f.name} />
                            ) : (
                              <div className="pay-preview-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8" }}>
                                미리보기 준비중…
                              </div>
                            )}
                            <div className="pay-preview-meta">
                              <div className="pay-preview-name">{f.name}</div>
                              <div className="pay-preview-bottom">
                                <span className="pay-preview-uploader">{f.uploadedBy === "admin" ? (f.uploadedByName ? `관리자 ${f.uploadedByName}` : "관리자") : "고객"}</span>
                                <div>
                                  <button type="button" className="pay-preview-link" onClick={() => openFile(f)}>
                                    열기
                                  </button>
                                  <button className="pay-preview-del" onClick={() => removeForSub(sub, f)}>
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="subrow">
                    <div className="sub-left" style={{ gap: 10 }}>
                      <span className="dot" />
                      <span className="sub-ttl">{sub.title}</span>
                      <span style={{ marginLeft: 6, fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", color: "#374151", background: "#fff" }}>
                        {roleLabel}
                      </span>
                    </div>

                    <div className="sub-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {sub.role === "admin" ? (
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
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>고객이 업로드하는 항목입니다.</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <style jsx global>{`
        .pay-block {
          margin-bottom: 18px;
        }
        .pay-preview-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
        }
        .pay-preview-card {
          width: 160px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 6px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pay-preview-img {
          width: 146px;
          height: 146px;
          object-fit: contain;
          border-radius: 8px;
          background: #f9fafb;
        }
        .pay-preview-meta {
          width: 100%;
          margin-top: 6px;
        }
        .pay-preview-name {
          font-size: 12px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pay-preview-bottom {
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
        }
        .pay-preview-uploader {
          color: #6b7280;
        }
        .pay-preview-link {
          color: #2563eb;
          text-decoration: none;
          margin-right: 4px;
          background: transparent;
          border: 0;
          cursor: pointer;
        }
        .pay-preview-del {
          border: none;
          background: transparent;
          color: #b91c1c;
          cursor: pointer;
        }
        .pay-preview-empty {
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
