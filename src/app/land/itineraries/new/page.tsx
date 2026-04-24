// src/app/land/itineraries/new/page.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TiptapEditor } from "@/components/editor/TiptapEditor";

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

const COMMON: Array<Pick<CommonSection, "key" | "title">> = [
  { key: "includes", title: "포함사항" },
  { key: "excludes", title: "불포함사항" },
  { key: "visa", title: "비자 관련 사항" },
  { key: "remark", title: "비고" },
];

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** ===== 일정표(랜드 템플릿) 전용 타입 ===== */
type LandScheduleRow = {
  id: string;
  time: string;
  text: string;
};

type LandDayPlan = {
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

const MEAL_OPTIONS = ["선택", "기내식", "현지식", "호텔식", "뷔페식", "한식", "불포함", "직접입력"];

const TIME_OPTIONS: string[] = (() => {
  const arr: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      arr.push(`${hh}:${mm}`);
    }
  }
  return arr;
})();

function newRow(): LandScheduleRow {
  return { id: makeId(), time: "", text: "" };
}

function newDay(dayNo: number): LandDayPlan {
  return {
    day: dayNo,
    region: "",
    transport: "",
    rows: [newRow(), newRow(), newRow()],
    breakfast: "선택",
    lunch: "선택",
    dinner: "선택",
    hotelKr: "",
    hotelEn: "",
    hotelGrade: "",
    hotelAddress: "",
  };
}

function buildDefaultDayPlans(days: number): LandDayPlan[] {
  const safeDays = Math.max(1, Math.min(days || 1, 60));
  return Array.from({ length: safeDays }).map((_, i) => newDay(i + 1));
}

/** ✅ textarea 자동 높이 */
function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "0px";
  el.style.height = `${el.scrollHeight}px`;
}

