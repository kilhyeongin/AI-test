// src/app/land/itineraries/[id]/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type CommonKey = "includes" | "excludes" | "visa" | "remark";

type CommonSection = {
  key: CommonKey;
  title: string;
  html: string;
  fixed: true;
};

type OptionalSection = {
  id: string;
  title: string;
  html: string;
};

type LandScheduleRow = {
  id: string;
  time: string;
  text: string;
};

type LandDayPlanV2 = {
  day: number;
  region: string;
  transport: string;
  rows: LandScheduleRow[];

  breakfast: string;
  lunch: string;
  dinner: string;

  hotelKr: string;
  hotelEn: string;
  hotelGrade: string;
  hotelAddress: string;
};

/** 레거시 dayPlans (예전 구조) */
type LegacySchedule = { time?: string; description?: string };
type LegacyDayPlan = {
  dayNumber?: number;
  date?: string;
  schedules?: LegacySchedule[];

  hotelName?: string;
  hotelAddress?: string;
  hotelWebsite?: string;

  breakfast?: string;
  lunch?: string;
  dinner?: string;
};

type SectionsHtml = {
  key: string;
  title: string;
  enabled?: boolean;
  html?: string;
};

type LandItineraryDoc = {
  _id: string;
  tripTitle: string;
  destination?: string;
  duration?: string;
  summary?: string;

  // ✅ DB 필드
  sectionsHtml?: SectionsHtml[];
  dayPlansV2?: LandDayPlanV2[];

  // 레거시
  dayPlans?: LegacyDayPlan[];

  createdAt?: string;
  updatedAt?: string;
};

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}. ${mm}. ${dd}.`;
}

const COMMON_KEYS: CommonKey[] = ["includes", "excludes", "visa", "remark"];

export default function LandItineraryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<LandItineraryDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/land/itineraries/${id}`, { cache: "no-store" });
        const d = await r.json();
        // ✅ GET 응답은 { ok:true, itinerary: doc }
        if (d?.ok) setDoc(d.itinerary);
        else alert(d?.error ?? "불러오기 실패");
      } catch (e) {
        console.error(e);
        alert("불러오기 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const createdAt = useMemo(() => fmtDate(doc?.createdAt), [doc?.createdAt]);
  const updatedAt = useMemo(() => fmtDate(doc?.updatedAt), [doc?.updatedAt]);

  /** ✅ sectionsHtml → (공통/선택)으로 복원 */
  const { commonSections, optionalSections } = useMemo(() => {
    const src = Array.isArray(doc?.sectionsHtml) ? doc!.sectionsHtml! : [];

    const common: CommonSection[] = [];
    const optional: OptionalSection[] = [];

    for (const s of src) {
      const key = String(s.key ?? "");
      const title = String(s.title ?? "");
      const html = String(s.html ?? "");

      if (COMMON_KEYS.includes(key as CommonKey)) {
        common.push({ key: key as CommonKey, title, html, fixed: true });
      } else if (key.startsWith("opt_")) {
        optional.push({ id: key.replace(/^opt_/, ""), title, html });
      } else {
        optional.push({
          id: key || title || Math.random().toString(16).slice(2),
          title,
          html,
        });
      }
    }

    // ✅ 공통 섹션 4개는 항상 보이게 (없으면 빈값)
    const titleMap: Record<CommonKey, string> = {
      includes: "포함사항",
      excludes: "불포함사항",
      visa: "비자 관련 사항",
      remark: "비고",
    };

    const filledCommon: CommonSection[] = COMMON_KEYS.map((k) => {
      const found = common.find((x) => x.key === k);
      return found ?? { key: k, title: titleMap[k], html: "", fixed: true };
    });

    return { commonSections: filledCommon, optionalSections: optional };
  }, [doc]);

  /** ✅ 표시용 dayPlans: V2 우선, 없으면 레거시 폴백 */
  const viewDays: LandDayPlanV2[] = useMemo(() => {
    if (doc?.dayPlansV2 && doc.dayPlansV2.length) return doc.dayPlansV2;

    const legacy = Array.isArray(doc?.dayPlans) ? doc!.dayPlans! : [];
    if (!legacy.length) return [];

    return legacy.map((d, idx) => {
      const dayNo = d.dayNumber ?? idx + 1;
      const rows: LandScheduleRow[] = (d.schedules ?? []).map((s, i) => ({
        id: `${dayNo}_${i}`,
        time: String(s.time ?? ""),
        text: String(s.description ?? ""),
      }));

      return {
        day: dayNo,
        region: d.date ? String(d.date) : "",
        transport: "",
        rows,
        breakfast: String(d.breakfast ?? ""),
        lunch: String(d.lunch ?? ""),
        dinner: String(d.dinner ?? ""),
        hotelKr: String(d.hotelName ?? ""),
        hotelEn: "",
        hotelGrade: "",
        hotelAddress: String(d.hotelAddress ?? ""),
      };
    });
  }, [doc]);

  if (loading) {
    return (
      <div className="wrap">
        <div className="hero">
          <div className="hero-main">여행일정 상세</div>
          <div className="hero-sub">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="wrap">
        <div className="hero">
          <div className="hero-main">여행일정 상세</div>
          <div className="hero-sub">데이터가 없습니다.</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn outline-black" onClick={() => router.back()}>
            뒤로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="head" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
            여행일정 상세 - {doc.tripTitle || "제목 없음"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn outline-black" href="/land/itineraries">
            목록으로
          </Link>
          <Link className="btn black" href={`/land/itineraries/${doc._id}/edit`}>
            일정 내용 수정
          </Link>
        </div>
      </div>

      {/* 기본 정보 카드 */}
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <b>여행지:</b> {doc.destination || "-"}
          </div>
          <div>
            <b>기간:</b> {doc.duration || "-"}
          </div>
          <div>
            <b>소개:</b> {doc.summary || "-"}
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            생성일: {createdAt} · 최종 수정: {updatedAt}
          </div>
        </div>
      </div>

      {/* ✅ 1) 공통 섹션 */}
      <div className="section-title">공통 섹션</div>
      <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
        {commonSections.map((s) => (
          <div key={s.key} className="html-card">
            <div className="html-head">{s.title}</div>
            <div className="html-body" dangerouslySetInnerHTML={{ __html: s.html || "<p>-</p>" }} />
          </div>
        ))}
      </div>

      {/* ✅ 2) 선택 섹션 */}
      {optionalSections.length ? (
        <>
          <div style={{ height: 22 }} />
          <div className="section-title">선택 섹션</div>
          <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
            {optionalSections.map((s) => (
              <div key={s.id} className="html-card">
                <div className="html-head">{s.title || "선택 섹션"}</div>
                <div className="html-body" dangerouslySetInnerHTML={{ __html: s.html || "<p>-</p>" }} />
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div style={{ height: 22 }} />

      {/* ✅ 3) 일차별 일정 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>일차별 일정</div>
      </div>

      {viewDays.length === 0 ? (
        <div className="card" style={{ padding: 14, color: "#64748b" }}>
          등록된 일차별 일정이 없습니다.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {viewDays.map((d) => (
            <div key={d.day} className="day-card">
              <div className="day-head">
                <div className="day-title">{d.day}일차</div>
                <div className="day-meta">
                  <span>
                    <b>지역</b> {d.region || "-"}
                  </span>
                  <span className="dot">·</span>
                  <span>
                    <b>교통</b> {d.transport || "-"}
                  </span>
                </div>
              </div>

              <div className="day-schedule">
                {!d.rows || d.rows.length === 0 ? (
                  <div className="empty">등록된 일정(시간/내용)이 없습니다.</div>
                ) : (
                  <div className="rows">
                    {d.rows
                      .filter((r) => (r.time || "").trim() || (r.text || "").trim())
                      .map((r) => (
                        <div key={r.id} className="row">
                          <div className="time">{r.time || "-"}</div>
                          <div className="text">{r.text || "-"}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="day-bottom">
                <div className="box">
                  <div className="box-title">호텔</div>
                  <div className="kv">
                    <span className="k">이름</span>
                    <span className="v">{d.hotelKr || "-"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">영문</span>
                    <span className="v">{d.hotelEn || "-"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">성급</span>
                    <span className="v">{d.hotelGrade || "-"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">주소</span>
                    <span className="v">{d.hotelAddress || "-"}</span>
                  </div>
                </div>

                <div className="box">
                  <div className="box-title">식사</div>
                  <div className="kv">
                    <span className="k">조식</span>
                    <span className="v">{d.breakfast || "-"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">중식</span>
                    <span className="v">{d.lunch || "-"}</span>
                  </div>
                  <div className="kv">
                    <span className="k">석식</span>
                    <span className="v">{d.dinner || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        .day-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #fff;
          overflow: hidden;
        }

        .day-head {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          background: #fbfdff;
          display: grid;
          gap: 6px;
        }

        .day-title {
          font-weight: 900;
          font-size: 15px;
          color: #0f172a;
        }

        .day-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #334155;
          font-size: 13px;
          flex-wrap: wrap;
        }

        .dot {
          color: #94a3b8;
        }

        .day-schedule {
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .empty {
          color: #64748b;
          font-size: 13px;
        }

        .rows {
          display: grid;
          gap: 10px;
        }

        .row {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 12px;
          align-items: start;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fff;
        }

        .time {
          font-weight: 900;
          color: #111827;
          font-size: 13px;
          white-space: nowrap;
        }

        .text {
          color: #0f172a;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .day-bottom {
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .box {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px;
          background: #fff;
        }

        .box-title {
          font-weight: 900;
          font-size: 12px;
          color: #475569;
          margin-bottom: 8px;
        }

        .kv {
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 10px;
          font-size: 13px;
          padding: 4px 0;
        }

        .k {
          color: #64748b;
          font-weight: 800;
        }
        .v {
          color: #0f172a;
        }

        .html-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #fff;
          overflow: hidden;
        }

        .html-head {
          padding: 12px 14px;
          border-bottom: 1px solid #eef2f7;
          background: #fbfdff;
          font-weight: 900;
        }

        .html-body {
          padding: 14px;
          color: #0f172a;
        }

        .html-body :global(p) {
          margin: 0 0 10px;
        }
        .html-body :global(ul) {
          margin: 0 0 10px 18px;
        }
        .html-body :global(ol) {
          margin: 0 0 10px 18px;
        }

        @media (max-width: 900px) {
          .row {
            grid-template-columns: 84px 1fr;
          }
          .day-bottom {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
