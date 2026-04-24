// src/app/admin/itineraries/new/AdminItineraryNewClient.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { parsePnrText, PnrParsedSegment } from "@/lib/pnrParser";
import {
  getAirlineNameKo,
  getAirportNameKo,
  inferDestinationFromParsed,
} from "@/lib/airCodes";
import { COUNTRY_OPTIONS, CITY_OPTIONS_BY_COUNTRY } from "@/lib/travelLocations";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";
import { TiptapEditor } from "@/components/editor/TiptapEditor";

type Mode = "PNR" | "MANUAL";

type PnrSegment = {
  carrier: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDateTime: string;
  arrivalDateTime: string;
};

type ScheduleItem = {
  id: number;
  time: string;
  text: string;
};

type DayPlan = {
  day: number; // ✅ 일차만 사용
  region: string;
  transport: string;
  schedules: ScheduleItem[];
  breakfast: string;
  lunch: string;
  dinner: string;
  hotelKr: string;
  hotelEn: string;
  hotelGrade: string;
  hotelAddress: string;
};

const MEAL_OPTIONS = [
  "선택",
  "기내식",
  "현지식",
  "호텔식",
  "뷔페식",
  "한식",
  "불포함",
  "직접입력",
];

// 5분 단위 시간 리스트
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

const SAMPLE_PNR = [
  "—TST RLRD—",
  "RP/SELK1330Z/SELK1330Z WS/SU 18MAY17/0828Z V7GEYG",
  "3633 2304",
  "1PARK/TENGO MR",
  "2 KE 931 E 23MAY 2 ICNFOC HK1 1300 1925 23MAY E KE/ V7GEYG",
  "3 KE 932 E 28MAY 7 FOCICN HK1 2115 1540 29MAY E KE/ V7GEYG",
].join("\n");

// ---- 랜드 섹션 구조(여행사에도 그대로 적용) ----
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

function htmlToText(html: string) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

function pickCommonHtml(commonSections: CommonSection[], key: CommonKey) {
  return commonSections.find((s) => s.key === key)?.html ?? "";
}

// ---- 랜드 템플릿 리스트 타입 (드롭다운용) ----
type LandTemplateListItem = {
  _id: string;
  tripTitle?: string;
  destination?: string;
  duration?: string;
  summary?: string;
  createdAt?: string;
};

function convertParsedToSegments(parsed: PnrParsedSegment[]): PnrSegment[] {
  return parsed.map((p) => {
    const [yearStr, monthStr, dayStr] = p.date.split("-");
    const [depHStr, depMStr] = p.depTime.split(":");
    const [arrHStr, arrMStr] = p.arrTime.split(":");

    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const depH = Number(depHStr);
    const depM = Number(depMStr);
    const arrH = Number(arrHStr);
    const arrM = Number(arrMStr);

    const depDate = new Date(year, month - 1, day, depH, depM);
    let arrDate = new Date(year, month - 1, day, arrH, arrM);

    // ✅ 도착이 출발보다 이르면 익일 처리
    if (arrDate.getTime() <= depDate.getTime()) {
      arrDate.setDate(arrDate.getDate() + 1);
    }

    return {
      carrier: p.airline,
      flightNumber: p.flightNo.replace(p.airline, ""),
      departureAirport: p.from,
      arrivalAirport: p.to,
      departureDateTime: depDate.toISOString(),
      arrivalDateTime: arrDate.toISOString(),
    };
  });
}

