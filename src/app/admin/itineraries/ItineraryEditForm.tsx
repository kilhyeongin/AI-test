// /src/app/admin/itineraries/ItineraryEditForm.tsx
// 여행 일정표 전체 수정 폼
// - 기본 정보
// - 포함/불포함/입출국자/쇼핑센터
// - 일차별 일정(스케줄 + 식사 + 호텔)까지 모두 수정 가능

"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
  type CSSProperties,
} from "react";

type ScheduleForm = {
  time: string;
  text: string;
};

type DayPlanForm = {
  day: number;
  date: string;
  schedules: ScheduleForm[];
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  hotelKr?: string;
  hotelEn?: string;
  hotelGrade?: string;
  hotelAddress?: string;
  hotelHomepage?: string;
};

type ItineraryEditFormProps = {
  initial: {
    id: string;
    title: string;
    description: string;
    country: string;
    city: string;
    managerName: string;
    includeText: string;
    excludeText: string;
    travelerText: string;
    shoppingText: string;
    mode: "PNR" | "MANUAL";
    createdAtString: string;
    days: DayPlanForm[];
  };
};

// 식사 선택 옵션
const MEAL_OPTIONS = [
  "기내식",
  "현지식",
  "호텔식",
  "뷔페식",
  "한식",
  "불포함",
];

// 현재 값이 선택식인지 / 직접입력인지 판단용
const getMealSelectValue = (value?: string) => {
  if (!value) return "";
  return MEAL_OPTIONS.includes(value) ? value : "custom";
};

