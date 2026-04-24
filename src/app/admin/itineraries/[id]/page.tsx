// src/app/admin/itineraries/[id]/page.tsx
import "@/app/(styles)/checklist-layout.css";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Itinerary from "@/models/Itinerary";
import type { DayPlan } from "@/models/Itinerary";

type Props = {
  params: Promise<{ id: string }>;
};

type CommonKey = "includes" | "excludes" | "visa" | "remark";

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

  commonSections?: Array<{ key: CommonKey; title: string; html: string; fixed?: boolean }>;
  optionalSections?: Array<{ id: string; title: string; html: string }>;

  days?: DayPlan[];
  createdAt?: Date | string;
};

export default async function AdminItineraryDetailPage(props: Props) {
  const { id } = await props.params;

  await connectDB();

  const doc = (await Itinerary.findById(id).lean()) as ItineraryDoc | null;

  if (!doc) {
    return (
      <div className="page">
        <div className="wrap">
          <section className="it-card">
            <p>해당 ID의 일정표를 찾을 수 없습니다.</p>
            <Link href="/admin/itineraries" className="btn white">
              ← 리스트로 돌아가기
            </Link>
          </section>
        </div>
      </div>
    );
  }

  const createdAtString =
    typeof doc.createdAt === "string"
      ? doc.createdAt
      : doc.createdAt
      ? doc.createdAt.toISOString()
      : "";

  const days = Array.isArray(doc.days) ? doc.days : [];
  const commonSections = Array.isArray(doc.commonSections) ? doc.commonSections : [];
  const optionalSections = Array.isArray(doc.optionalSections) ? doc.optionalSections : [];

  return (
    <div className="page">
      <div className="wrap itinerary-wrap">
        <section
          className="it-card"
          style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
        >
          <Link href="/admin/itineraries" className="btn white">
            ← 리스트로 돌아가기
          </Link>
          <Link href={`/admin/itineraries/${doc._id}/edit`} className="btn black">
            수정하기
          </Link>
        </section>

        <section className="it-card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                여행 일정표 상세
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{doc.title}</h1>
            </div>
          </div>

          {doc.description && (
            <p style={{ marginTop: 8, fontSize: 14, color: "#4b5563" }}>{doc.description}</p>
          )}

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px 16px",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#6b7280", minWidth: 70 }}>여행 국가</span>
              <span style={{ fontWeight: 500 }}>{doc.country || "-"}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#6b7280", minWidth: 70 }}>여행 도시</span>
              <span style={{ fontWeight: 500 }}>{doc.city || "-"}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#6b7280", minWidth: 70 }}>생성 방식</span>
              <span style={{ fontWeight: 500 }}>
                {doc.mode === "PNR" ? "PNR 자동" : "수동 생성"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#6b7280", minWidth: 70 }}>생성일</span>
              <span style={{ fontWeight: 500 }}>
                {createdAtString
                  ? new Date(createdAtString).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : "-"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#6b7280", minWidth: 70 }}>상품담당자</span>
              <span style={{ fontWeight: 500 }}>{doc.managerName || "-"}</span>
            </div>
          </div>
        </section>

        {/* ✅ 공통/선택 섹션 */}
        {(commonSections.length > 0 || optionalSections.length > 0) && (
          <section className="it-card">
            {commonSections.length > 0 && (
              <>
                <h3 style={{ margin: 0, fontSize: 15, marginBottom: 10 }}>공통 섹션</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  {commonSections.map((s) => (
                    <div key={s.key} className="it-html-card">
                      <div className="it-html-head">{s.title}</div>
                      <div
                        className="it-html-body"
                        dangerouslySetInnerHTML={{ __html: s.html || "<p>-</p>" }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {optionalSections.length > 0 && (
              <>
                <div style={{ height: 16 }} />
                <h3 style={{ margin: 0, fontSize: 15, marginBottom: 10 }}>선택 섹션</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  {optionalSections.map((s) => (
                    <div key={s.id} className="it-html-card">
                      <div className="it-html-head">{s.title}</div>
                      <div
                        className="it-html-body"
                        dangerouslySetInnerHTML={{ __html: s.html || "<p>-</p>" }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* 기존 텍스트(하위호환) */}
        <section className="it-card">
          <div style={{ marginBottom: 14 }}>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>✅</span>
              <span>포함 사항</span>
            </h3>
            <p className="multiline" style={{ fontSize: 13, color: "#374151" }}>
              {doc.includeText || "-"}
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>❌</span>
              <span>불포함 사항</span>
            </h3>
            <p className="multiline" style={{ fontSize: 13, color: "#374151" }}>
              {doc.excludeText || "-"}
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>👤</span>
              <span>입출국자</span>
            </h3>
            <p className="multiline" style={{ fontSize: 13, color: "#374151" }}>
              {doc.travelerText || "-"}
            </p>
          </div>

          <div>
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🛍️</span>
              <span>쇼핑센터</span>
            </h3>
            <p className="multiline" style={{ fontSize: 13, color: "#374151" }}>
              {doc.shoppingText || "-"}
            </p>
          </div>
        </section>

        {/* 일차별 일정 */}
        <section className="it-card">
          <h3 style={{ margin: 0, fontSize: 15, marginBottom: 10 }}>일차별 일정</h3>

          {!days.length && <p className="days-empty">등록된 일차별 일정이 없습니다.</p>}

          {!!days.length && (
            <div className="it-detail-days-readonly">
              <div className="days-table-header">
                <span>일차</span>
                <span>지역</span>
                <span>교통</span>
                <span>시간</span>
                <span>일정</span>
                <span>식사</span>
              </div>

              {days.map((d) => {
                const schedules =
                  Array.isArray(d.schedules) && d.schedules.length
                    ? d.schedules
                    : [{ time: "", text: `${d.day}일차 일정` }];

                return (
                  <div key={d.day} className="day-block-row">
                    <div className="day-row-flex it-days-6col">
                      <div className="day-col">
                        <div className="day-main">{d.day}일차</div>
                      </div>

                      <div className="day-col">
                        <div className="it-ro-input it-ro-input-full">{(d as any).region || "-"}</div>
                      </div>

                      <div className="day-col">
                        <div className="it-ro-input it-ro-input-full">{(d as any).transport || "-"}</div>
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

                    {(d.hotelKr ||
                      d.hotelEn ||
                      d.hotelGrade ||
                      d.hotelAddress ||
                      (d as any).hotelHomepage) && (
                      <div className="hotel-row">
                        <div className="hotel-label">호텔</div>
                        <div className="hotel-fields">
                          <div className="it-ro-input">한글명: {d.hotelKr}</div>
                          <div className="it-ro-input">영문명: {d.hotelEn}</div>
                          <div className="it-ro-input">성급: {d.hotelGrade}</div>
                          <div className="it-ro-input">주소: {d.hotelAddress}</div>
                          <div className="it-ro-input">홈페이지: {(d as any).hotelHomepage}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="notice">
            상기 일정은 항공 시간 및 현지 사정에 따라 일자의 순서 및 내용이 변경될 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