export default function NewLandItineraryPage() {
  const [tripTitle, setTripTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("");
  const [summary, setSummary] = useState("");

  // ✅ 공통 섹션
  const [commonSections, setCommonSections] = useState<CommonSection[]>(() =>
    COMMON.map((s) => ({ ...s, html: "", fixed: true }))
  );

  // ✅ 선택 섹션
  const [optionalSections, setOptionalSections] = useState<OptionalSection[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // ✅ (개선) 선택 섹션 옵션 메뉴
  const [openOptMenuId, setOpenOptMenuId] = useState<string | null>(null);

  // ✅ 초기 일차 (duration 값 기반)
  const initialDays = useMemo(() => {
    const m = duration.match(/(\d+)\s*일/);
    const days = m ? Number(m[1]) : 3;
    return buildDefaultDayPlans(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dayPlans, setDayPlans] = useState<LandDayPlan[]>(initialDays);

  // ✅ 모바일 여부
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // ✅ 화면 폭 변화(회전/리사이즈) 시 textarea 높이 재계산
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  useEffect(() => {
    const handler = () => {
      Object.values(textareaRefs.current).forEach((el) => {
        if (el) autoGrow(el);
      });
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const bindTARef = (key: string) => (el: HTMLTextAreaElement | null) => {
    textareaRefs.current[key] = el;
    if (el) requestAnimationFrame(() => autoGrow(el));
  };

  // ✅ (개선) 바깥 클릭 시 선택섹션 메뉴 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.("[data-optmenu-root='true']")) return;
      setOpenOptMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ======================
  // 섹션 핸들러
  // ======================
  const setCommonHtml = (key: CommonKey, html: string) => {
    setCommonSections((prev) => prev.map((s) => (s.key === key ? { ...s, html } : s)));
  };

  const setOptionalHtml = (id: string, html: string) => {
    setOptionalSections((prev) => prev.map((s) => (s.id === id ? { ...s, html } : s)));
  };

  const setOptionalTitle = (id: string, title: string) => {
    setOptionalSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const addOptionalSection = () => {
    const t = newSectionTitle.trim();
    if (!t) return alert("섹션 제목을 입력하세요.");
    setOptionalSections((prev) => [...prev, { id: makeId(), title: t, html: "" }]);
    setNewSectionTitle("");
  };

  const removeOptionalSection = (id: string) => {
    if (!confirm("이 선택 섹션을 삭제할까요?")) return;
    setOptionalSections((prev) => prev.filter((s) => s.id !== id));
    setOpenOptMenuId(null);
  };

  // ======================
  // 일정표 핸들러
  // ======================
  const setDayMeta = useCallback((dayIndex: number, field: "region" | "transport", value: string) => {
    setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, [field]: value } : d)));
  }, []);

  const setRowField = useCallback(
    (dayIndex: number, rowIndex: number, field: "time" | "text", value: string) => {
      setDayPlans((prev) =>
        prev.map((d, idx) => {
          if (idx !== dayIndex) return d;
          const rows = d.rows.map((r, rIdx) => (rIdx === rowIndex ? { ...r, [field]: value } : r));
          return { ...d, rows };
        })
      );
    },
    []
  );

  const addRow = useCallback((dayIndex: number) => {
    setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, rows: [...d.rows, newRow()] } : d)));
  }, []);

  const removeRow = useCallback((dayIndex: number, rowIndex: number) => {
    setDayPlans((prev) =>
      prev.map((d, idx) => {
        if (idx !== dayIndex) return d;
        if (d.rows.length <= 1) return d;
        return { ...d, rows: d.rows.filter((_, i) => i !== rowIndex) };
      })
    );
  }, []);

  // ✅ ▲▼ 이동은 모바일에서만 사용
  const moveRow = useCallback((dayIndex: number, from: number, to: number) => {
    setDayPlans((prev) =>
      prev.map((d, idx) => {
        if (idx !== dayIndex) return d;
        const items = [...d.rows];
        if (from < 0 || from >= items.length || to < 0 || to >= items.length) return d;
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...d, rows: items };
      })
    );
  }, []);

  const setMeal = useCallback((dayIndex: number, kind: "breakfast" | "lunch" | "dinner", value: string) => {
    setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, [kind]: value } : d)));
  }, []);

  const setHotel = useCallback(
    (dayIndex: number, field: "hotelKr" | "hotelEn" | "hotelGrade" | "hotelAddress", value: string) => {
      setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, [field]: value } : d)));
    },
    []
  );

  const copyHotelFromPrevious = useCallback((dayIndex: number) => {
    if (dayIndex <= 0) return;
    setDayPlans((prev) =>
      prev.map((d, idx) => {
        if (idx !== dayIndex) return d;
        const p = prev[dayIndex - 1];
        return { ...d, hotelKr: p.hotelKr, hotelEn: p.hotelEn, hotelGrade: p.hotelGrade, hotelAddress: p.hotelAddress };
      })
    );
  }, []);

  // ✅ 일차 추가/삭제
  const addDay = useCallback(() => {
    setDayPlans((prev) => [...prev, newDay(prev.length + 1)]);
  }, []);

  const removeDay = useCallback((dayIndex: number) => {
    setDayPlans((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, idx) => idx !== dayIndex);
      return next.map((d, i) => ({ ...d, day: i + 1 }));
    });
  }, []);

  // ✅ PC 드래그&드랍(유지)
  const [draggingRow, setDraggingRow] = useState<{ dayIndex: number; rowIndex: number } | null>(null);

  const handleRowDrop = useCallback(
    (dayIndex: number, targetIndex: number) => {
      setDayPlans((prev) => {
        if (!draggingRow) return prev;
        if (draggingRow.dayIndex !== dayIndex) return prev;

        const fromIndex = draggingRow.rowIndex;

        return prev.map((d, idx) => {
          if (idx !== dayIndex) return d;
          const items = [...d.rows];
          if (fromIndex < 0 || fromIndex >= items.length || targetIndex < 0 || targetIndex >= items.length) return d;
          const [moved] = items.splice(fromIndex, 1);
          items.splice(targetIndex, 0, moved);
          return { ...d, rows: items };
        });
      });

      setDraggingRow(null);
    },
    [draggingRow]
  );

  // ======================
  // 저장
  // ======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      tripTitle,
      destination,
      duration,
      summary,
      commonSections,
      optionalSections,
      dayPlans,
      includes: "",
      excludes: "",
      notes: "",
      scheduleHtml: "",
    };

    try {
      const res = await fetch("/api/land/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        alert("템플릿이 저장되었습니다.");
        window.location.href = "/land/itineraries";
      } else {
        alert(data?.error ?? "저장 실패");
        console.error(data);
      }
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="wrap">
      <div className="hero">
        <div className="hero-main">일정표 템플릿 만들기 (랜드사)</div>
        <div className="hero-sub">
          공통 섹션은 필수입니다. 선택 섹션은 제목을 직접 입력해 자유롭게 추가할 수 있습니다. 일정표는 날짜 → 지역 → 교통 → 시간/일정 → 식사 → 호텔 순서로 입력합니다.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 18 }}>
        {/* ======================
            기본 정보 (PC: 3줄 배치)
            1) 상품명/일정명
            2) 여행지 + 기간 (한 줄)
            3) 간단 소개
           ====================== */}
        <div className="basic-wrap">
          <div className="basic-row1">
            <div>
              <div className="label">상품명 / 일정명</div>
              <input className="basic-input" value={tripTitle} onChange={(e) => setTripTitle(e.target.value)} placeholder="예) 발리 4박6일 허니문 패키지" />
            </div>
          </div>

          <div className="basic-row2">
            <div>
              <div className="label">여행지</div>
              <input className="basic-input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="예) 발리" />
            </div>
            <div>
              <div className="label">기간</div>
              <input className="basic-input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="예) 4박6일" />
            </div>
          </div>

          <div className="basic-row3">
            <div>
              <div className="label">간단 소개</div>
              <input className="basic-input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="상품 요약 설명" />
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        {/* 공통 섹션 */}
        <div className="section">
          <div className="section-title">공통 섹션</div>
          <div style={{ display: "grid", gap: 14 }}>
            {commonSections.map((s) => (
              <div key={s.key} className="box">
                <div className="box-head">
                  <div className="box-title">{s.title}</div>
                </div>
                <TiptapEditor onChangeHTML={(html) => setCommonHtml(s.key, html)} placeholder={`${s.title} 내용을 입력하세요`} minHeight={160} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 18 }} />

        {/* 선택 섹션 */}
        <div className="section">
          <div className="opt-head">
            <div>
              <div className="section-title" style={{ marginBottom: 4 }}>
                선택 섹션
              </div>
              <div className="opt-sub">제목을 입력하고 추가하면, 카드가 생성됩니다.</div>
            </div>
          </div>

          <div className="opt-add">
            <input className="opt-input" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="예: 허니문 특전 / 선택 투어 / 골프 옵션 / 유의사항 ..." />
            <button type="button" className="opt-add-btn" onClick={addOptionalSection} title="선택 섹션 추가">
              + 선택 섹션 추가
            </button>
          </div>

          {optionalSections.length === 0 ? (
            <div className="hint" style={{ marginTop: 10 }}>
              아직 선택 섹션이 없습니다. 위에서 제목을 입력하고 추가하세요.
            </div>
          ) : (
            <div className="opt-grid">
              {optionalSections.map((s) => (
                <div key={s.id} className="opt-card">
                  <div className="opt-card-head" data-optmenu-root="true">
                    <input className="opt-title" value={s.title} onChange={(e) => setOptionalTitle(s.id, e.target.value)} placeholder="섹션 제목" />

                    <button type="button" className="opt-more" aria-label="옵션" title="옵션" onClick={() => setOpenOptMenuId((prev) => (prev === s.id ? null : s.id))}>
                      ⋯
                    </button>

                    {openOptMenuId === s.id && (
                      <div className="opt-menu" role="menu" aria-label="선택 섹션 메뉴">
                        <button type="button" className="opt-menu-item danger" onClick={() => removeOptionalSection(s.id)} role="menuitem">
                          삭제
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="opt-editor">
                    <TiptapEditor onChangeHTML={(html) => setOptionalHtml(s.id, html)} placeholder={`${s.title || "선택 섹션"} 내용을 입력하세요`} minHeight={150} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 18 }} />

        {/* 일정표 */}
        <div className="section">
          <div className="section-title">일정표 작성</div>

          {!isMobile && (
            <div className="sch-header">
              <span>날짜</span>
              <span>지역</span>
              <span>교통</span>
              <span>시간</span>
              <span>일정</span>
              <span>식사</span>
            </div>
          )}

          <div className="sch-body">
            {dayPlans.map((day, dayIndex) => {
              const desktopRows = Math.max(day.rows.length, 3);

              const desktopRenderRows: Array<LandScheduleRow & { __ghost?: true }> =
                day.rows.length >= 3
                  ? day.rows
                  : [
                      ...day.rows,
                      ...Array.from({ length: 3 - day.rows.length }).map(() => ({
                        id: makeId(),
                        time: "",
                        text: "",
                        __ghost: true as const,
                      })),
                    ];

              return (
                <div key={day.day} className="sch-day">
                  {dayPlans.length > 1 && (
                    <button
                      type="button"
                      className="sch-day-x"
                      title="일차 삭제"
                      aria-label={`${day.day}일차 삭제`}
                      onClick={() => {
                        if (!confirm(`${day.day}일차를 삭제할까요?`)) return;
                        removeDay(dayIndex);
                      }}
                    >
                      ×
                    </button>
                  )}

                  {/* ===== MOBILE ===== */}
                  {isMobile ? (
                    <div className="m-day">
                      <div className="m-day-title">{day.day}일차</div>

                      <div className="m-field">
                        <div className="m-label">지역</div>
                        <textarea
                          ref={bindTARef(`region_${day.day}`)}
                          className="m-textarea"
                          value={day.region}
                          onChange={(e) => setDayMeta(dayIndex, "region", e.target.value)}
                          onInput={(e) => autoGrow(e.currentTarget)}
                          placeholder="예) 인천 → 발리"
                        />
                      </div>

                      <div className="m-field">
                        <div className="m-label">교통</div>
                        <textarea
                          ref={bindTARef(`transport_${day.day}`)}
                          className="m-textarea"
                          value={day.transport}
                          onChange={(e) => setDayMeta(dayIndex, "transport", e.target.value)}
                          onInput={(e) => autoGrow(e.currentTarget)}
                          placeholder="예) KE931 / 전용차량"
                        />
                      </div>

                      <div className="m-field">
                        <div className="m-label">시간 / 일정</div>

                        <div className="m-rows">
                          {day.rows.map((r, rowIndex) => (
                            <div key={r.id} className="m-rowcard">
                              <div className="m-timebar">
                                <select className="m-select" value={r.time} onChange={(e) => setRowField(dayIndex, rowIndex, "time", e.target.value)}>
                                  <option value="">시간 선택</option>
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>

                                <div className="m-time-actions">
                                  <button type="button" className="m-move" onClick={() => moveRow(dayIndex, rowIndex, rowIndex - 1)} disabled={rowIndex === 0} title="위로">
                                    ▲
                                  </button>
                                  <button type="button" className="m-move" onClick={() => moveRow(dayIndex, rowIndex, rowIndex + 1)} disabled={rowIndex === day.rows.length - 1} title="아래로">
                                    ▼
                                  </button>
                                </div>
                              </div>

                              <div className="m-textline">
                                <textarea
                                  ref={bindTARef(`m_row_${day.day}_${r.id}`)}
                                  className="m-textarea m-textarea-schedule"
                                  value={r.text}
                                  onChange={(e) => setRowField(dayIndex, rowIndex, "text", e.target.value)}
                                  onInput={(e) => autoGrow(e.currentTarget)}
                                  placeholder="상세 일정 입력"
                                />
                                <button type="button" className="m-del" onClick={() => removeRow(dayIndex, rowIndex)} title="이 줄(시간/일정) 삭제">
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="m-addrow">
                          <button type="button" className="m-addbtn" onClick={() => addRow(dayIndex)}>
                            + 일정 추가하기
                          </button>
                        </div>
                      </div>

                      <div className="m-field">
                        <div className="m-label">식사</div>
                        <div className="m-meals">
                          <div className="m-meal">
                            <span className="m-meal-label">조식</span>
                            <select className="m-select" value={day.breakfast} onChange={(e) => setMeal(dayIndex, "breakfast", e.target.value)}>
                              {MEAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="m-meal">
                            <span className="m-meal-label">중식</span>
                            <select className="m-select" value={day.lunch} onChange={(e) => setMeal(dayIndex, "lunch", e.target.value)}>
                              {MEAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="m-meal">
                            <span className="m-meal-label">석식</span>
                            <select className="m-select" value={day.dinner} onChange={(e) => setMeal(dayIndex, "dinner", e.target.value)}>
                              {MEAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="m-field">
                        <div className="m-label">호텔</div>
                        <div className="m-hotel">
                          <input className="m-input" placeholder="한글명" value={day.hotelKr} onChange={(e) => setHotel(dayIndex, "hotelKr", e.target.value)} />
                          <input className="m-input" placeholder="영문명" value={day.hotelEn} onChange={(e) => setHotel(dayIndex, "hotelEn", e.target.value)} />
                          <input className="m-input" placeholder="성급" value={day.hotelGrade} onChange={(e) => setHotel(dayIndex, "hotelGrade", e.target.value)} />
                          <input className="m-input" placeholder="주소" value={day.hotelAddress} onChange={(e) => setHotel(dayIndex, "hotelAddress", e.target.value)} />
                        </div>

                        {dayIndex > 0 && (
                          <button type="button" className="m-copyhotel" onClick={() => copyHotelFromPrevious(dayIndex)}>
                            이전 일자와 동일
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ===== DESKTOP ===== */
                    <>
                      <div className="sch-grid" style={{ gridTemplateRows: `repeat(${desktopRows}, minmax(var(--sch-row-h), auto))` }}>
                        <div className="sch-daycell" style={{ gridColumn: "1", gridRow: `1 / span ${desktopRows}` }}>
                          <div className="sch-daytext">{day.day}일차</div>
                        </div>

                        <textarea
                          className="sch-merged-input"
                          style={{ gridColumn: "2", gridRow: `1 / span ${desktopRows}` }}
                          value={day.region}
                          onChange={(e) => setDayMeta(dayIndex, "region", e.target.value)}
                          placeholder="예) 인천 → 발리"
                        />

                        <textarea
                          className="sch-merged-input"
                          style={{ gridColumn: "3", gridRow: `1 / span ${desktopRows}` }}
                          value={day.transport}
                          onChange={(e) => setDayMeta(dayIndex, "transport", e.target.value)}
                          placeholder="예) KE931 / 전용차량"
                        />

                        {desktopRenderRows.map((r, rowIndex) => {
                          const isGhost = !!r.__ghost;
                          const dragging = !isGhost && draggingRow && draggingRow.dayIndex === dayIndex && draggingRow.rowIndex === rowIndex;

                          return (
                            <React.Fragment key={r.id}>
                              <div className="sch-row" style={{ gridColumn: "4", gridRow: `${rowIndex + 1}` }}>
                                <select
                                  className="sch-select"
                                  value={r.time}
                                  disabled={isGhost}
                                  onChange={(e) => {
                                    if (isGhost) return;
                                    setRowField(dayIndex, rowIndex, "time", e.target.value);
                                  }}
                                  style={isGhost ? { opacity: 0.45 } : undefined}
                                >
                                  <option value="">시간 선택</option>
                                  {TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div
                                className={"sch-row sch-schedule-line" + (dragging ? " dragging" : "")}
                                style={{ gridColumn: "5", gridRow: `${rowIndex + 1}`, opacity: isGhost ? 0.45 : 1, alignItems: "stretch" }}
                                draggable={!isGhost}
                                onDragStart={() => {
                                  if (isGhost) return;
                                  setDraggingRow({ dayIndex, rowIndex });
                                }}
                                onDragEnd={() => setDraggingRow(null)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (isGhost) return;
                                  handleRowDrop(dayIndex, rowIndex);
                                }}
                              >
                                <textarea
                                  ref={bindTARef(`d_row_${day.day}_${r.id}`)}
                                  className="sch-textarea"
                                  value={r.text}
                                  disabled={isGhost}
                                  onChange={(e) => {
                                    if (isGhost) return;
                                    setRowField(dayIndex, rowIndex, "text", e.target.value);
                                  }}
                                  onInput={(e) => autoGrow(e.currentTarget)}
                                  placeholder="상세 일정 입력"
                                />

                                {!isGhost && (
                                  <>
                                    <button type="button" className="sch-inline-del" onClick={() => removeRow(dayIndex, rowIndex)} title="이 줄(시간/일정) 삭제">
                                      ×
                                    </button>
                                    <span className="sch-inline-handle" aria-hidden>
                                      ≡
                                    </span>
                                  </>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}

                        <div className="sch-meal-merged" style={{ gridColumn: "6", gridRow: `1 / span ${desktopRows}` }}>
                          <div className="meal-row">
                            <span className="meal-label">조식</span>
                            <select className="sch-select" value={day.breakfast} onChange={(e) => setMeal(dayIndex, "breakfast", e.target.value)}>
                              {MEAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="meal-row">
                            <span className="meal-label">중식</span>
                            <select className="sch-select" value={day.lunch} onChange={(e) => setMeal(dayIndex, "lunch", e.target.value)}>
                              {MEAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="meal-row">
                            <span className="meal-label">석식</span>
                            <select className="sch-select" value={day.dinner} onChange={(e) => setMeal(dayIndex, "dinner", e.target.value)}>
                              {MEAL_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* ✅ PC: 일정 추가하기 */}
                      <div className="pc-addrow">
                        <button type="button" className="pc-addbtn" onClick={() => addRow(dayIndex)}>
                          + 일정 추가하기
                        </button>
                      </div>

                      {/* ✅ PC: 호텔(그리드 아래 카드) */}
                      <div className="pc-hotel">
                        <div className="pc-hotel-title">호텔</div>
                        <div className="pc-hotel-grid">
                          <input className="pc-hotel-input" placeholder="한글명" value={day.hotelKr} onChange={(e) => setHotel(dayIndex, "hotelKr", e.target.value)} />
                          <input className="pc-hotel-input" placeholder="영문명" value={day.hotelEn} onChange={(e) => setHotel(dayIndex, "hotelEn", e.target.value)} />
                          <input className="pc-hotel-input" placeholder="성급" value={day.hotelGrade} onChange={(e) => setHotel(dayIndex, "hotelGrade", e.target.value)} />
                          <input className="pc-hotel-input" placeholder="주소" value={day.hotelAddress} onChange={(e) => setHotel(dayIndex, "hotelAddress", e.target.value)} />
                        </div>

                        {dayIndex > 0 && (
                          <button type="button" className="pc-copyhotel" onClick={() => copyHotelFromPrevious(dayIndex)}>
                            이전 일자와 동일
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="add-day-row">
            <button type="button" className="add-day-btn" onClick={addDay}>
              + 일차 추가하기
            </button>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn outline-black" onClick={() => history.back()}>
            취소
          </button>
          <button type="submit" className="btn black">
            템플릿 저장
          </button>
        </div>
      </form>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
        }

        /* ======================
           기본 정보(PC 디자인)
           ====================== */
        .basic-wrap {
          display: grid;
          gap: 14px;
        }

        /* 1줄: 상품명 */
        .basic-row1 {
          display: grid;
          gap: 6px;
        }

        /* 2줄: 여행지 + 기간 */
        .basic-row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: end;
        }

        /* 3줄: 간단 소개 */
        .basic-row3 {
          display: grid;
          gap: 6px;
        }

        /* ✅ PC 입력칸: “작성칸” 느낌 + 정갈하게 */
        .basic-input {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .basic-input::placeholder {
          color: #94a3b8;
        }
        .basic-input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
        }

        @media (max-width: 900px) {
          .basic-row2 {
            grid-template-columns: 1fr;
          }
          .basic-input {
            height: 42px;
            border-radius: 12px;
            font-size: 14px;
          }
        }

        /* ===== 선택 섹션 ===== */
        .opt-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 10px;
        }
        .opt-sub {
          font-size: 12px;
          color: #64748b;
        }

        .opt-add {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fafafa;
        }
        .opt-input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .opt-input:focus {
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
        }

        .opt-add-btn {
          height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid #111827;
          background: #111827;
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .opt-grid {
          margin-top: 12px;
          display: grid;
          gap: 14px;
        }

        .opt-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #fff;
          overflow: hidden;
        }
        .opt-card-head {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid #eef2f7;
          background: #fbfdff;
        }
        .opt-title {
          flex: 1;
          min-width: 0;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 14px;
          font-weight: 900;
          outline: none;
          background: #fff;
          color: #0f172a;
        }
        .opt-title:focus {
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
        }

        .opt-more {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #64748b;
          font-size: 20px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
          flex: 0 0 auto;
        }
        .opt-more:hover {
          background: #f8fafc;
          border-color: #d1d5db;
          transform: scale(1.02);
        }
        .opt-more:active {
          transform: scale(0.98);
        }

        .opt-menu {
          position: absolute;
          top: 46px;
          right: 12px;
          min-width: 140px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
          padding: 6px;
          z-index: 50;
        }
        .opt-menu-item {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          border-radius: 10px;
          padding: 10px 10px;
          font-size: 13px;
          cursor: pointer;
          color: #0f172a;
        }
        .opt-menu-item:hover {
          background: #f8fafc;
        }
        .opt-menu-item.danger {
          color: #ef4444;
          font-weight: 900;
        }
        .opt-menu-item.danger:hover {
          background: rgba(239, 68, 68, 0.08);
        }

        .opt-editor {
          padding: 12px;
        }

        @media (max-width: 900px) {
          .opt-add {
            grid-template-columns: 1fr;
          }
          .opt-add-btn {
            width: 100%;
          }
        }

        /* ===== 일정표 ===== */
        :global(:root) {
          --sch-row-h: 40px;
        }

        .sch-header {
          display: grid;
          grid-template-columns: 90px 160px 140px 120px 1fr 190px;
          font-size: 13px;
          font-weight: 800;
          border-bottom: 1px solid #111827;
          padding-bottom: 10px;
          margin-top: 6px;
        }

        .sch-body {
          margin-top: 10px;
          display: grid;
          gap: 18px;
        }

        .sch-day {
          border-bottom: 1px solid #e5e7eb;
          padding: 30px 0 18px;
          position: relative;
          min-width: 0;
        }

        .sch-day-x {
          position: absolute;
          top: -3px;
          right: 0px;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          font-size: 22px;
          line-height: 1;
          color: #ef4444;
          opacity: 0;
          transition: opacity 0.12s ease, background 0.12s ease, border-color 0.12s ease;
        }
        .sch-day:hover .sch-day-x {
          opacity: 1;
        }
        .sch-day-x:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.22);
        }

        .sch-grid {
          display: grid;
          grid-template-columns: 90px 160px 140px 120px 1fr 190px;
          gap: 8px;
          align-items: stretch;
        }

        .sch-daycell {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sch-daytext {
          font-weight: 900;
          font-size: 13px;
          color: #111827;
          white-space: nowrap;
        }

        .sch-merged-input {
          width: 100%;
          height: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
          outline: none;
          resize: none;
          background: #fff;
        }

        .sch-row {
          min-height: var(--sch-row-h);
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .sch-select {
          height: var(--sch-row-h);
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
          width: 100%;
        }

        .sch-schedule-line {
          cursor: grab;
          border-radius: 10px;
          min-width: 0;

          /* ✅ 오른쪽 아이콘 공간 확보 + absolute 정렬용 */
          position: relative;
          padding-right: 62px;
        }

        .sch-textarea {
          flex: 1;
          width: 100%;
          min-height: var(--sch-row-h);
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
          resize: none;
          overflow: hidden;
          line-height: 1.35;
          min-width: 0;
        }

        /* ✅ × / ≡ 위치 안 틀어지게 absolute */
        .sch-inline-del,
        .sch-inline-handle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          line-height: 1;
        }

        .sch-inline-del {
          right: 34px;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .sch-inline-del:hover {
          background: #f3f4f6;
        }

        .sch-inline-handle {
          right: 10px;
          width: 22px;
          height: 22px;
          font-size: 14px;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }

        .sch-meal-merged {
          border: none;
          background: transparent;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
        }
        .meal-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: var(--sch-row-h);
        }
        .meal-label {
          width: 34px;
          font-size: 12px;
          font-weight: 800;
          color: #4b5563;
          white-space: nowrap;
        }

        .add-day-row {
          margin-top: 16px;
          display: flex;
          justify-content: center;
        }
        .add-day-btn {
          border-radius: 999px;
          border: 1px dashed #d1d5db;
          padding: 8px 18px;
          background: #ffffff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
        }

        /* ✅ PC: 일정 추가 / 호텔 */
        .pc-addrow {
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }
        .pc-addbtn {
          border-radius: 999px;
          border: 1px dashed #d1d5db;
          padding: 8px 18px;
          background: #ffffff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 900;
        }

        .pc-hotel {
          margin-top: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fff;
          padding: 12px;
        }
        .pc-hotel-title {
          font-size: 12px;
          font-weight: 900;
          color: #475569;
          margin-bottom: 8px;
        }
        .pc-hotel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .pc-hotel-input {
          height: 42px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 10px;
          font-size: 13px;
          outline: none;
          background: #fff;
        }
        .pc-hotel-input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
        }
        .pc-copyhotel {
          margin-top: 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        /* ===== MOBILE (사용자 수정본 유지 + 강조) ===== */
        .m-day,
        .m-field,
        .m-rows,
        .m-rowcard,
        .m-timebar,
        .m-textline,
        .m-meals,
        .m-hotel {
          width: 100%;
          min-width: 0;
        }

        .m-day {
          display: grid;
          gap: 12px;
        }

        .m-day-title {
          font-weight: 900;
          font-size: 14px;
          color: #111827;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
        }

        .m-field {
          display: grid;
          gap: 6px;
        }

        .m-label {
          font-size: 12px;
          font-weight: 900;
          color: #475569;
        }

        .m-textarea,
        .m-input,
        .m-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          background: #ffffff;
        }

        .m-textarea {
          min-height: 48px;
          border-radius: 12px;
          padding: 12px 12px;
          font-size: 14px;
          outline: none;
          resize: none;
          overflow: hidden;
          line-height: 1.4;
        }
        .m-textarea::placeholder {
          color: #94a3b8;
        }

        .m-textarea-schedule {
          min-height: 72px;
        }

        .m-select {
          height: 46px;
          border-radius: 12px;
          padding: 0 44px 0 12px;
          font-size: 14px;
          outline: none;
        }

        .m-input {
          height: 46px;
          border-radius: 12px;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }

        .m-textarea:focus,
        .m-input:focus,
        .m-select:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.14);
        }

        .m-rows {
          display: grid;
          gap: 10px;
        }

        .m-rowcard {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 10px;
        }

        .m-timebar {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          min-width: 0;
        }

        .m-time-actions {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          flex: 0 0 auto;
        }

        .m-textline {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: start;
          min-width: 0;
        }

        .m-move {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
        }
        .m-move:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .m-del {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-size: 20px;
          color: #9ca3af;
          margin-top: 6px;
        }

        .m-addrow {
          display: flex;
          justify-content: flex-start;
        }

        .m-addbtn {
          border-radius: 999px;
          border: 1px dashed #d1d5db;
          padding: 9px 16px;
          background: #f9fafb;
          cursor: pointer;
          font-size: 13px;
          font-weight: 900;
        }

        .m-meals {
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
        }

        .m-meal {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 10px;
          align-items: center;
          min-width: 0;
        }

        .m-meal-label {
          font-size: 12px;
          font-weight: 900;
          color: #4b5563;
          white-space: nowrap;
        }

        .m-hotel {
          display: grid;
          gap: 10px;
        }

        .m-copyhotel {
          margin-top: 8px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .sch-day {
            padding: 20px 0 16px;
          }
          .sch-day-x {
            opacity: 1;
            top: 0;
            right: 0;
          }
        }
      `}</style>
    </div>
  );
}