export function ItineraryEditForm({ initial }: ItineraryEditFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [country, setCountry] = useState(initial.country);
  const [city, setCity] = useState(initial.city);
  const [managerName, setManagerName] = useState(initial.managerName);
  const [includeText, setIncludeText] = useState(initial.includeText);
  const [excludeText, setExcludeText] = useState(initial.excludeText);
  const [travelerText, setTravelerText] = useState(initial.travelerText);
  const [shoppingText, setShoppingText] = useState(initial.shoppingText);

  const [days, setDays] = useState<DayPlanForm[]>(
    initial.days.length
      ? initial.days
      : [
          {
            day: 1,
            date: "",
            schedules: [{ time: "", text: "" }],
            breakfast: "",
            lunch: "",
            dinner: "",
            hotelKr: "",
            hotelEn: "",
            hotelGrade: "",
            hotelAddress: "",
            hotelHomepage: "",
          },
        ]
  );

  const [saving, setSaving] = useState(false);

  // 일정 줄 드래그용 상태 (같은 일차 안에서만 이동)
  const [draggingSchedule, setDraggingSchedule] = useState<{
    dayIndex: number;
    scheduleIndex: number;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      // ✅ day 번호 정렬
      const normalizedDays = days.map((d, idx) => ({
        ...d,
        day: idx + 1,
      }));

      const res = await fetch(`/api/admin/itineraries/${initial.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          country,
          city,
          managerName,
          includeText,
          excludeText,
          travelerText,
          shoppingText,
          days: normalizedDays,
        }),
      });

      if (!res.ok) {
        let message = "저장 중 오류가 발생했습니다.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        alert(message);
        return;
      }

      alert("수정 내용이 저장되었습니다.");
      router.push(`/admin/itineraries/${initial.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 공통 인풋 스타일: 상단 기본 정보용
  const boxInputStyle: CSSProperties = {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    background: "#ffffff",
    boxSizing: "border-box",
  };

  const smallInputStyle: CSSProperties = {
    ...boxInputStyle,
    padding: "6px 8px",
    fontSize: 13,
  };

  const textareaStyle: CSSProperties = {
    ...boxInputStyle,
    minHeight: 80,
    resize: "vertical",
  };

  // 일차별 일정 영역 안에서 쓰는 인풋(네모칸)
  const inlineInputStyle: CSSProperties = {
    width: "100%",
    height: "32px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#ffffff",
    fontSize: 13,
    padding: "6px 8px",
    boxSizing: "border-box",
  };

  const inlineTextareaStyle: CSSProperties = {
    ...inlineInputStyle,
    minHeight: 40,
    height: "auto",
    resize: "vertical",
  };

  const inlineSelectStyle: CSSProperties = {
    ...inlineInputStyle,
    paddingRight: 24,
  };

  // ===== 일차별 일정 조작 함수들 =====

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      {
        day: prev.length + 1,
        date: "",
        schedules: [{ time: "", text: "" }],
        breakfast: "",
        lunch: "",
        dinner: "",
        hotelKr: "",
        hotelEn: "",
        hotelGrade: "",
        hotelAddress: "",
        hotelHomepage: "",
      },
    ]);
  };

  const removeDay = (index: number) => {
    setDays((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((d, idx) => ({ ...d, day: idx + 1 }));
    });
  };

  const updateDayField = (
    index: number,
    field: keyof DayPlanForm,
    value: string
  ) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === index
          ? {
              ...d,
              [field]: value,
            }
          : d
      )
    );
  };

  const addSchedule = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              schedules: [...d.schedules, { time: "", text: "" }],
            }
          : d
      )
    );
  };

  const removeSchedule = (dayIndex: number, scheduleIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const nextSchedules = d.schedules.filter(
          (_, si) => si !== scheduleIndex
        );
        return {
          ...d,
          schedules:
            nextSchedules.length > 0
              ? nextSchedules
              : [{ time: "", text: "" }],
        };
      })
    );
  };

  const updateScheduleField = (
    dayIndex: number,
    scheduleIndex: number,
    field: keyof ScheduleForm,
    value: string
  ) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const nextSchedules = d.schedules.map((s, si) =>
          si === scheduleIndex
            ? {
                ...s,
                [field]: value,
              }
            : s
        );
        return {
          ...d,
          schedules: nextSchedules,
        };
      })
    );
  };

  // ===== 일정 줄 드래그 & 드랍 (≡ 핸들) =====

  const handleScheduleDragStart = (dayIndex: number, scheduleIndex: number) => {
    setDraggingSchedule({ dayIndex, scheduleIndex });
  };

  const handleScheduleDragEnd = () => {
    setDraggingSchedule(null);
  };

  const handleScheduleDrop = (dayIndex: number, targetIndex: number) => {
    setDays((prev) => {
      if (!draggingSchedule) return prev;
      if (draggingSchedule.dayIndex !== dayIndex) return prev;

      const fromIndex = draggingSchedule.scheduleIndex;

      return prev.map((d, idx) => {
        if (idx !== dayIndex) return d;
        const items = [...d.schedules];

        if (
          fromIndex < 0 ||
          fromIndex >= items.length ||
          targetIndex < 0 ||
          targetIndex >= items.length
        ) {
          return d;
        }

        const [moved] = items.splice(fromIndex, 1);
        items.splice(targetIndex, 0, moved);

        return { ...d, schedules: items };
      });
    });

    setDraggingSchedule(null);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
      {/* ===== 1. 상단 기본 정보 ===== */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              여행 일정표 수정
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="여행 일정표 제목을 입력하세요."
              style={{
                ...boxInputStyle,
                fontSize: 18,
                fontWeight: 700,
              }}
              required
            />
          </div>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="상품 설명을 입력하세요. (선택)"
          style={{
            ...textareaStyle,
            marginTop: 8,
          }}
        />

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "8px 16px",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#6b7280", minWidth: 70 }}>여행 국가</span>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="예) 몰디브"
              style={smallInputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#6b7280", minWidth: 70 }}>여행 도시</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="예) 말레"
              style={smallInputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#6b7280", minWidth: 70 }}>생성 방식</span>
            <span style={{ fontWeight: 500 }}>
              {initial.mode === "PNR" ? "PNR 자동" : "수동 생성"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#6b7280", minWidth: 70 }}>생성일</span>
            <span style={{ fontWeight: 500 }}>
              {initial.createdAtString
                ? new Date(initial.createdAtString).toLocaleDateString(
                    "ko-KR",
                    {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }
                  )
                : "-"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#6b7280", minWidth: 70 }}>상품담당자</span>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="담당자 이름"
              style={smallInputStyle}
            />
          </div>
        </div>
      </div>

      {/* ===== 2. 포함/불포함/입출국자/쇼핑센터 ===== */}
      <div>
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
          <textarea
            value={includeText}
            onChange={(e) => setIncludeText(e.target.value)}
            placeholder="포함 사항을 입력하세요."
            style={textareaStyle}
          />
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
          <textarea
            value={excludeText}
            onChange={(e) => setExcludeText(e.target.value)}
            placeholder="불포함 사항을 입력하세요."
            style={textareaStyle}
          />
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
          <textarea
            value={travelerText}
            onChange={(e) => setTravelerText(e.target.value)}
            placeholder="입출국자 정보를 입력하세요."
            style={textareaStyle}
          />
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
          <textarea
            value={shoppingText}
            onChange={(e) => setShoppingText(e.target.value)}
            placeholder="쇼핑센터 정보를 입력하세요."
            style={textareaStyle}
          />
        </div>
      </div>

      {/* ===== 3. 일차별 일정 수정 영역 ===== */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15 }}>일차별 일정 수정</h3>
          <button
            type="button"
            className="btn line small"
            onClick={addDay}
          >
            + 일차 추가
          </button>
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

            {days.map((d, dayIndex) => (
              <div key={dayIndex} className="day-block-row">
                <div className="day-row-flex">
                  {/* 일차 */}
                  <div className="day-col">
                    <div className="day-main">{dayIndex + 1}일차</div>
                  </div>

                  {/* 날짜 */}
                  <div className="day-col">
                    <div className="it-ro-input it-ro-input-full">
                      <input
                        type="date"
                        value={d.date || ""}
                        onChange={(e) =>
                          updateDayField(dayIndex, "date", e.target.value)
                        }
                        style={inlineInputStyle}
                      />
                    </div>
                  </div>

                  {/* 시간(여러 줄) */}
                  <div className="time-col">
                    {d.schedules.map((s, scheduleIndex) => (
                      <div
                        key={`${d.day}-${scheduleIndex}-time`}
                        className="it-ro-input"
                      >
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={s.time}
                          onChange={(e) =>
                            updateScheduleField(
                              dayIndex,
                              scheduleIndex,
                              "time",
                              e.target.value
                            )
                          }
                          style={inlineInputStyle}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 일정(여러 줄) + X삭제 + ≡핸들 */}
                  <div className="schedule-col">
                    {d.schedules.map((s, scheduleIndex) => {
                      const dragging =
                        draggingSchedule &&
                        draggingSchedule.dayIndex === dayIndex &&
                        draggingSchedule.scheduleIndex === scheduleIndex;

                      return (
                        <div
                          key={`${d.day}-${scheduleIndex}-text`}
                          className={
                            "it-ro-schedule-line schedule-row" +
                            (dragging ? " dragging" : "")
                          }
                          draggable
                          onDragStart={() =>
                            handleScheduleDragStart(dayIndex, scheduleIndex)
                          }
                          onDragEnd={handleScheduleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() =>
                            handleScheduleDrop(dayIndex, scheduleIndex)
                          }
                        >
                          <input
                            type="text"
                            placeholder="일정 내용을 입력하세요."
                            value={s.text}
                            onChange={(e) =>
                              updateScheduleField(
                                dayIndex,
                                scheduleIndex,
                                "text",
                                e.target.value
                              )
                            }
                            style={inlineTextareaStyle}
                          />
                          <button
                            type="button"
                            className="schedule-del"
                            title="이 일정 줄 삭제"
                            onClick={() =>
                              removeSchedule(dayIndex, scheduleIndex)
                            }
                          >
                            ×
                          </button>
                          <span className="schedule-handle">≡</span>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="btn line small"
                      onClick={() => addSchedule(dayIndex)}
                      style={{ marginTop: 4 }}
                    >
                      + 일정 줄 추가
                    </button>
                  </div>

                  {/* 식사 (select + 직접입력) */}
                  <div className="meal-col">
                    {/* 조식 */}
                    <div className="meal-row">
                      <span className="meal-label">조식</span>
                      <div className="it-ro-input-meal" style={{ width: "100%" }}>
                        <select
                          value={getMealSelectValue(d.breakfast)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              updateDayField(dayIndex, "breakfast", "");
                            } else if (val === "custom") {
                              if (MEAL_OPTIONS.includes(d.breakfast || "")) {
                                updateDayField(dayIndex, "breakfast", "");
                              }
                            } else {
                              updateDayField(dayIndex, "breakfast", val);
                            }
                          }}
                          style={inlineSelectStyle}
                        >
                          <option value="">선택</option>
                          {MEAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="custom">직접입력</option>
                        </select>

                        {getMealSelectValue(d.breakfast) === "custom" && (
                          <input
                            type="text"
                            value={d.breakfast || ""}
                            onChange={(e) =>
                              updateDayField(
                                dayIndex,
                                "breakfast",
                                e.target.value
                              )
                            }
                            placeholder="직접 입력"
                            style={{ ...inlineInputStyle, marginTop: 4 }}
                          />
                        )}
                      </div>
                    </div>

                    {/* 중식 */}
                    <div className="meal-row">
                      <span className="meal-label">중식</span>
                      <div className="it-ro-input-meal" style={{ width: "100%" }}>
                        <select
                          value={getMealSelectValue(d.lunch)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              updateDayField(dayIndex, "lunch", "");
                            } else if (val === "custom") {
                              if (MEAL_OPTIONS.includes(d.lunch || "")) {
                                updateDayField(dayIndex, "lunch", "");
                              }
                            } else {
                              updateDayField(dayIndex, "lunch", val);
                            }
                          }}
                          style={inlineSelectStyle}
                        >
                          <option value="">선택</option>
                          {MEAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="custom">직접입력</option>
                        </select>

                        {getMealSelectValue(d.lunch) === "custom" && (
                          <input
                            type="text"
                            value={d.lunch || ""}
                            onChange={(e) =>
                              updateDayField(dayIndex, "lunch", e.target.value)
                            }
                            placeholder="직접 입력"
                            style={{ ...inlineInputStyle, marginTop: 4 }}
                          />
                        )}
                      </div>
                    </div>

                    {/* 석식 */}
                    <div className="meal-row">
                      <span className="meal-label">석식</span>
                      <div className="it-ro-input-meal" style={{ width: "100%" }}>
                        <select
                          value={getMealSelectValue(d.dinner)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              updateDayField(dayIndex, "dinner", "");
                            } else if (val === "custom") {
                              if (MEAL_OPTIONS.includes(d.dinner || "")) {
                                updateDayField(dayIndex, "dinner", "");
                              }
                            } else {
                              updateDayField(dayIndex, "dinner", val);
                            }
                          }}
                          style={inlineSelectStyle}
                        >
                          <option value="">선택</option>
                          {MEAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="custom">직접입력</option>
                        </select>

                        {getMealSelectValue(d.dinner) === "custom" && (
                          <input
                            type="text"
                            value={d.dinner || ""}
                            onChange={(e) =>
                              updateDayField(dayIndex, "dinner", e.target.value)
                            }
                            placeholder="직접 입력"
                            style={{ ...inlineInputStyle, marginTop: 4 }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 호텔 정보 */}
                <div className="hotel-row">
                  <div className="hotel-label">호텔</div>
                  <div className="hotel-fields">
                    <div className="it-ro-input">
                      <input
                        type="text"
                        placeholder="한글명"
                        value={d.hotelKr || ""}
                        onChange={(e) =>
                          updateDayField(dayIndex, "hotelKr", e.target.value)
                        }
                        style={inlineInputStyle}
                      />
                    </div>
                    <div className="it-ro-input">
                      <input
                        type="text"
                        placeholder="영문명"
                        value={d.hotelEn || ""}
                        onChange={(e) =>
                          updateDayField(dayIndex, "hotelEn", e.target.value)
                        }
                        style={inlineInputStyle}
                      />
                    </div>
                    <div className="it-ro-input">
                      <input
                        type="text"
                        placeholder="성급"
                        value={d.hotelGrade || ""}
                        onChange={(e) =>
                          updateDayField(
                            dayIndex,
                            "hotelGrade",
                            e.target.value
                          )
                        }
                        style={inlineInputStyle}
                      />
                    </div>
                    <div className="it-ro-input">
                      <input
                        type="text"
                        placeholder="주소"
                        value={d.hotelAddress || ""}
                        onChange={(e) =>
                          updateDayField(
                            dayIndex,
                            "hotelAddress",
                            e.target.value
                          )
                        }
                        style={inlineInputStyle}
                      />
                    </div>
                    <div className="it-ro-input">
                      <input
                        type="text"
                        placeholder="홈페이지"
                        value={d.hotelHomepage || ""}
                        onChange={(e) =>
                          updateDayField(
                            dayIndex,
                            "hotelHomepage",
                            e.target.value
                          )
                        }
                        style={inlineInputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* 일차 삭제 버튼 (작게) */}
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn line small"
                    title="이 일차 삭제"
                    onClick={() => removeDay(dayIndex)}
                    style={{ minWidth: 32, padding: "0 10px" }}
                  >
                    일차 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="notice" style={{ marginTop: -4 }}>
        상기 일정은 항공 시간 및 현지 사정에 따라 일자의 순서 및 내용이 변경될
        수 있습니다.
      </p>

      {/* ===== 4. 하단 버튼 영역 ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <button
          type="button"
          className="btn line small"
          onClick={() => router.push(`/admin/itineraries/${initial.id}`)}
        >
          취소 (상세보기로)
        </button>
        <button type="submit" className="btn black small" disabled={saving}>
          {saving ? "저장 중..." : "수정 내용 저장"}
        </button>
      </div>
    </form>
  );
}