function formatTimeLabel(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDurationText(dep: Date, arr: Date) {
  const diffMs = arr.getTime() - dep.getTime();
  if (diffMs <= 0) return "";
  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}시간`);
  if (m > 0) parts.push(`${m}분`);
  return parts.length ? `${parts.join(" ")} 소요` : "";
}

function fillCountryCityFromParsed(
  parsed: PnrParsedSegment[],
  setCountry: (v: string) => void,
  setCity: (v: string) => void
) {
  const inferred = inferDestinationFromParsed(parsed);
  if (!inferred) return;

  const { countryKo, cityKo } = inferred;

  setCountry(countryKo);
  const cityOptions = CITY_OPTIONS_BY_COUNTRY[countryKo];
  if (Array.isArray(cityOptions) && cityOptions.includes(cityKo)) {
    setCity(cityKo);
  } else {
    setCity(cityKo);
  }
}

/** ✅ LandItinerary 문서 형태 */
type LandItineraryDoc = {
  _id: string;
  tripTitle?: string;
  destination?: string;
  duration?: string;
  summary?: string;

  sectionsHtml?: Array<{
    key: string;
    title: string;
    enabled?: boolean;
    html?: string;
  }>;

  dayPlansV2?: Array<{
    day: number;
    region?: string;
    transport?: string;
    rows?: Array<{ id: string; time?: string; text?: string }>;
    breakfast?: string;
    lunch?: string;
    dinner?: string;

    hotelKr?: string;
    hotelEn?: string;
    hotelGrade?: string;
    hotelAddress?: string;
  }>;
};

function mapSectionsHtmlToAdminSections(doc: LandItineraryDoc) {
  const sections = Array.isArray(doc.sectionsHtml) ? doc.sectionsHtml : [];

  const common: CommonSection[] = COMMON.map((base) => {
    const found = sections.find((s) => s.key === base.key);
    return {
      key: base.key,
      title: base.title,
      html: String(found?.html ?? ""),
      fixed: true,
    };
  });

  const optional: OptionalSection[] = sections
    .filter((s) => typeof s?.key === "string" && s.key.startsWith("opt_"))
    .map((s) => ({
      id: String(s.key.replace(/^opt_/, "")) || makeId(),
      title: String(s.title ?? "선택 섹션"),
      html: String(s.html ?? ""),
    }));

  return { commonSections: common, optionalSections: optional };
}

function mapDayPlansV2ToAdminDayPlans(doc: LandItineraryDoc): DayPlan[] {
  const v2 = Array.isArray(doc.dayPlansV2) ? doc.dayPlansV2 : [];

  return v2.map((d, idx) => {
    const rows = Array.isArray(d.rows) ? d.rows : [];
    const schedules: ScheduleItem[] = rows.map((r, rIdx) => ({
      id: Date.now() + idx * 10000 + rIdx * 10,
      time: String(r?.time ?? ""),
      text: String(r?.text ?? ""),
    }));

    return {
      day: typeof d.day === "number" ? d.day : idx + 1,
      region: String(d?.region ?? ""),
      transport: String(d?.transport ?? ""),
      schedules: schedules.length
        ? schedules
        : [{ id: Date.now() + idx * 999, time: "", text: `${idx + 1}일차 일정` }],
      breakfast: String(d?.breakfast ?? "선택"),
      lunch: String(d?.lunch ?? "선택"),
      dinner: String(d?.dinner ?? "선택"),
      hotelKr: String(d?.hotelKr ?? ""),
      hotelEn: String(d?.hotelEn ?? ""),
      hotelGrade: String(d?.hotelGrade ?? ""),
      hotelAddress: String(d?.hotelAddress ?? ""),
    };
  });
}

function isMeaningfulText(v?: string) {
  return !!String(v ?? "").trim();
}

function normalizeMeal(v?: string) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "선택") return "";
  return s;
}

function appendSchedules(prevSchedules: ScheduleItem[], addSchedules: ScheduleItem[]) {
  const base = Array.isArray(prevSchedules) ? prevSchedules : [];
  const add = Array.isArray(addSchedules) ? addSchedules : [];
  if (!add.length) return base;

  return [
    ...base,
    ...add.map((s) => ({
      ...s,
      id: Date.now() + Math.floor(Math.random() * 1000000),
    })),
  ];
}

function mergeTemplateIntoDayPlans(prev: DayPlan[], tpl: DayPlan[]): DayPlan[] {
  if (!prev.length) return tpl;

  const byDay = new Map<number, DayPlan>();
  prev.forEach((d) => byDay.set(d.day, d));

  const merged = new Map<number, DayPlan>();
  prev.forEach((d) => merged.set(d.day, d));

  tpl.forEach((t) => {
    const cur = byDay.get(t.day);
    if (!cur) {
      merged.set(t.day, {
        ...t,
        schedules: appendSchedules([], t.schedules ?? []),
      });
      return;
    }

    const nextRegion = isMeaningfulText(t.region) ? t.region : cur.region;
    const nextTransport = isMeaningfulText(t.transport) ? t.transport : cur.transport;

    const tb = normalizeMeal(t.breakfast);
    const tl = normalizeMeal(t.lunch);
    const td = normalizeMeal(t.dinner);

    const nextBreakfast = tb ? tb : cur.breakfast;
    const nextLunch = tl ? tl : cur.lunch;
    const nextDinner = td ? td : cur.dinner;

    const nextSchedules = appendSchedules(cur.schedules ?? [], t.schedules ?? []);

    const nextHotelKr = isMeaningfulText(t.hotelKr) ? t.hotelKr : cur.hotelKr;
    const nextHotelEn = isMeaningfulText(t.hotelEn) ? t.hotelEn : cur.hotelEn;
    const nextHotelGrade = isMeaningfulText(t.hotelGrade) ? t.hotelGrade : cur.hotelGrade;
    const nextHotelAddress = isMeaningfulText(t.hotelAddress) ? t.hotelAddress : cur.hotelAddress;

    merged.set(t.day, {
      ...cur,
      region: nextRegion,
      transport: nextTransport,
      breakfast: nextBreakfast,
      lunch: nextLunch,
      dinner: nextDinner,
      schedules: nextSchedules,
      hotelKr: nextHotelKr,
      hotelEn: nextHotelEn,
      hotelGrade: nextHotelGrade,
      hotelAddress: nextHotelAddress,
    });
  });

  return Array.from(merged.values()).sort((a, b) => a.day - b.day);
}

function mergePnrIntoDayPlans(prev: DayPlan[], pnrBlocks: DayPlan[]): DayPlan[] {
  if (!prev.length) return pnrBlocks;

  const prevDays = new Set(prev.map((d) => d.day));

  const merged = prev.map((cur) => {
    const p = pnrBlocks.find((x) => x.day === cur.day);
    if (!p) return cur;
    return {
      ...cur,
      schedules: appendSchedules(cur.schedules ?? [], p.schedules ?? []),
    };
  });

  const extras = pnrBlocks
    .filter((p) => !prevDays.has(p.day))
    .map((p) => ({
      ...p,
      schedules: appendSchedules([], p.schedules ?? []),
    }));

  return [...merged, ...extras].sort((a, b) => a.day - b.day);
}

export default function AdminItineraryNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const flowId = searchParams.get("flowId");
  const customerId = searchParams.get("customerId");

  const [mode, setMode] = useState<Mode>("PNR");
  const [pnrText, setPnrText] = useState("");

  const [segments, setSegments] = useState<PnrSegment[]>([]);
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualDays, setManualDays] = useState<number>(0);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [managerName, setManagerName] = useState("");
  const [saving, setSaving] = useState(false);

  const [commonSections, setCommonSections] = useState<CommonSection[]>(() =>
    COMMON.map((s) => ({ ...s, html: "", fixed: true }))
  );

  const [optionalSections, setOptionalSections] = useState<OptionalSection[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");

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
    if (!t) {
      alert("섹션 제목을 입력하세요.");
      return;
    }
    setOptionalSections((prev) => [...prev, { id: makeId(), title: t, html: "" }]);
    setNewSectionTitle("");
  };

  const removeOptionalSection = (id: string) => {
    if (!confirm("이 선택 섹션을 삭제할까요?")) return;
    setOptionalSections((prev) => prev.filter((s) => s.id !== id));
  };

  const [draggingSchedule, setDraggingSchedule] = useState<{
    dayIndex: number;
    scheduleIndex: number;
  } | null>(null);

  const [tplLoading, setTplLoading] = useState(false);
  const [tplApplying, setTplApplying] = useState(false);
  const [tplItems, setTplItems] = useState<LandTemplateListItem[]>([]);
  const [tplSelectedId, setTplSelectedId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setTplLoading(true);
        const r = await fetch("/api/admin/land-itinerary-templates", { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (d?.ok && Array.isArray(d.items)) setTplItems(d.items ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setTplLoading(false);
      }
    })();
  }, []);

  function calcTripDays(pnrSegments: PnrSegment[]) {
    if (!pnrSegments.length) return null;

    const first = pnrSegments[0];
    const last = pnrSegments[pnrSegments.length - 1];

    const start = new Date(first.departureDateTime);
    const end = new Date(last.arrivalDateTime);

    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const days = diffDays + 1;
    const nights = days - 1;

    return { startDate, endDate, days, nights };
  }

  function buildDayPlansFromPnr(pnrSegments: PnrSegment[]): DayPlan[] {
    const trip = calcTripDays(pnrSegments);
    if (!trip) return [];

    const { startDate, days } = trip;
    const blocks: DayPlan[] = [];

    for (let i = 0; i < days; i++) {
      blocks.push({
        day: i + 1,
        region: "",
        transport: "",
        schedules: [],
        breakfast: "선택",
        lunch: "선택",
        dinner: "선택",
        hotelKr: "",
        hotelEn: "",
        hotelGrade: "",
        hotelAddress: "",
      });
    }

    function dayIndexForDate(dateStr: string) {
      const dt = new Date(dateStr);
      const d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const diffMs = d0.getTime() - startDate.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    pnrSegments.forEach((seg, segIdx) => {
      const dep = new Date(seg.departureDateTime);
      const arr = new Date(seg.arrivalDateTime);

      const depIdx = dayIndexForDate(seg.departureDateTime);
      const arrIdx = dayIndexForDate(seg.arrivalDateTime);

      const depTime = formatTimeLabel(dep);
      const arrTime = formatTimeLabel(arr);
      const durationText = formatDurationText(dep, arr);

      const depAirportLabel = getAirportNameKo(seg.departureAirport);
      const arrAirportLabel = getAirportNameKo(seg.arrivalAirport);
      const airlineLabel = getAirlineNameKo(seg.carrier);

      const depLineText = `${depAirportLabel} 출발 ${airlineLabel} ${seg.carrier}${seg.flightNumber}편${
        durationText ? ` (${durationText})` : ""
      }`;
      const arrLineText = `${arrAirportLabel} 도착`;

      if (depIdx >= 0 && depIdx < blocks.length) {
        blocks[depIdx].schedules.push({
          id: Date.now() + depIdx * 1000 + segIdx * 10,
          time: depTime,
          text: depLineText,
        });
      }
      if (arrIdx >= 0 && arrIdx < blocks.length) {
        blocks[arrIdx].schedules.push({
          id: Date.now() + arrIdx * 1000 + segIdx * 10 + 1,
          time: arrTime,
          text: arrLineText,
        });
      }
    });

    blocks.forEach((day, i) => {
      if (!day.schedules.length) {
        day.schedules.push({
          id: Date.now() + i * 1000 + 999,
          time: "",
          text: `${i + 1}일차 일정`,
        });
      }
    });

    return blocks;
  }

  function buildDayPlansManual(startDateStr: string, days: number): DayPlan[] {
    if (!startDateStr || !days || days <= 0) return [];

    const blocks: DayPlan[] = [];
    for (let i = 0; i < days; i++) {
      blocks.push({
        day: i + 1,
        region: "",
        transport: "",
        schedules: [{ id: Date.now() + i * 1000, time: "", text: `${i + 1}일차 일정` }],
        breakfast: "선택",
        lunch: "선택",
        dinner: "선택",
        hotelKr: "",
        hotelEn: "",
        hotelGrade: "",
        hotelAddress: "",
      });
    }
    return blocks;
  }

  /** ✅ 템플릿 merge */
  const applyLandTemplateToForm = async () => {
    if (!tplSelectedId) {
      alert("불러올 템플릿을 선택하세요.");
      return;
    }

    try {
      setTplApplying(true);

      const res = await fetch(
        `/api/admin/land-itinerary-templates/${encodeURIComponent(tplSelectedId)}`,
        { cache: "no-store" }
      );
      const d = await res.json().catch(() => null);

      if (!res.ok || !d?.ok || !d?.item) {
        alert(d?.error ?? "템플릿 불러오기 실패");
        return;
      }

      const item = d.item as LandItineraryDoc;

      if (String(item.tripTitle ?? "").trim()) setTitle(String(item.tripTitle ?? ""));
      if (String(item.summary ?? "").trim()) setDescription(String(item.summary ?? ""));

      const dest = String(item.destination ?? "");
      if (dest.includes("/")) {
        const [c1, c2] = dest.split("/").map((x) => x.trim());
        if (c1) setCountry(c1);
        if (c2) setCity(c2);
      }

      const { commonSections: c, optionalSections: o } = mapSectionsHtmlToAdminSections(item);
      setCommonSections(c);
      setOptionalSections(o);

      const tplPlans = mapDayPlansV2ToAdminDayPlans(item);
      setDayPlans((prev) => mergeTemplateIntoDayPlans(prev, tplPlans));

      alert(
        "템플릿이 기존 작성 내용에 '추가'로 반영되었습니다.\n- 지역/교통/식사: 템플릿 값이 있으면 템플릿으로 교체\n- 시간/일정: 기존 유지 + 아래로 추가"
      );
    } catch (e) {
      console.error(e);
      alert("템플릿 불러오기 중 오류가 발생했습니다.");
    } finally {
      setTplApplying(false);
    }
  };

  const handleFillSample = () => setPnrText(SAMPLE_PNR);

  const handlePnrConvert = () => {
    if (!pnrText.trim()) {
      alert("PNR 텍스트를 입력해주세요.");
      return;
    }

    const parsed = parsePnrText(pnrText);
    if (!parsed.length) {
      alert(
        "PNR에서 항공편 정보를 찾지 못했습니다.\nTOPAS / ABACUS 형태의 항공편 줄을 포함했는지 확인해주세요."
      );
      return;
    }

    const segs = convertParsedToSegments(parsed);
    setSegments(segs);

    fillCountryCityFromParsed(parsed, setCountry, setCity);

    const pnrBlocks = buildDayPlansFromPnr(segs);
    setDayPlans((prev) => mergePnrIntoDayPlans(prev, pnrBlocks));

    setMode("PNR");
  };

  const handleManualGenerate = () => {
    const blocks = buildDayPlansManual(manualStartDate, manualDays);
    if (!blocks.length) {
      alert("출발일과 여행일수를 올바르게 입력해주세요.");
      return;
    }

    setDayPlans(blocks);
    setMode("MANUAL");
  };

  const handleResetAll = () => {
    setPnrText("");
    setSegments([]);
    setManualStartDate("");
    setManualDays(0);
    setDayPlans([]);

    setTitle("");
    setDescription("");
    setCountry("");
    setCity("");

    setCommonSections(COMMON.map((s) => ({ ...s, html: "", fixed: true })));
    setOptionalSections([]);
    setNewSectionTitle("");

    setManagerName("");
    setMode("PNR");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("일정표 제목을 입력해주세요.");
      return;
    }
    if (!dayPlans.length) {
      alert("일차별 일정이 없습니다. PNR 또는 수동으로 일정을 생성해주세요.");
      return;
    }

    const includeText = htmlToText(pickCommonHtml(commonSections, "includes"));
    const excludeText = htmlToText(pickCommonHtml(commonSections, "excludes"));

    const payload = {
      title,
      description,
      country,
      city,
      includeText,
      excludeText,
      commonSections,
      optionalSections,
      managerName,
      mode,
      segments,
      days: dayPlans,
    };

    try {
      setSaving(true);

      const res = await fetch("/api/admin/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        alert((data && (data.message || data.error)) || "일정표 저장에 실패했습니다.");
        return;
      }

      const newId = data.itinerary._id as string;

      if (flowId) {
        const attachRes = await fetch(`/api/admin/onboarding/${flowId}/itinerary`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itineraryId: newId }),
        });

        const attachData = await attachRes.json().catch(() => null);
        if (!attachRes.ok || !attachData?.ok) {
          alert(attachData?.message || "체크리스트에 일정표를 연결하는 데 실패했습니다.");
          return;
        }

        alert("일정표가 저장되고, 해당 고객 체크리스트에 연결되었습니다.");

        if (customerId) {
          router.push(
            `/admin/customers/${customerId}/checklist?flowId=${encodeURIComponent(flowId)}`
          );
        } else {
          router.push(`/admin/itineraries/${newId}`);
        }
      } else {
        alert("일정표가 저장되었습니다.");
        router.push(`/admin/itineraries/${newId}`);
      }
    } catch (error) {
      console.error("save error:", error);
      alert("서버 오류로 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDayRegion = useCallback((dayIndex: number, value: string) => {
    setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, region: value } : d)));
  }, []);

  const handleUpdateDayTransport = useCallback((dayIndex: number, value: string) => {
    setDayPlans((prev) =>
      prev.map((d, idx) => (idx === dayIndex ? { ...d, transport: value } : d))
    );
  }, []);

  const handleAddSchedule = useCallback((dayIndex: number) => {
    setDayPlans((prev) =>
      prev.map((d, idx) =>
        idx === dayIndex
          ? { ...d, schedules: [...d.schedules, { id: Date.now(), time: "", text: "" }] }
          : d
      )
    );
  }, []);

  const handleUpdateSchedule = useCallback(
    (dayIndex: number, scheduleIndex: number, field: "time" | "text", value: string) => {
      setDayPlans((prev) =>
        prev.map((d, idx) => {
          if (idx !== dayIndex) return d;
          const newSchedules = d.schedules.map((s, sIdx) =>
            sIdx === scheduleIndex ? { ...s, [field]: value } : s
          );
          return { ...d, schedules: newSchedules };
        })
      );
    },
    []
  );

  const handleRemoveSchedule = useCallback((dayIndex: number, scheduleIndex: number) => {
    setDayPlans((prev) =>
      prev.map((d, idx) => {
        if (idx !== dayIndex) return d;
        const newSchedules = d.schedules.filter((_, sIdx) => sIdx !== scheduleIndex);
        return { ...d, schedules: newSchedules };
      })
    );
  }, []);

  const handleMealChange = useCallback(
    (dayIndex: number, kind: "breakfast" | "lunch" | "dinner", value: string) => {
      setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, [kind]: value } : d)));
    },
    []
  );

  const handleHotelChange = useCallback(
    (
      dayIndex: number,
      field: "hotelKr" | "hotelEn" | "hotelGrade" | "hotelAddress",
      value: string
    ) => {
      setDayPlans((prev) => prev.map((d, idx) => (idx === dayIndex ? { ...d, [field]: value } : d)));
    },
    []
  );

  const handleCopyHotelFromPrevious = useCallback((dayIndex: number) => {
    if (dayIndex === 0) return;
    setDayPlans((prev) =>
      prev.map((d, idx) =>
        idx === dayIndex
          ? {
              ...d,
              hotelKr: prev[dayIndex - 1].hotelKr,
              hotelEn: prev[dayIndex - 1].hotelEn,
              hotelGrade: prev[dayIndex - 1].hotelGrade,
              hotelAddress: prev[dayIndex - 1].hotelAddress,
            }
          : d
      )
    );
  }, []);

  const handleScheduleDragStart = useCallback((dayIndex: number, scheduleIndex: number) => {
    setDraggingSchedule({ dayIndex, scheduleIndex });
  }, []);

  const handleScheduleDragEnd = useCallback(() => setDraggingSchedule(null), []);

  const handleScheduleDrop = useCallback(
    (dayIndex: number, targetIndex: number) => {
      setDayPlans((prev) => {
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
    },
    [draggingSchedule]
  );

  const cityOptions = useMemo(
    () => (country ? CITY_OPTIONS_BY_COUNTRY[country] ?? [] : []),
    [country]
  );

  return (
    <div className="page">
      <AdminInnerTabs />

      <div className="wrap itinerary-wrap">
        <section className="it-card">
          <div className="it-card-header it-header-row">
            <div>
              <h2>랜드 템플릿 불러오기</h2>
              <p className="it-card-sub">
                템플릿을 선택하고 “불러오기”를 누르면, 기존 작성 내용에 “추가”로 합쳐집니다.
                (지역/교통/식사는 템플릿 값이 있으면 교체, 시간/일정은 아래로 추가)
              </p>
            </div>

            <div className="tpl-actions">
              <select
                className="tpl-select"
                value={tplSelectedId}
                onChange={(e) => setTplSelectedId(e.target.value)}
                disabled={tplLoading}
              >
                <option value="">{tplLoading ? "불러오는 중..." : "템플릿 선택"}</option>
                {tplItems.map((it) => (
                  <option key={it._id} value={it._id}>
                    {it.tripTitle || "제목 없음"}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn black"
                onClick={applyLandTemplateToForm}
                disabled={tplApplying || tplLoading}
              >
                {tplApplying ? "적용 중..." : "불러오기"}
              </button>
            </div>
          </div>
        </section>

        <section className="it-card pnr-card">
          <div className="it-card-header">
            <h2>PNR 변환기</h2>
            <p className="it-card-sub">
              PNR 코드를 붙여넣으시면 항공편 정보가 “기존 일정 아래로 추가”됩니다. (기존 내용 유지)
            </p>
          </div>

          <div className="pnr-flex-row">
            <div className="pnr-left">
              <div className="pnr-header">
                <span className="pnr-header-title">PNR 입력</span>
              </div>
              <textarea
                className="pnr-textarea"
                placeholder="TOPAS 또는 ABACUS의 PNR 코드를 붙여넣으세요."
                value={pnrText}
                onChange={(e) => setPnrText(e.target.value)}
              />
              <div className="pnr-footer">
                <button className="btn black" onClick={handlePnrConvert}>
                  입력함
                </button>
              </div>
            </div>

            <div className="pnr-right">
              <div className="pnr-header">
                <span className="pnr-header-title">샘플 PNR</span>
              </div>
              <textarea className="pnr-sample-area" value={SAMPLE_PNR} readOnly />
              <div className="pnr-footer">
                <button type="button" className="btn white" onClick={handleFillSample}>
                  SAMPLE
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="it-card">
          <div className="it-card-header it-header-row">
            <div>
              <h2>여행 일정표 만들기</h2>
              <p className="it-card-sub">
                기본 정보(제목/국가/도시/설명) 입력 후, 공통/선택 섹션과 일정표를 작성하세요.
              </p>
            </div>
            <div className="it-header-actions">
              <button className="btn white" type="button">
                엑셀로 다운로드
              </button>
              <button className="btn black" type="button">
                일정표 URL 생성
              </button>
            </div>
          </div>

          <div className="itinerary-top-row">
            <div className="top-left">
              <div className="field">
                <div className="field-line">
                  <span className="field-icon">📝</span>
                  <input
                    className="under-input"
                    type="text"
                    placeholder="일정표 제목"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="field field-desc">
                <div className="field-line">
                  <span className="field-icon">📄</span>
                  <textarea
                    className="under-input"
                    placeholder="설명 입력"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="top-country">
              <div className="field">
                <div className="field-line">
                  <span className="field-icon">🌍</span>
                  <select
                    className="under-select"
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setCity("");
                    }}
                  >
                    <option value="" disabled>
                      여행 국가
                    </option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <div className="field-line">
                  <span className="field-icon">🏙️</span>
                  <select
                    className="under-select"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!country}
                  >
                    <option value="" disabled>
                      여행 도시
                    </option>
                    {cityOptions.map((ct) => (
                      <option key={ct} value={ct}>
                        {ct}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="it-card">
          <div className="sec-head">
            <div className="sec-title">공통 섹션</div>
            <div className="sec-sub">포함/불포함/비자/비고는 고정 섹션입니다.</div>
          </div>

          <div className="sec-grid">
            {commonSections.map((s) => (
              <div key={s.key} className="sec-box">
                <div className="sec-box-head">
                  <div className="sec-box-title">{s.title}</div>
                </div>
                <TiptapEditor
                  value={s.html}
                  onChangeHTML={(html) => setCommonHtml(s.key, html)}
                  placeholder={`${s.title} 내용을 입력하세요`}
                  minHeight={120}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="it-card">
          <div className="sec-head">
            <div className="sec-title">선택 섹션</div>
            <div className="sec-sub">제목을 직접 입력해 섹션을 추가할 수 있습니다.</div>
          </div>

          <div className="add-row">
            <input
              className="input"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="추가할 섹션 제목 입력 (예: 허니문 특전, 선택 투어, 골프 옵션...)"
            />
            <button type="button" className="btn black" onClick={addOptionalSection}>
              + 추가
            </button>
          </div>

          <div style={{ height: 12 }} />

          {optionalSections.length === 0 ? (
            <div className="hint">아직 선택 섹션이 없습니다. 위에서 제목을 입력해 추가하세요.</div>
          ) : (
            <div className="sec-grid">
              {optionalSections.map((s) => (
                <div key={s.id} className="sec-box">
                  <div className="sec-box-head sec-box-head-edit">
                    <input
                      className="title-input"
                      value={s.title}
                      onChange={(e) => setOptionalTitle(s.id, e.target.value)}
                      placeholder="섹션 제목"
                    />
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeOptionalSection(s.id)}
                    >
                      삭제
                    </button>
                  </div>

                  <TiptapEditor
                    value={s.html}
                    onChangeHTML={(html) => setOptionalHtml(s.id, html)}
                    placeholder={`${s.title || "선택 섹션"} 내용을 입력하세요`}
                    minHeight={120}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="it-card">
          <div className="mode-section">
            <div className="mode-buttons">
              <button
                type="button"
                className={`mode-tab ${mode === "PNR" ? "active" : ""}`}
                onClick={() => setMode("PNR")}
              >
                PNR로 자동 생성
              </button>
              <button
                type="button"
                className={`mode-tab ${mode === "MANUAL" ? "active" : ""}`}
                onClick={() => setMode("MANUAL")}
              >
                수동으로 일정 생성
              </button>
            </div>

            {mode === "MANUAL" && (
              <div className="manual-form">
                <div className="field-inline">
                  <label>출발일</label>
                  <input
                    type="date"
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                  />
                </div>
                <div className="field-inline">
                  <label>여행일수</label>
                  <input
                    type="number"
                    min={1}
                    value={manualDays || ""}
                    onChange={(e) => setManualDays(Number(e.target.value || 0))}
                  />
                </div>
                <button type="button" className="btn black" onClick={handleManualGenerate}>
                  일정 자동 생성
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="it-card">
          <div className="days-section">
            <div className="days-table-header">
              <span>일차</span>
              <span>지역</span>
              <span>교통</span>
              <span>시간</span>
              <span>일정</span>
              <span>식사</span>
            </div>

            {dayPlans.length === 0 && (
              <p className="days-empty">PNR 변환 또는 수동 생성으로 일차별 일정을 먼저 생성해주세요.</p>
            )}

            {dayPlans.map((day, dayIndex) => (
              <DayBlockRow
                key={day.day}
                day={day}
                dayIndex={dayIndex}
                draggingSchedule={draggingSchedule}
                onChangeRegion={handleUpdateDayRegion}
                onChangeTransport={handleUpdateDayTransport}
                onAddSchedule={handleAddSchedule}
                onUpdateSchedule={handleUpdateSchedule}
                onRemoveSchedule={handleRemoveSchedule}
                onMealChange={handleMealChange}
                onHotelChange={handleHotelChange}
                onCopyHotelFromPrevious={handleCopyHotelFromPrevious}
                onScheduleDragStart={handleScheduleDragStart}
                onScheduleDragEnd={handleScheduleDragEnd}
                onScheduleDrop={handleScheduleDrop}
              />
            ))}

            <p className="notice">
              상기 일정은 항공 시간 및 현지 사정에 따라 일자의 순서 및 내용이 변경될 수 있습니다.
            </p>
          </div>
        </section>

        <section className="it-card bottom-card">
          <div className="bottom-section">
            <div className="field-inline">
              <label>상품담당자</label>
              <input
                type="text"
                placeholder="담당자명을 입력하세요."
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
            </div>
            <div className="bottom-buttons">
              <button type="button" className="btn white" onClick={handleResetAll}>
                내용 초기화
              </button>
              <button type="button" className="btn black" onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "일정표 저장"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .itinerary-wrap {
          max-width: 1100px;
          margin: 24px auto 40px;
        }
        .it-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 20px 22px;
          margin-bottom: 18px;
        }
        .it-card-header h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .it-card-sub {
          margin-top: 4px;
          font-size: 13px;
          color: #6b7280;
        }
        .it-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .it-header-actions {
          display: flex;
          gap: 8px;
        }

        .tpl-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tpl-select {
          height: 34px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          padding: 0 10px;
          min-width: 340px;
          max-width: 420px;
          background: #fff;
        }

        .pnr-flex-row {
          margin-top: 14px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .pnr-left,
        .pnr-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .pnr-header {
          margin-bottom: 6px;
        }
        .pnr-header-title {
          font-size: 13px;
          color: #4b5563;
        }
        .pnr-textarea,
        .pnr-sample-area {
          max-width: 100%;
          box-sizing: border-box;
          display: block;
          width: 100%;
          min-height: 180px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          padding: 10px 12px;
          font-size: 13px;
          resize: none;
        }

        .pnr-footer {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }

        .field {
          margin-bottom: 10px;
        }
        .field-line {
          display: flex;
          gap: 8px;
        }
        .field-icon {
          font-size: 16px;
          padding: 8px 2px;
          min-width: 20px;
          text-align: center;
        }
        .under-input,
        .under-select {
          flex: 1;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 2px 6px;
          font-size: 14px;
          background: transparent;
        }
        .under-input {
          resize: none;
        }
        .under-input:focus,
        .under-select:focus {
          outline: none;
          border-bottom-color: #111827;
        }
        .field-desc .under-input {
          min-height: 32px;
        }
        .field-inline {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 10px;
        }
        .field-inline input {
          border-radius: 8px;
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          font-size: 13px;
        }
        .itinerary-top-row {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 18px;
        }
        .top-country {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sec-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .sec-title {
          font-weight: 800;
          font-size: 15px;
          color: #0f172a;
        }
        .sec-sub {
          font-size: 12px;
          color: #64748b;
        }
        .sec-grid {
          display: grid;
          gap: 14px;
        }
        .sec-box {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 12px;
          background: #fff;
        }
        .sec-box-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .sec-box-head-edit {
          margin-bottom: 8px;
        }
        .sec-box-title {
          font-weight: 800;
          color: #0f172a;
        }
        .add-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
        }
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }
        .input:focus {
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
        }
        .hint {
          padding: 10px 12px;
          border: 1px dashed #e5e7eb;
          border-radius: 14px;
          color: #64748b;
          background: #fafafa;
          font-size: 13px;
        }
        .title-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 14px;
          font-weight: 800;
          outline: none;
          background: #fff;
          color: #0f172a;
        }
        .title-input:focus {
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
        }
        .danger {
          border: none;
          background: transparent;
          color: #ef4444;
          font-weight: 800;
          cursor: pointer;
          padding: 6px 8px;
        }
        .danger:hover {
          text-decoration: underline;
        }

        .mode-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mode-buttons {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          background: #f9fafb;
        }
        .mode-tab {
          border: none;
          background: transparent;
          padding: 7px 16px;
          font-size: 13px;
          cursor: pointer;
        }
        .mode-tab.active {
          background: #111827;
          color: #ffffff;
          border-radius: 999px;
        }
        .manual-form {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          margin-top: 4px;
        }

        :root {
          --it-row-height: 36px;
        }
        .days-section {
          margin-top: 4px;
        }

        .days-table-header {
          display: grid;
          grid-template-columns: 90px 140px 120px 120px 1fr 170px;
          font-size: 13px;
          font-weight: 600;
          border-bottom: 1px solid #111827;
          padding-bottom: 8px;
          column-gap: 8px;
        }

        .day-block-row {
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 0 14px;
        }

        .day-row-top {
          display: grid;
          grid-template-columns: 90px 140px 120px;
          align-items: start;
          column-gap: 8px;
        }

        .day-col .day-only {
          width: 80px;
          height: var(--it-row-height);
          border: 1px solid #d1d5db;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          background: #fff;
          font-size: 13px;
        }

        .region-col input,
        .transport-col input {
          width: 100%;
          height: var(--it-row-height);
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 10px;
          box-sizing: border-box;
          font-size: 13px;
        }

        .schedule-list {
          margin-top: 10px;
        }

        .schedule-item {
          display: grid;
          grid-template-columns: 120px 1fr 34px 28px;
          gap: 8px;
          align-items: center;
          min-height: var(--it-row-height);
          margin-bottom: 8px;
          border-radius: 10px;
          transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease,
            border-color 0.08s ease;
        }

        .schedule-time {
          height: var(--it-row-height);
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 10px;
          font-size: 13px;
          background: #fff;
        }

        .schedule-text {
          height: var(--it-row-height);
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 10px;
          font-size: 13px;
          box-sizing: border-box;
        }

        .schedule-del {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          color: #9ca3af;
          padding: 0 4px;
        }
        .schedule-del:hover {
          color: #ef4444;
        }

        .schedule-handle {
          font-size: 14px;
          color: #9ca3af;
          cursor: grab;
          padding: 0 4px;
          user-select: none;
        }

        .schedule-row {
          cursor: grab;
        }
        .schedule-row:active {
          cursor: grabbing;
        }

        .schedule-row.dragging {
          opacity: 0.95;
          background: #e5f0ff;
          border-radius: 12px;
          border: 1px solid #3b82f6;
          transform: translateX(4px) scale(1.02);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
        }

        .day-add-row {
          margin-top: 10px;
          display: flex;
          justify-content: center;
        }
        .day-add-btn {
          border-radius: 999px;
          border: 1px dashed #d1d5db;
          padding: 6px 18px;
          background: #f9fafb;
          cursor: pointer;
          font-size: 13px;
          width: 100%;
          max-width: 420px;
        }

        .meal-col {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meal-row {
          display: flex;
          align-items: center;
          gap: 6px;
          height: var(--it-row-height);
        }
        .meal-label {
          width: 30px;
          font-size: 12px;
          color: #4b5563;
        }
        .meal-row select {
          flex: 1;
          height: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 10px;
          font-size: 12px;
          background: #fff;
        }

        .hotel-row {
          margin-top: 15px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .hotel-label {
          width: 80px;
          font-size: 13px;
          font-weight: 700;
        }
        .hotel-fields {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .hotel-fields input {
          font-size: 12px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 6px 10px;
        }
        .hotel-copy-btn {
          align-self: center;
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          white-space: nowrap;
          cursor: pointer;
        }

        .days-empty {
          padding: 10px 0;
          font-size: 13px;
          color: #9ca3af;
        }
        .notice {
          margin-top: 10px;
          font-size: 12px;
          color: #6b7280;
        }

        @media (max-width: 640px) {
          .it-header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .tpl-actions {
            width: 100%;
          }
          .tpl-select {
            min-width: 0;
            max-width: none;
            width: 100%;
          }
          .pnr-card.it-card {
            padding: 14px 12px;
            width: 100%;
          }
          .pnr-flex-row {
            gap: 12px;
            margin-top: 10px;
          }
          .pnr-left,
          .pnr-right {
            width: 100%;
          }

          .pnr-textarea,
          .pnr-sample-area {
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
          }
          .pnr-footer {
            justify-content: stretch;
          }
          .pnr-footer .btn {
            width: 100%;
            min-width: 0;
            height: 40px;
            border-radius: 12px;
          }

          .itinerary-top-row {
            grid-template-columns: 1fr;
          }

          .days-table-header {
            display: none;
          }

          .day-block-row {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 14px 12px;
            background: #fff;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
            margin-bottom: 12px;
          }

          .day-row-top {
            grid-template-columns: 1fr;
            row-gap: 8px;
          }

          .day-col .day-only {
            width: fit-content;
            padding: 0 12px;
            border-radius: 999px;
            height: 34px;
            background: #f9fafb;
          }

          .region-col input,
          .transport-col input {
            height: 40px;
          }

          .schedule-item {
            grid-template-columns: 1fr 34px 28px;
            grid-template-areas:
              "time del handle"
              "text del handle";
            align-items: stretch;
            gap: 8px;
            padding: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            background: #fbfdff;
          }

          .schedule-time {
            grid-area: time;
            height: 38px;
          }
          .schedule-text {
            grid-area: text;
            height: 40px;
          }

          .schedule-del {
            grid-area: del;
            width: 34px;
            height: 34px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #fff;
            color: #6b7280;
          }

          .schedule-handle {
            grid-area: handle;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 34px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #fff;
            color: #6b7280;
          }

          .day-add-btn {
            max-width: none;
            padding: 10px 14px;
            border-radius: 12px;
          }

          .meal-col {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #e5e7eb;
          }
          .meal-row {
            height: auto;
          }
          .meal-row select {
            height: 38px;
            font-size: 13px;
          }

          .hotel-row {
            flex-direction: column;
            gap: 10px;
          }
          .hotel-label {
            width: auto;
          }
          .hotel-fields {
            grid-template-columns: 1fr;
          }
          .hotel-copy-btn {
            width: 100%;
            height: 38px;
          }
        }

        @media (max-width: 960px) {
          .tpl-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .tpl-select {
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          .tpl-actions .btn {
            width: 100%;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}

type DayBlockRowProps = {
  day: DayPlan;
  dayIndex: number;
  draggingSchedule: { dayIndex: number; scheduleIndex: number } | null;

  onChangeRegion: (dayIndex: number, value: string) => void;
  onChangeTransport: (dayIndex: number, value: string) => void;

  onAddSchedule: (dayIndex: number) => void;
  onUpdateSchedule: (
    dayIndex: number,
    scheduleIndex: number,
    field: "time" | "text",
    value: string
  ) => void;
  onRemoveSchedule: (dayIndex: number, scheduleIndex: number) => void;

  onMealChange: (dayIndex: number, kind: "breakfast" | "lunch" | "dinner", value: string) => void;

  onHotelChange: (
    dayIndex: number,
    field: "hotelKr" | "hotelEn" | "hotelGrade" | "hotelAddress",
    value: string
  ) => void;

  onCopyHotelFromPrevious: (dayIndex: number) => void;

  onScheduleDragStart: (dayIndex: number, scheduleIndex: number) => void;
  onScheduleDragEnd: () => void;
  onScheduleDrop: (dayIndex: number, targetIndex: number) => void;
};

const DayBlockRow = React.memo(function DayBlockRow({
  day,
  dayIndex,
  draggingSchedule,

  onChangeRegion,
  onChangeTransport,

  onAddSchedule,
  onUpdateSchedule,
  onRemoveSchedule,

  onMealChange,
  onHotelChange,
  onCopyHotelFromPrevious,

  onScheduleDragStart,
  onScheduleDragEnd,
  onScheduleDrop,
}: DayBlockRowProps) {
  return (
    <div className="day-block-row">
      <div className="day-row-top">
        <div className="day-col">
          <div className="day-only">{day.day}일차</div>
        </div>

        <div className="region-col">
          <input
            type="text"
            placeholder="예) 인천 → 푸꾸옥"
            value={day.region}
            onChange={(e) => onChangeRegion(dayIndex, e.target.value)}
          />
        </div>

        <div className="transport-col">
          <input
            type="text"
            placeholder="예) KE931 / 전용차량"
            value={day.transport}
            onChange={(e) => onChangeTransport(dayIndex, e.target.value)}
          />
        </div>
      </div>

      <div className="schedule-list">
        {day.schedules.map((s, scheduleIndex) => {
          const dragging =
            draggingSchedule &&
            draggingSchedule.dayIndex === dayIndex &&
            draggingSchedule.scheduleIndex === scheduleIndex;

          return (
            <div
              key={s.id}
              className={"schedule-item schedule-row" + (dragging ? " dragging" : "")}
              draggable
              onDragStart={() => onScheduleDragStart(dayIndex, scheduleIndex)}
              onDragEnd={onScheduleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onScheduleDrop(dayIndex, scheduleIndex)}
            >
              <select
                className="schedule-time"
                value={s.time}
                onChange={(e) => onUpdateSchedule(dayIndex, scheduleIndex, "time", e.target.value)}
              >
                <option value="">시간</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                className="schedule-text"
                type="text"
                placeholder="상세 일정 입력"
                value={s.text}
                onChange={(e) => onUpdateSchedule(dayIndex, scheduleIndex, "text", e.target.value)}
              />

              <button
                type="button"
                className="schedule-del"
                onClick={() => onRemoveSchedule(dayIndex, scheduleIndex)}
                aria-label="일정 삭제"
                title="삭제"
              >
                ×
              </button>

              <span className="schedule-handle" title="드래그로 순서 변경">
                ≡
              </span>
            </div>
          );
        })}

        <div className="day-add-row">
          <button type="button" className="day-add-btn" onClick={() => onAddSchedule(dayIndex)}>
            + 일정 추가하기
          </button>
        </div>
      </div>

      <div className="meal-col">
        <div className="meal-row">
          <span className="meal-label">조식</span>
          <select
            value={day.breakfast}
            onChange={(e) => onMealChange(dayIndex, "breakfast", e.target.value)}
          >
            {MEAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="meal-row">
          <span className="meal-label">중식</span>
          <select value={day.lunch} onChange={(e) => onMealChange(dayIndex, "lunch", e.target.value)}>
            {MEAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="meal-row">
          <span className="meal-label">석식</span>
          <select
            value={day.dinner}
            onChange={(e) => onMealChange(dayIndex, "dinner", e.target.value)}
          >
            {MEAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hotel-row">
        <div className="hotel-label">호텔</div>
        <div className="hotel-fields">
          <input
            type="text"
            placeholder="한글명"
            value={day.hotelKr}
            onChange={(e) => onHotelChange(dayIndex, "hotelKr", e.target.value)}
          />
          <input
            type="text"
            placeholder="영문명"
            value={day.hotelEn}
            onChange={(e) => onHotelChange(dayIndex, "hotelEn", e.target.value)}
          />
          <input
            type="text"
            placeholder="성급"
            value={day.hotelGrade}
            onChange={(e) => onHotelChange(dayIndex, "hotelGrade", e.target.value)}
          />
          <input
            type="text"
            placeholder="주소"
            value={day.hotelAddress}
            onChange={(e) => onHotelChange(dayIndex, "hotelAddress", e.target.value)}
          />
        </div>

        {dayIndex > 0 && (
          <button
            type="button"
            className="hotel-copy-btn"
            onClick={() => onCopyHotelFromPrevious(dayIndex)}
          >
            이전 일자와 동일
          </button>
        )}
      </div>
    </div>
  );
});
