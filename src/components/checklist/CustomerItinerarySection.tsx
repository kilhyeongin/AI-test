// /src/components/checklist/CustomerItinerarySection.tsx
// 고객 체크리스트 페이지 안에서, 연결된 일정표를 보여주는 섹션 컴포넌트

"use client";

import { useEffect, useState } from "react";

type ScheduleLine = {
  time?: string;
  text?: string;
};

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

type ItineraryData = {
  _id: string;
  title: string;
  description: string;
  country: string;
  city: string;
  includeText: string;
  excludeText: string;
  travelerText: string;
  shoppingText: string;
  managerName: string;
  mode: "PNR" | "MANUAL";

  dayBlocks?: {
    day: number;
    date: string;
    title: string;
    description: string;
    meal?: string;
  }[];

  days?: DayPlan[];

  createdAt?: string | null;
  connectedAt?: string | null;
};

type Props = {
  flowId: string;
};

function fmtKoreanDateTime(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}년 ${m}월 ${dd}일 ${hh}시 ${mi}분`;
}

function fmtDotDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${dd}.`;
}

export function CustomerItinerarySection({ flowId }: Props) {
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItinerary() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/onboarding/${encodeURIComponent(flowId)}/itinerary`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          setError("일정표를 불러오지 못했습니다.");
          return;
        }

        if (!data.ok || !data.hasItinerary) {
          setItinerary(null);
          return;
        }

        const it = data.itinerary as ItineraryData & { days?: any[] };

        setItinerary({
          ...it,
          days: Array.isArray(it.days) ? it.days : [],
        });
      } catch (err) {
        console.error("CustomerItinerarySection fetch error:", err);
        setError("일정표를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    if (flowId) {
      fetchItinerary();
    }
  }, [flowId]);

  if (!flowId) return null;

  const createdLabel = fmtDotDate(itinerary?.createdAt || null);
  const connectedLabel = fmtKoreanDateTime(itinerary?.connectedAt || null);
  const days: DayPlan[] = Array.isArray(itinerary?.days)
    ? (itinerary!.days as DayPlan[])
    : [];

  return (
    <section className="cust-itinerary-box">
      {loading && (
        <div className="ci-card ci-muted">일정표를 불러오는 중입니다...</div>
      )}

      {!loading && error && (
        <div className="ci-card ci-error" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && !itinerary && (
        <div className="ci-card ci-muted" style={{ fontSize: 14 }}>
          담당자가 아직 일정표를 등록하지 않았습니다.
          <br />
          일정표가 등록되면 이곳에서 확인하실 수 있어요.
        </div>
      )}

      {!loading && !error && itinerary && (
        <div className="ci-card">
          {/* 상단 헤더 */}
          <div className="ci-header">
            <div className="ci-header-label">여행 일정표</div>
            <div className="ci-header-title">{itinerary.title}</div>
            {itinerary.description && (
              <div className="ci-header-desc">{itinerary.description}</div>
            )}

            <div className="ci-meta-grid">
              <div className="ci-meta-item">
                <div className="ci-meta-label">여행 국가</div>
                <div className="ci-meta-value">
                  {itinerary.country || "-"}
                </div>
              </div>
              <div className="ci-meta-item">
                <div className="ci-meta-label">여행 도시</div>
                <div className="ci-meta-value">
                  {itinerary.city || "-"}
                </div>
              </div>
              <div className="ci-meta-item">
                <div className="ci-meta-label">생성 방식</div>
                <div className="ci-meta-value">
                  {itinerary.mode === "PNR" ? "PNR 자동" : "수동 작성"}
                </div>
              </div>
              <div className="ci-meta-item">
                <div className="ci-meta-label">생성일</div>
                <div className="ci-meta-value">
                  {createdLabel || "-"}
                </div>
              </div>
              <div className="ci-meta-item">
                <div className="ci-meta-label">상품담당자</div>
                <div className="ci-meta-value">
                  {itinerary.managerName || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* 포함/불포함/인솔자/쇼핑센터 */}
          <div className="ci-section-group">
            <div className="ci-section-row">
              <div className="ci-section-icon ci-green">
                <span role="img" aria-label="포함 사항">
                  ✅
                </span>
              </div>
              <div className="ci-section-body">
                <div className="ci-section-title">포함 사항</div>
                <pre className="ci-section-text">
                  {itinerary.includeText || "내용이 없습니다."}
                </pre>
              </div>
            </div>

            <div className="ci-section-row">
              <div className="ci-section-icon ci-red">
                <span role="img" aria-label="불포함 사항">
                  ❌
                </span>
              </div>
              <div className="ci-section-body">
                <div className="ci-section-title">불포함 사항</div>
                <pre className="ci-section-text">
                  {itinerary.excludeText || "내용이 없습니다."}
                </pre>
              </div>
            </div>

            <div className="ci-section-row">
              <div className="ci-section-icon">
                <span role="img" aria-label="인솔자">
                  👤
                </span>
              </div>
              <div className="ci-section-body">
                <div className="ci-section-title">인솔자</div>
                <pre className="ci-section-text">
                  {itinerary.travelerText || "내용이 없습니다."}
                </pre>
              </div>
            </div>

            <div className="ci-section-row">
              <div className="ci-section-icon">
                <span role="img" aria-label="쇼핑센터">
                  🛍️
                </span>
              </div>
              <div className="ci-section-body">
                <div className="ci-section-title">쇼핑센터</div>
                <pre className="ci-section-text">
                  {itinerary.shoppingText || "내용이 없습니다."}
                </pre>
              </div>
            </div>
          </div>

          {/* 일차별 일정 – 관리자 구조 그대로 */}
          <section className="it-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15 }}>일차별 일정</h3>
            </div>

            {!days.length && (
              <p className="days-empty">등록된 일차별 일정이 없습니다.</p>
            )}

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
                  const schedules =
                    Array.isArray(d.schedules) && d.schedules.length > 0
                      ? d.schedules
                      : [{ time: "", text: `${d.day}일차 일정` }];

                  const hasHotel =
                    d.hotelKr ||
                    d.hotelEn ||
                    d.hotelGrade ||
                    d.hotelAddress ||
                    d.hotelHomepage;

                  return (
                    <div key={d.day} className="day-block-row">
                      <div className="day-row-flex">
                        <div className="day-col">
                          <div className="day-main">{d.day}일차</div>
                        </div>
                        <div className="day-col">
                          <div className="it-ro-input it-ro-input-full">
                            {d.date || ""}
                          </div>
                        </div>

                        <div className="time-col">
                          {schedules.map((s, idx) => (
                            <div
                              key={`${d.day}-${idx}-time`}
                              className="it-ro-input"
                            >
                              {s.time || ""}
                            </div>
                          ))}
                        </div>

                        <div className="schedule-col">
                          {schedules.map((s, idx) => (
                            <div
                              key={`${d.day}-${idx}-text`}
                              className="it-ro-schedule-line"
                            >
                              <div className="it-ro-input it-ro-input-full">
                                {s.text || ""}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="meal-col">
                          <div className="meal-row">
                            <span className="meal-label">조식</span>
                            <div className="it-ro-input-meal">
                              {d.breakfast || "-"}
                            </div>
                          </div>
                          <div className="meal-row">
                            <span className="meal-label">중식</span>
                            <div className="it-ro-input-meal">
                              {d.lunch || "-"}
                            </div>
                          </div>
                          <div className="meal-row">
                            <span className="meal-label">석식</span>
                            <div className="it-ro-input-meal">
                              {d.dinner || "-"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {hasHotel && (
                        <div className="hotel-row">
                          <div className="hotel-label">호텔</div>
                          <div className="hotel-fields">
                            {d.hotelKr && (
                              <div className="it-ro-input">
                                한글명: {d.hotelKr}
                              </div>
                            )}
                            {d.hotelEn && (
                              <div className="it-ro-input">
                                영문명: {d.hotelEn}
                              </div>
                            )}
                            {d.hotelGrade && (
                              <div className="it-ro-input">
                                성급: {d.hotelGrade}
                              </div>
                            )}
                            {d.hotelAddress && (
                              <div className="it-ro-input">
                                주소: {d.hotelAddress}
                              </div>
                            )}
                            {d.hotelHomepage && (
                              <div className="it-ro-input">
                                홈페이지: {d.hotelHomepage}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="notice">
              상기 일정은 항공 시간 및 현지 사정에 따라 일자의 순서 및 내용이
              변경될 수 있습니다.
            </p>

            {connectedLabel && (
              <p className="ci-connected-bottom">
                체크리스트에 연동: {connectedLabel}
              </p>
            )}
          </section>

          {/* 스타일 */}
          <style jsx>{`
            .ci-card {
              border-radius: 20px;
              border: 1px solid #e5e7eb;
              background: #ffffff;
              padding: 18px 20px 20px;
              font-size: 13px;
              color: #111827;
            }
            .ci-muted {
              background: #f9fafb;
              color: #6b7280;
            }
            .ci-error {
              background: #fef2f2;
              border-color: #fecaca;
              color: #b91c1c;
            }

            .ci-header {
              margin-bottom: 20px;
            }
            .ci-header-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .ci-header-title {
              font-size: 18px;
              font-weight: 800;
              margin-bottom: 4px;
            }
            .ci-header-desc {
              font-size: 13px;
              color: #4b5563;
              margin-bottom: 14px;
            }
            .ci-meta-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              column-gap: 40px;
              row-gap: 8px;
              font-size: 12px;
            }
            @media (max-width: 900px) {
              .ci-meta-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                column-gap: 20px;
              }
            }
            .ci-meta-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .ci-meta-label {
              color: #9ca3af;
            }
            .ci-meta-value {
              color: #111827;
              font-weight: 600;
            }

            .ci-section-group {
              border-radius: 16px;
              border: 1px solid #e5e7eb;
              background: #f9fafb;
              padding: 12px 14px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 20px;
            }
            .ci-section-row {
              display: flex;
              gap: 10px;
            }
            .ci-section-icon {
              min-width: 40px;
              height: 40px;
              border-radius: 12px;
              border: 1px solid #e5e7eb;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px; /* 아이콘 크게 */
            }
            .ci-section-icon.ci-green {
              border-color: #bbf7d0;
              background: #ecfdf5;
            }
            .ci-section-icon.ci-red {
              border-color: #fecaca;
              background: #fef2f2;
            }
            .ci-section-body {
              flex: 1;
              min-width: 0;
            }
            .ci-section-title {
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 2px;
            }
            .ci-section-text {
              font-size: 12px;
              white-space: pre-wrap;
              color: #4b5563;
            }

            .ci-connected-bottom {
              margin-top: 6px;
              font-size: 11px;
              color: #6b7280;
            }

            /* 구분선 살짝만 강조 */
            .cust-itinerary-box .it-detail-days-readonly {
              margin-top: 6px;
              border-top: 2px solid #111827;
            }
            .cust-itinerary-box .day-block-row {
              border-top: 1px solid #d1d5db;
              padding-top: 10px;
              margin-top: 10px;
            }
            .cust-itinerary-box
              .it-detail-days-readonly
              .day-block-row:first-child {
              border-top: none;
              margin-top: 8px;
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
