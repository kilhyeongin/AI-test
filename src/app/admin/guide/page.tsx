// /src/app/admin/guide/page.tsx
"use client";

import Link from "next/link";
import { useState, useRef, ChangeEvent } from "react";

import { parsePnrText, PnrParsedSegment } from "@/lib/pnrParser";
import { COUNTRY_OPTIONS, CITY_OPTIONS_BY_COUNTRY } from "@/lib/travelLocations";
import {
  getAirlineNameKo,
  getAirportNameKo,
  inferDestinationFromParsed,
} from "@/lib/airCodes";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

/** PNR 파싱 후 이 페이지에서 쓰는 항공편 타입 */
type FlightSegment = {
  id: number;
  label?: string;
  airline: string;
  flightNo: string;
  depart: string;
  arrive: string;
  duration: string;
  date?: string;
  depTime?: string;
  arrTime?: string;
};

/** 미팅 시간 00:00~23:30 30분 단위 */
const MEETING_TIME_OPTIONS: string[] = (() => {
  const result: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      result.push(`${hh}:${mm}`);
    }
  }
  return result;
})();

/** 여행지 기본 정보(날씨/옷차림/환율/비자/시차/콘센트/입국신고서) */
type TravelDefaults = {
  weather: string;
  outfit: string;
  exchange: string;
  visa: string;
  time: string;
  plug: string;
  immigration: string;
};

function getTravelDefaults(countryKo: string): TravelDefaults | null {
  switch (countryKo) {
    case "일본":
      return {
        weather:
          "계절에 따라 다르지만, 봄/가을 기준 10~20℃ 내외로 일교차가 큽니다.",
        outfit:
          "얇은 겉옷 1~2벌과 편한 운동화, 실내·외 온도 차를 고려한 레이어드 복장을 추천드립니다.",
        exchange:
          "대략 1,000원 ≒ 100엔 수준으로 가정하고 안내하세요. 실제 환율은 출발 전 은행/환전소 기준으로 다시 확인해주세요.",
        visa:
          "대한민국 여권 기준, 관광 목적 90일 무비자 체류가 가능합니다. (정책은 수시로 변경될 수 있으니 출발 전 최신 정보를 확인해주세요.)",
        time: "한국과 시차가 없습니다. (모두 UTC+9)",
        plug:
          "A/B 타입, 100V 전압을 사용합니다. 대부분 전자기기는 사용 가능하나, 전압 100~240V 지원 여부를 확인해주세요.",
        immigration:
          "입국 시 자동게이트 또는 입국심사를 거치며, 입국 및 세관신고서 작성 여부는 항공사·시점에 따라 달라질 수 있습니다. 탑승 수속 시 다시 한 번 안내 받으세요.",
      };
    case "태국":
      return {
        weather:
          "연중 기온이 25~35℃ 정도로 덥고 습한 편입니다. 우기에는 스콜성 소나기가 자주 내립니다.",
        outfit:
          "가볍고 통풍이 좋은 반팔, 반바지, 샌들/슬리퍼 위주의 여름 옷차림을 추천드립니다. 실내 에어컨이 강하니 얇은 겉옷 1벌 정도 준비해주세요.",
        exchange:
          "대략 1,000원 ≒ 25~30바트 수준으로 가정하고 안내하세요. 실제 환율은 출발 전 환전소/은행 기준으로 확인해주세요.",
        visa:
          "대한민국 여권 기준, 일정 기간 무비자 혹은 도착비자 제도가 운영됩니다. 체류 가능 일수는 출발 전 대사관/외교부 공지를 확인해주세요.",
        time: "한국보다 2시간 느립니다. (예: 한국 12:00 → 태국 10:00)",
        plug:
          "A/C 타입, 220V 사용이 일반적입니다. 멀티어댑터를 준비하시면 대부분의 콘센트에서 사용 가능합니다.",
        immigration:
          "입국 시 입국심사를 진행하며, 경우에 따라 입국·출국카드 작성이 필요할 수 있습니다. 기내 또는 공항 안내에 따라 작성해 주세요.",
      };
    case "베트남":
      return {
        weather:
          "지역에 따라 다르지만, 하노이·다낭·호치민 모두 대체로 덥고 습한 아열대/열대 기후입니다.",
        outfit:
          "가벼운 여름 옷차림(반팔, 반바지, 샌들) 위주로 준비하시고, 일교차와 에어컨을 고려해 얇은 겉옷 1벌을 추가로 준비해주세요.",
        exchange:
          "대략 1,000원 ≒ 17,000~20,000동 수준으로 가정하고 안내하세요. 실제 환율은 출발 전 환전소 기준으로 확인해주세요.",
        visa:
          "대한민국 여권 기준, 일정 기간 무비자 입국 혹은 전자비자 제도가 운영 중입니다. 체류 가능 일수는 출발 전 반드시 최신 공지를 확인해주세요.",
        time: "한국보다 2시간 느립니다. (예: 한국 12:00 → 베트남 10:00)",
        plug:
          "A/C 타입 콘센트가 주로 사용되며, 220V 전압입니다. 멀티어댑터를 지참하시면 편리합니다.",
        immigration:
          "입국심사 시 전자비자 또는 비자 면제 여부에 따라 절차가 다를 수 있습니다. 기내에서 제공되는 입국신고서 및 세관신고서 안내를 따라주세요.",
      };
    case "인도네시아":
      return {
        weather:
          "발리를 포함한 대부분 지역이 연중 25~30℃의 고온다습한 열대기후입니다.",
        outfit:
          "통풍이 잘 되는 반팔, 반바지, 린넨류 등의 가벼운 옷과 슬리퍼·샌들을 추천드립니다. 사원 방문 시 소매 있는 상의와 긴 하의가 필요할 수 있습니다.",
        exchange:
          "대략 1,000원 ≒ 11,000~12,000루피아 수준으로 가정하고 안내하세요. 실제 환율은 출발 전 은행/환전소에서 확인해주세요.",
        visa:
          "한국인 대상 도착비자(VOA) 또는 전자비자(e-Visa) 제도가 운영됩니다. 체류 가능 일수와 비용은 출발 전 최신 정책을 확인해주세요.",
        time:
          "발리(덴파사르)는 한국보다 1시간 느립니다. (예: 한국 12:00 → 발리 11:00)",
        plug:
          "C/F 타입, 220V 전압을 사용합니다. 한국과 같은 220V이므로 멀티어댑터만 있으면 대부분 기기 사용이 가능합니다.",
        immigration:
          "입국 시 VOA 데스크 또는 전자비자 전용 카운터를 이용하며, 입국심사와 지문·사진 촬영이 있을 수 있습니다. 기내에서 제공하는 입국신고서 작성 안내를 따라주세요.",
      };
    case "이탈리아":
      return {
        weather:
          "지역·계절에 따라 다르지만, 봄/가을에는 10~20℃, 여름에는 25~35℃ 정도의 온화한 지중해성 기후입니다.",
        outfit:
          "봄/가을에는 얇은 겉옷과 긴팔 위주, 여름에는 가벼운 반팔·반바지와 선글라스, 모자를 추천드립니다.",
        exchange:
          "유로(EUR)를 사용하며, 대략 1,000원 ≒ 0.7~0.8유로 수준으로 가정하고 안내하세요. 실제 환율은 출발 전 환전소/은행 기준으로 확인해주세요.",
        visa:
          "대한민국 여권 기준, 쉥겐협정국 단기 관광(90일 이내) 무비자 입국이 가능합니다. 단, 여권 유효기간 등 입국 요건을 출발 전 확인해주세요.",
        time:
          "한국보다 8시간 느립니다. (예: 한국 20:00 → 이탈리아 12:00, 썸머타임 시 -7시간)",
        plug:
          "C/F/L 타입, 220V 전압을 사용합니다. 콘센트 모양이 달라 멀티어댑터는 필수로 준비하시는 것을 추천드립니다.",
        immigration:
          "쉥겐협정국 입국심사를 통과하며, 간단한 체류 목적·기간 확인을 받을 수 있습니다. 별도의 입국신고서는 없는 경우가 많지만, 세관신고 대상 물품이 있으면 세관신고서를 작성해야 합니다.",
      };
    default:
      return null;
  }
}

/** dep/arr 시간으로 단순 비행시간 계산 */
function calculateDuration(depTime: string, arrTime: string): string {
  if (!depTime || !arrTime) return "";

  const [dh, dm] = depTime.split(":").map((v) => parseInt(v, 10));
  const [ah, am] = arrTime.split(":").map((v) => parseInt(v, 10));

  if ([dh, dm, ah, am].some((n) => Number.isNaN(n))) return "";

  let depMinutes = dh * 60 + dm;
  let arrMinutes = ah * 60 + am;

  if (arrMinutes < depMinutes) {
    arrMinutes += 24 * 60;
  }

  const diff = arrMinutes - depMinutes;
  if (diff <= 0) return "";

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

/** 날짜+시간 한 줄 표기 */
function formatDateTime(date?: string, time?: string): string {
  const d = (date || "").trim();
  const t = (time || "").trim();
  if (!d && !t) return "";
  if (d && t) return `${d} ${t}`;
  return d || t;
}

/** 값이 있는 세그먼트인지 */
function hasSegmentValue(seg: FlightSegment): boolean {
  return (
    !!seg.airline ||
    !!seg.flightNo ||
    !!seg.depart ||
    !!seg.arrive ||
    !!seg.date ||
    !!seg.depTime ||
    !!seg.arrTime
  );
}

export default function AdminGuidePage() {
  // 상단: 로고 + 여행자 성명
  const [travelerName, setTravelerName] = useState("");
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null); // DB 저장용
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // 항공편 정보
  const [segments, setSegments] = useState<FlightSegment[]>([
    {
      id: 1,
      airline: "",
      flightNo: "",
      depart: "",
      arrive: "",
      duration: "",
      date: "",
      depTime: "",
      arrTime: "",
    },
    {
      id: 2,
      airline: "",
      flightNo: "",
      depart: "",
      arrive: "",
      duration: "",
      date: "",
      depTime: "",
      arrTime: "",
    },
    {
      id: 3,
      airline: "",
      flightNo: "",
      depart: "",
      arrive: "",
      duration: "",
      date: "",
      depTime: "",
      arrTime: "",
    },
    {
      id: 4,
      airline: "",
      flightNo: "",
      depart: "",
      arrive: "",
      duration: "",
      date: "",
      depTime: "",
      arrTime: "",
    },
    {
      id: 5,
      airline: "",
      flightNo: "",
      depart: "",
      arrive: "",
      duration: "",
      date: "",
      depTime: "",
      arrTime: "",
    },
  ]);

  const [pnrMode, setPnrMode] = useState<"pnr" | "manual">("pnr");
  const [pnrText, setPnrText] = useState("");
  const [pnrSample, setPnrSample] = useState(
    [
      "--- TST RLR RLP ---",
      "RP/SELK133OZ/SELK133OZ WS/SU 18MAY17/0828Z V76EYG",
      "3633-2304",
      "1.PARK/TENGO MR",
      "2 KE 931 E 23MAY 2 ICNFCO HK1 1320 1925 23MAY E KE/V76EYG",
      "3 KE 932 E 28MAY 7 FCOICN HK1 2115 1540 29MAY E KE/V76EYG",
    ].join("\n"),
  );

  // 공항 미팅 정보
  const [meetingPlace, setMeetingPlace] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingStaffName, setMeetingStaffName] = useState("");
  const [meetingStaffPhone, setMeetingStaffPhone] = useState("");

  // 현지 미팅 정보
  const [localBoardName, setLocalBoardName] = useState("");
  const [localStaffName, setLocalStaffName] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localEmergencyPhone, setLocalEmergencyPhone] = useState("");
  const [localImageFileName, setLocalImageFileName] =
    useState<string | null>(null);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<
    string | null
  >(null);
  const [localImageDataUrl, setLocalImageDataUrl] = useState<string | null>(
    null,
  ); // DB 저장용
  const localImageInputRef = useRef<HTMLInputElement | null>(null);

  // 여행 도시 정보
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  // 여행지 상세 정보
  const [weatherInfo, setWeatherInfo] = useState("");
  const [outfitInfo, setOutfitInfo] = useState("");
  const [exchangeInfo, setExchangeInfo] = useState("");
  const [immigrationInfo, setImmigrationInfo] = useState("");
  const [visaInfo, setVisaInfo] = useState("");
  const [localTimeInfo, setLocalTimeInfo] = useState("");
  const [plugInfo, setPlugInfo] = useState("");

  // 회사 정보
  const [companyName, setCompanyName] = useState("");
  const [companyDesc, setCompanyDesc] = useState("");

  // 체크인 정보
  const [checkinAirline, setCheckinAirline] = useState("");
  const [checkinTerminal, setCheckinTerminal] = useState("");

  // URL 생성 관련
  const [creatingUrl, setCreatingUrl] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const currentCityOptions = CITY_OPTIONS_BY_COUNTRY[country] ?? [];

  /** 여행지 정보 전체 리셋 */
  function resetTravelInfo() {
    setCountry("");
    setCity("");
    setWeatherInfo("");
    setOutfitInfo("");
    setExchangeInfo("");
    setImmigrationInfo("");
    setVisaInfo("");
    setLocalTimeInfo("");
    setPlugInfo("");
  }

  /** 특정 국가에 대한 기본 여행지 정보 적용 */
  function applyTravelDefaultsForCountry(countryKo: string) {
    const defaults = getTravelDefaults(countryKo);
    if (!defaults) return;
    setWeatherInfo(defaults.weather);
    setOutfitInfo(defaults.outfit);
    setExchangeInfo(defaults.exchange);
    setVisaInfo(defaults.visa);
    setLocalTimeInfo(defaults.time);
    setPlugInfo(defaults.plug);
    setImmigrationInfo(defaults.immigration);
  }

  // 로고 업로드
  function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);
    setLogoFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setLogoDataUrl(result); // DB에 저장할 Base64
      }
    };
    reader.readAsDataURL(file);
  }

  // 현지 미팅 이미지 업로드
  function onLocalImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl);
      setLocalImagePreviewUrl(null);
      setLocalImageFileName(null);
      setLocalImageDataUrl(null);
      return;
    }

    if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setLocalImagePreviewUrl(previewUrl);
    setLocalImageFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setLocalImageDataUrl(result); // DB에 저장할 Base64
      }
    };
    reader.readAsDataURL(file);
  }

  function updateSegment(
    id: number,
    field: keyof FlightSegment,
    value: string,
  ) {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  /** PNR 파싱 → 항공편 + 여행지 자동 세팅 */
  function applyPnrToSegmentsFromText(text: string) {
    const parsed = parsePnrText(text);
    if (!parsed.length) {
      return;
    }

    // 1) 항공편 세팅
    setSegments((prev) =>
      prev.map((seg, index) => {
        const p = parsed[index];

        if (!p) {
          return {
            ...seg,
            airline: "",
            flightNo: "",
            depart: "",
            arrive: "",
            duration: "",
            date: "",
            depTime: "",
            arrTime: "",
          };
        }

        const isoDate = p.date;
        const flightDuration = calculateDuration(p.depTime, p.arrTime);

        return {
          ...seg,
          airline: p.airline,
          flightNo: p.flightNo,
          depart: p.from,
          arrive: p.to,
          date: isoDate,
          depTime: p.depTime,
          arrTime: p.arrTime,
          duration: flightDuration,
        };
      }),
    );

    // 2) 여행지 자동 추론 + 여행지 정보 다시 세팅
    const inferred = inferDestinationFromParsed(parsed);

    if (inferred) {
      resetTravelInfo();
      setCountry(inferred.countryKo);
      setCity(inferred.cityKo);

      if (COUNTRY_OPTIONS.includes(inferred.countryKo)) {
        applyTravelDefaultsForCountry(inferred.countryKo);
      }
    } else {
      resetTravelInfo();
    }
  }

  /** PNR 영역만 초기화 (여행지 정보도 같이 초기화) */
  function clearPnrArea() {
    setPnrText("");
    setSegments((prev) =>
      prev.map((s) => ({
        ...s,
        airline: "",
        flightNo: "",
        depart: "",
        arrive: "",
        duration: "",
        date: "",
        depTime: "",
        arrTime: "",
      })),
    );
    resetTravelInfo();
  }

  /** 전체 입력 초기화 */
  function handleReset() {
    setTravelerName("");
    setLogoFileName(null);
    setLogoDataUrl(null);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);

    setSegments((prev) =>
      prev.map((s) => ({
        ...s,
        airline: "",
        flightNo: "",
        depart: "",
        arrive: "",
        duration: "",
        date: "",
        depTime: "",
        arrTime: "",
      })),
    );
    setPnrText("");

    setMeetingPlace("");
    setMeetingDate("");
    setMeetingTime("");
    setMeetingStaffName("");
    setMeetingStaffPhone("");

    setLocalBoardName("");
    setLocalStaffName("");
    setLocalPhone("");
    setLocalEmergencyPhone("");

    if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl);
    setLocalImagePreviewUrl(null);
    setLocalImageFileName(null);
    setLocalImageDataUrl(null);

    resetTravelInfo();

    setCompanyName("");
    setCompanyDesc("");
    setCheckinAirline("");
    setCheckinTerminal("");
    setGeneratedUrl(null);
  }

  function applySampleToPnr() {
    setPnrText(pnrSample);
    applyPnrToSegmentsFromText(pnrSample);
  }

  const anyFilledSegment = segments.some(hasSegmentValue);
  const previewSegments = anyFilledSegment
    ? segments.filter(hasSegmentValue)
    : segments;

  const meetingDateTimeDisplay =
    meetingDate && meetingTime
      ? `${meetingDate} ${meetingTime}`
      : meetingDate
      ? meetingDate
      : meetingTime || "예: 출발 3시간 전 / 07:30";

  /** URL 생성 (DB 저장 후 /guide/[id] 링크 생성) */
  async function handleCreateUrl() {
    try {
      setCreatingUrl(true);
      setGeneratedUrl(null);

      const payload = {
        travelerName: travelerName || "여행자",
        logoUrl: logoDataUrl ?? undefined,
        segments: segments.filter(hasSegmentValue),
        checkinAirline,
        checkinTerminal,
        meetingPlace,
        meetingDate,
        meetingTime,
        meetingStaffName,
        meetingStaffPhone,
        localBoardName,
        localStaffName,
        localPhone,
        localEmergencyPhone,
        localImageUrl: localImageDataUrl ?? undefined,
        country,
        city,
        weatherInfo,
        outfitInfo,
        exchangeInfo,
        immigrationInfo,
        visaInfo,
        localTimeInfo,
        plugInfo,
        companyName,
        companyDesc,
      };

      const res = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Failed to create guide", await res.text());
        alert("URL 생성 중 오류가 발생했습니다.");
        return;
      }

      const data = await res.json();
      console.log("GUIDE CREATE RESPONSE:", data);

      const id =
        data?._id ??
        data?.id ??
        data?.guide?._id ??
        data?.guide?.id ??
        data?.doc?._id ??
        data?.doc?.id;

      if (!id) {
        alert("생성된 가이드 ID를 찾을 수 없습니다. (응답 구조를 확인해 주세요)");
        return;
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/guide/${id}`;

      setGeneratedUrl(url);

      if (navigator.clipboard && url) {
        try {
          await navigator.clipboard.writeText(url);
          alert("URL이 생성되어 클립보드에 복사되었습니다.");
        } catch {
          alert("URL이 생성되었습니다. 아래 URL을 확인해 주세요.");
        }
      } else {
        alert("URL이 생성되었습니다. 아래 URL을 확인해 주세요.");
      }
    } catch (err) {
      console.error(err);
      alert("URL 생성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setCreatingUrl(false);
    }
  }

  return (
    <div>
      {/* 관리자 상단 탭 */}
      <AdminInnerTabs />

      {/* 기존 여행 안내 만들기 UI */}
      <div className="guide-page">
        {/* 상단 헤더 + URL 리스트 버튼 */}
        <div className="guide-head">
          <div className="guide-head-left">
            <h1 className="guide-page-title">여행 안내 만들기</h1>
            <p className="guide-page-sub">
              PNR를 붙여넣고 고객에게 보내는 여행 안내 페이지를 생성합니다.
            </p>
          </div>
          <div className="guide-head-right">
            <Link href="/admin/guide/list" className="btn-outline">
              URL 리스트 보기
            </Link>
          </div>
        </div>

        <div className="guide-layout">
          {/* 왼쪽 미리보기 */}
          <section className="guide-preview">
            <div className="preview-card">
              <header className="preview-header">
                <div className="preview-logo">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="로고 미리보기"
                      className="preview-logo-img"
                    />
                  ) : (
                    <span className="preview-logo-placeholder">로고 영역</span>
                  )}
                </div>
                <div className="preview-traveler">
                  <span className="preview-traveler-label">여행자 성명</span>
                  <span className="preview-traveler-name">
                    {travelerName || "홍길동"}
                  </span>
                </div>
              </header>

              {/* 항공편 정보 */}
              <div className="preview-section">
                <h3 className="preview-title">항공편 정보</h3>
                {previewSegments.map((seg, idx) => {
                  const airlineDisplay = seg.airline
                    ? getAirlineNameKo(seg.airline)
                    : "";
                  const departDisplay = seg.depart
                    ? getAirportNameKo(seg.depart)
                    : "";
                  const arriveDisplay = seg.arrive
                    ? getAirportNameKo(seg.arrive)
                    : "";

                  const depDateTime = formatDateTime(seg.date, seg.depTime);
                  const arrDateTime = formatDateTime(seg.date, seg.arrTime);

                  return (
                    <div key={seg.id} className="preview-flight-block">
                      <div className="preview-row">
                        <span className="preview-label">항공사</span>
                        <span className="preview-value">
                          {airlineDisplay || "항공사"}
                        </span>
                      </div>
                      <div className="preview-row">
                        <span className="preview-label">편명</span>
                        <span className="preview-value">
                          {seg.flightNo || "편명"}
                        </span>
                      </div>
                      <div className="preview-row">
                        <span className="preview-label">출발지</span>
                        <span className="preview-value">
                          {departDisplay || "출발지"}
                        </span>
                      </div>
                      <div className="preview-row">
                        <span className="preview-label">도착지</span>
                        <span className="preview-value">
                          {arriveDisplay || "도착지"}
                        </span>
                      </div>
                      <div className="preview-row">
                        <span className="preview-label">출발</span>
                        <span className="preview-value">
                          {depDateTime || "출발일시"}
                        </span>
                      </div>
                      <div className="preview-row">
                        <span className="preview-label">도착</span>
                        <span className="preview-value">
                          {arrDateTime || "도착일시"}
                        </span>
                      </div>
                      <div className="preview-row">
                        <span className="preview-label">비행시간</span>
                        <span className="preview-value">
                          {seg.duration || "비행시간"}
                        </span>
                      </div>
                      {idx < previewSegments.length - 1 && (
                        <div className="preview-divider" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 체크인 카운터 */}
              <div className="preview-section">
                <h3 className="preview-title">체크인 카운터</h3>
                <div className="preview-row">
                  <span className="preview-label">항공사</span>
                  <span className="preview-value">
                    {checkinAirline || "Korean Air"}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">항공 터미널</span>
                  <span className="preview-value">
                    {checkinTerminal ||
                      "인천국제공항 제2여객터미널 A,B,D,E,G"}
                  </span>
                </div>
              </div>

              {/* 탑승 게이트 찾기 */}
              <div className="preview-section">
                <h3 className="preview-title">탑승 게이트 찾기</h3>
                <div className="preview-row">
                  <span className="preview-label">위치찾기</span>
                  <span className="preview-value">
                    공항 전광판 및 앱 참고
                  </span>
                </div>
              </div>

              {/* 공항 미팅 장소 */}
              <div className="preview-section">
                <h3 className="preview-title">공항 미팅 장소</h3>
                <div className="preview-row">
                  <span className="preview-label">미팅 장소</span>
                  <span className="preview-value">
                    {meetingPlace || "인천공항 체크인 카운터 인근"}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">미팅 일시</span>
                  <span className="preview-value">
                    {meetingDateTimeDisplay}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">담당자</span>
                  <span className="preview-value">
                    {meetingStaffName || "공항 미팅 담당자"}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">연락처</span>
                  <span className="preview-value">
                    {meetingStaffPhone || "예: 010-0000-0000"}
                  </span>
                </div>
              </div>

              {/* 현지 미팅 정보 */}
              <div className="preview-section">
                <h3 className="preview-title">현지 미팅 정보</h3>
                <div className="preview-row">
                  <span className="preview-label">미팅 피켓명</span>
                  <span className="preview-value">
                    {localBoardName || "공항 피켓에 표시될 이름"}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">담당자</span>
                  <span className="preview-value">
                    {localStaffName || "현지 담당자 이름"}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">연락처</span>
                  <span className="preview-value">
                    {localPhone || "현지 담당자 연락처"}
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">비상 연락처</span>
                  <span className="preview-value">
                    {localEmergencyPhone || "긴급 상황 연락처"}
                  </span>
                </div>
                {localImagePreviewUrl && (
                  <div className="preview-local-image-wrap">
                    <img
                      src={localImagePreviewUrl}
                      alt="현지 미팅 장소/피켓"
                      className="preview-local-image"
                    />
                  </div>
                )}
              </div>

              {/* 여행지 / 입국 / 시간 / 콘센트 카드형 */}
              <div className="preview-section">
                <h3 className="preview-title">여행지 정보</h3>

                <div className="travel-destination-chip">
                  {country || city ? (
                    <>
                      <span>{country || "여행 국가 미정"}</span>
                      {city && (
                        <span className="travel-destination-dot">·</span>
                      )}
                      {city && <span>{city}</span>}
                    </>
                  ) : (
                    <span>여행지 미정</span>
                  )}
                </div>

                <div className="travel-info-stack">
                  <div className="travel-info-card">
                    <div className="travel-info-icon">🌤️</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">
                        현재 날씨 · 기온
                      </div>
                      <div className="travel-info-text">
                        {weatherInfo ||
                          "여행 시기 기준 평균 기온과 날씨 정보를 확인해주세요."}
                      </div>
                    </div>
                  </div>

                  <div className="travel-info-card">
                    <div className="travel-info-icon">👕</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">옷차림 정보</div>
                      <div className="travel-info-text">
                        {outfitInfo ||
                          "추천 복장, 겉옷/신발 등 여행지에 적합한 복장을 안내드립니다."}
                      </div>
                    </div>
                  </div>

                  <div className="travel-info-card">
                    <div className="travel-info-icon">💱</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">현지 환율</div>
                      <div className="travel-info-text">
                        {exchangeInfo ||
                          "1,000원 기준 대략적인 환율과 환전 팁을 확인해주세요."}
                      </div>
                    </div>
                  </div>

                  <div className="travel-info-divider" />

                  <div className="travel-info-card">
                    <div className="travel-info-icon">📄</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">입국신고서 안내</div>
                      <div className="travel-info-text">
                        {immigrationInfo ||
                          "입국·세관신고서 작성 여부 및 작성 방법을 확인해주세요."}
                      </div>
                    </div>
                  </div>

                  <div className="travel-info-card">
                    <div className="travel-info-icon">🛂</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">비자 정보</div>
                      <div className="travel-info-text">
                        {visaInfo ||
                          "무비자/비자 필요 여부와 체류 가능 일수를 출국 전 꼭 확인해주세요."}
                      </div>
                    </div>
                  </div>

                  <div className="travel-info-card">
                    <div className="travel-info-icon">🕒</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">
                        현지 시간 · 시차
                      </div>
                      <div className="travel-info-text">
                        {localTimeInfo ||
                          "한국 기준 몇 시간 빠른지/느린지, 시차 정보를 안내드립니다."}
                      </div>
                    </div>
                  </div>

                  <div className="travel-info-card">
                    <div className="travel-info-icon">🔌</div>
                    <div className="travel-info-body">
                      <div className="travel-info-label">콘센트 · 전압</div>
                      <div className="travel-info-text">
                        {plugInfo ||
                          "콘센트 타입, 전압, 멀티어댑터 필요 여부를 확인해주세요."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 준비물/금지품 버튼 */}
              <div className="preview-section">
                <h3 className="preview-title">여행준비물 · 기내 반입 금지품</h3>
                <div className="preview-buttons-row">
                  <button className="preview-link-btn">준비물 보기</button>
                  <button className="preview-link-btn">금지품 보기</button>
                </div>
              </div>
            </div>
          </section>

          {/* 오른쪽 입력 폼 */}
          <section className="guide-form">
            {/* 페이지 상단 */}
            <div className="form-card">
              <h2 className="form-title">페이지 상단</h2>
              <div className="form-row">
                <label className="form-label">로고 업로드</label>
                <div className="form-field">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={onLogoChange}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    로고 선택
                  </button>
                  {logoFileName && (
                    <div className="file-name">{logoFileName}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">여행자 성명</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    placeholder="여행자 이름을 입력하세요."
                  />
                </div>
              </div>
            </div>

            {/* 항공편 정보 */}
            <div className="form-card">
              <h2 className="form-title">항공편 정보</h2>
              <div className="form-row">
                <label className="form-label">입력 방식</label>
                <div className="form-field">
                  <label className="radio">
                    <input
                      type="radio"
                      name="pnrMode"
                      value="pnr"
                      checked={pnrMode === "pnr"}
                      onChange={() => setPnrMode("pnr")}
                    />
                    <span>PNR 변환</span>
                  </label>
                  <label className="radio">
                    <input
                      type="radio"
                      name="pnrMode"
                      value="manual"
                      checked={pnrMode === "manual"}
                      onChange={() => setPnrMode("manual")}
                    />
                    <span>직접 입력</span>
                  </label>
                </div>
              </div>

              <div className="form-row pnr-row">
                <div className="form-col">
                  <div className="field-label-small">PNR 입력</div>
                  <div className="pnr-textarea-wrap">
                    <textarea
                      className="textarea"
                      rows={7}
                      value={pnrText}
                      onChange={(e) => setPnrText(e.target.value)}
                      placeholder="GDS PNR 화면에서 복사한 텍스트를 붙여넣으세요."
                    />
                    {pnrText && (
                      <button
                        type="button"
                        className="pnr-clear-btn"
                        onClick={clearPnrArea}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ marginTop: 6 }}
                    onClick={() => applyPnrToSegmentsFromText(pnrText)}
                  >
                    PNR 분석하기
                  </button>
                </div>

                <div className="form-col">
                  <div className="field-label-small">SAMPLE</div>
                  <textarea
                    className="textarea"
                    rows={7}
                    value={pnrSample}
                    onChange={(e) => setPnrSample(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ marginTop: 6 }}
                    onClick={applySampleToPnr}
                  >
                    SAMPLE 입력 적용
                  </button>
                </div>
              </div>

              <div className="form-subtitle">
                PNR 텍스트에서 자동으로 추출된 항공편 정보입니다. (필요하면
                오른쪽 칸을 직접 수정하셔도 됩니다.)
              </div>

              <div className="segment-table">
                <div className="segment-header">
                  <span>항공사</span>
                  <span>출발도시 · 도착도시</span>
                  <span>탑승편명</span>
                  <span>탑승날짜</span>
                  <span>비행시간</span>
                </div>
                {segments.map((seg) => (
                  <div key={seg.id} className="segment-row">
                    <input
                      className="input small"
                      placeholder="항공사 코드 (예: KE)"
                      value={seg.airline}
                      onChange={(e) =>
                        updateSegment(seg.id, "airline", e.target.value)
                      }
                      disabled={pnrMode === "pnr"}
                    />
                    <div className="segment-city">
                      <input
                        className="input small"
                        placeholder="출발 공항 코드 (예: ICN)"
                        value={seg.depart}
                        onChange={(e) =>
                          updateSegment(seg.id, "depart", e.target.value)
                        }
                        disabled={pnrMode === "pnr"}
                      />
                      <span className="segment-dot">·</span>
                      <input
                        className="input small"
                        placeholder="도착 공항 코드 (예: FCO)"
                        value={seg.arrive}
                        onChange={(e) =>
                          updateSegment(seg.id, "arrive", e.target.value)
                        }
                        disabled={pnrMode === "pnr"}
                      />
                    </div>
                    <input
                      className="input small"
                      placeholder="편명 (예: KE931)"
                      value={seg.flightNo}
                      onChange={(e) =>
                        updateSegment(seg.id, "flightNo", e.target.value)
                      }
                      disabled={pnrMode === "pnr"}
                    />
                    <input
                      className="input small"
                      placeholder="예: 2026-05-23"
                      value={seg.date || ""}
                      onChange={(e) =>
                        updateSegment(seg.id, "date", e.target.value)
                      }
                      disabled={pnrMode === "pnr"}
                    />
                    <input
                      className="input small"
                      placeholder="예: 6시간 30분"
                      value={seg.duration}
                      onChange={(e) =>
                        updateSegment(seg.id, "duration", e.target.value)
                      }
                      disabled={pnrMode === "pnr"}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 공항 미팅 장소 */}
            <div className="form-card">
              <h2 className="form-title">공항 미팅 장소</h2>

              <div className="form-row">
                <label className="form-label">미팅 장소</label>
                <div className="form-field">
                  <select
                    className="input"
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                  >
                    <option value="">선택하세요</option>
                    <optgroup label="인천공항 제1여객터미널">
                      <option value="인천공항 제1터미널 A">
                        제1터미널 A
                      </option>
                      <option value="인천공항 제1터미널 B">
                        제1터미널 B
                      </option>
                      <option value="인천공항 제1터미널 C">
                        제1터미널 C
                      </option>
                      <option value="인천공항 제1터미널 D">
                        제1터미널 D
                      </option>
                      <option value="인천공항 제1터미널 E">
                        제1터미널 E
                      </option>
                      <option value="인천공항 제1터미널 F">
                        제1터미널 F
                      </option>
                      <option value="인천공항 제1터미널 G">
                        제1터미널 G
                      </option>
                      <option value="인천공항 제1터미널 H">
                        제1터미널 H
                      </option>
                      <option value="인천공항 제1터미널 J">
                        제1터미널 J
                      </option>
                      <option value="인천공항 제1터미널 K">
                        제1터미널 K
                      </option>
                      <option value="인천공항 제1터미널 L">
                        제1터미널 L
                      </option>
                      <option value="인천공항 제1터미널 M">
                        제1터미널 M
                      </option>
                      <option value="인천공항 제1터미널 N">
                        제1터미널 N
                      </option>
                    </optgroup>
                    <optgroup label="인천공항 제2여객터미널">
                      <option value="인천공항 제2터미널 A">
                        제2터미널 A
                      </option>
                      <option value="인천공항 제2터미널 B">
                        제2터미널 B
                      </option>
                      <option value="인천공항 제2터미널 C">
                        제2터미널 C
                      </option>
                      <option value="인천공항 제2터미널 D">
                        제2터미널 D
                      </option>
                      <option value="인천공항 제2터미널 E">
                        제2터미널 E
                      </option>
                      <option value="인천공항 제2터미널 F">
                        제2터미널 F
                      </option>
                      <option value="인천공항 제2터미널 G">
                        제2터미널 G
                      </option>
                      <option value="인천공항 제2터미널 H">
                        제2터미널 H
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">미팅 일시</label>
                <div className="form-field meeting-datetime">
                  <input
                    type="date"
                    className="input"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                  <select
                    className="input"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  >
                    <option value="">시간 선택</option>
                    {MEETING_TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">담당자 성명</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={meetingStaffName}
                    onChange={(e) => setMeetingStaffName(e.target.value)}
                    placeholder="공항 미팅 담당자"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">연락처</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={meetingStaffPhone}
                    onChange={(e) => setMeetingStaffPhone(e.target.value)}
                    placeholder="예: 010-0000-0000"
                  />
                </div>
              </div>
            </div>

            {/* 현지 미팅 정보 */}
            <div className="form-card">
              <h2 className="form-title">현지 미팅 정보</h2>
              <div className="form-row form-row-split">
                <div className="form-col">
                  <label className="form-label">미팅 피켓명</label>
                  <div className="form-field">
                    <input
                      className="input"
                      value={localBoardName}
                      onChange={(e) => setLocalBoardName(e.target.value)}
                      placeholder="공항 피켓에 표시될 이름"
                    />
                  </div>
                </div>
                <div className="form-col">
                  <label className="form-label">
                    현지 미팅 피켓/장소 이미지 업로드
                  </label>
                  <div className="form-field">
                    <input
                      ref={localImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={onLocalImageChange}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => localImageInputRef.current?.click()}
                    >
                      이미지 선택
                    </button>
                    {localImageFileName && (
                      <div className="file-name">{localImageFileName}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">담당자 성명</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={localStaffName}
                    onChange={(e) => setLocalStaffName(e.target.value)}
                    placeholder="현지 담당자 이름"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">연락처</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="현지 담당자 연락처"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">비상 연락처</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={localEmergencyPhone}
                    onChange={(e) =>
                      setLocalEmergencyPhone(e.target.value)
                    }
                    placeholder="긴급 상황 연락처"
                  />
                </div>
              </div>
            </div>

            {/* 여행 도시 선택 */}
            <div className="form-card">
              <h2 className="form-title">여행 도시 선택</h2>

              <div className="form-row">
                <label className="form-label">여행 국가명</label>
                <div className="form-field">
                  <select
                    className="input"
                    value={country}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!next) {
                        resetTravelInfo();
                        return;
                      }
                      resetTravelInfo();
                      setCountry(next);
                      applyTravelDefaultsForCountry(next);
                    }}
                  >
                    <option value="">선택하세요</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">여행 도시명</label>
                <div className="form-field">
                  {currentCityOptions.length > 0 && (
                    <select
                      className="input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{ marginBottom: 6 }}
                    >
                      <option value="">도시를 선택하세요</option>
                      {currentCityOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    className="input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={
                      currentCityOptions.length > 0
                        ? "리스트에 없는 도시는 직접 입력하세요."
                        : "예: 발리, 방콕, 도쿄 등"
                    }
                  />
                </div>
              </div>
            </div>

            {/* 여행지 정보 입력 */}
            <div className="form-card">
              <h2 className="form-title">여행지 정보</h2>

              <div className="form-row">
                <label className="form-label">현재 날씨</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={weatherInfo}
                    onChange={(e) => setWeatherInfo(e.target.value)}
                    placeholder="예: 평균 기온, 강수량, 우기/건기 여부 등"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">옷차림 정보</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={outfitInfo}
                    onChange={(e) => setOutfitInfo(e.target.value)}
                    placeholder="예: 반팔/반바지, 얇은 겉옷 1~2벌, 샌들/운동화 등"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">여행지 환율</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={exchangeInfo}
                    onChange={(e) => setExchangeInfo(e.target.value)}
                    placeholder="예: 1,000원 ≒ xx 현지통화 (실제 환율은 출국 전 확인)"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">입국신고서 안내</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={immigrationInfo}
                    onChange={(e) => setImmigrationInfo(e.target.value)}
                    placeholder="입국·세관신고서 작성 여부, 작성 요령 등"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">비자정보</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={visaInfo}
                    onChange={(e) => setVisaInfo(e.target.value)}
                    placeholder="무비자 / 비자 필요 여부, 체류 가능 일수 등"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">현지 시간</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={localTimeInfo}
                    onChange={(e) => setLocalTimeInfo(e.target.value)}
                    placeholder="예: 한국 기준 -1시간 / +2시간 등"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">콘센트/전압</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={plugInfo}
                    onChange={(e) => setPlugInfo(e.target.value)}
                    placeholder="예: C/F타입, 220V, 멀티어댑터 필요 등"
                  />
                </div>
              </div>
            </div>

            {/* 회사 정보 */}
            <div className="form-card">
              <h2 className="form-title">회사 정보</h2>
              <div className="form-row">
                <label className="form-label">회사명</label>
                <div className="form-field">
                  <input
                    className="input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="회사명을 입력하세요."
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">회사 설명</label>
                <div className="form-field">
                  <textarea
                    className="textarea"
                    rows={3}
                    value={companyDesc}
                    onChange={(e) => setCompanyDesc(e.target.value)}
                    placeholder="여행사 소개, 연락처, 운영시간 등"
                  />
                </div>
              </div>
            </div>

            {/* 전체 초기화 + URL 생성 */}
            <div className="form-actions">
              {generatedUrl && (
                <div className="generated-url">
                  <div className="generated-url-label">생성된 고객용 URL</div>
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="generated-url-link"
                  >
                    {generatedUrl}
                  </a>
                </div>
              )}
              <div className="form-actions-buttons">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleReset}
                >
                  입력 내용 전체 초기화
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCreateUrl}
                  disabled={creatingUrl}
                >
                  {creatingUrl ? "URL 생성 중..." : "URL 생성"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <style jsx>{`
          .guide-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f3f4f6;
            color: #111827;
          }
          .guide-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
            gap: 16px;
          }
          @media (max-width: 960px) {
            .guide-layout {
              grid-template-columns: 1fr;
            }
          }
          .guide-preview {
            position: sticky;
            top: 12px;
            align-self: flex-start;
          }
          @media (max-width: 960px) {
            .guide-preview {
              position: static;
            }
          }
          .preview-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 16px 14px 18px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            border: 1px solid #e5e7eb;
            font-size: 13px;
          }
          .preview-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .preview-logo {
            min-width: 130px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
          }
          .preview-logo-img {
            width: 130px;
            height: auto;
            object-fit: contain;
            display: block;
          }
          .preview-logo-placeholder {
            font-size: 11px;
            color: #9ca3af;
          }
          .preview-traveler {
            text-align: right;
          }
          .preview-traveler-label {
            display: block;
            font-size: 11px;
            color: #6b7280;
          }
          .preview-traveler-name {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
          }
          .preview-section {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
          }
          .preview-title {
            font-size: 13px;
            font-weight: 700;
            margin: 0 0 6px;
            color: #111827;
          }
          .preview-flight-block + .preview-flight-block {
            margin-top: 10px;
          }
          .preview-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 2px;
          }
          .preview-label {
            color: #6b7280;
          }
          .preview-value {
            color: #111827;
            font-weight: 500;
            text-align: right;
          }
          .preview-divider {
            margin-top: 6px;
            border-top: 1px dashed #e5e7eb;
          }
          .preview-buttons-row {
            display: flex;
            gap: 8px;
          }
          .preview-link-btn {
            flex: 1;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            font-size: 12px;
            cursor: pointer;
          }
          .preview-local-image-wrap {
            margin-top: 8px;
          }
          .preview-local-image {
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .travel-info-stack {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .travel-info-card {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
          }
          .travel-info-icon {
            width: 32px;
            height: 32px;
            border-radius: 999px;
            background: #eef2ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          }
          .travel-info-body {
            flex: 1;
          }
          .travel-info-label {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 2px;
          }
          .travel-info-text {
            font-size: 12px;
            color: #111827;
            line-height: 1.45;
            white-space: pre-line;
          }
          .travel-info-divider {
            height: 1px;
            background: #e5e7eb;
            margin: 4px 0;
          }
          .travel-destination-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            margin-bottom: 6px;
            border-radius: 999px;
            background: #eef2ff;
            color: #1e3a8a;
            font-size: 11px;
            font-weight: 600;
          }
          .travel-destination-dot {
            font-size: 12px;
            opacity: 0.8;
          }
          .guide-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .form-card {
            background: #ffffff;
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
            padding: 14px 14px 12px;
          }
          .form-title {
            font-size: 15px;
            font-weight: 800;
            margin: 0 0 8px;
            color: #0f172a;
          }
          .form-row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-top: 8px;
          }
          .form-row-split {
            align-items: stretch;
          }
          .form-label {
            width: 110px;
            font-size: 13px;
            color: #4b5563;
            padding-top: 6px;
          }
          .form-field {
            flex: 1;
          }
          .form-col {
            flex: 1;
          }
          .input {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            font-size: 13px;
            outline: none;
            background: #ffffff;
          }
          .input:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
          }
          .input.small {
            padding: 4px 6px;
            font-size: 12px;
          }
          .textarea {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            font-size: 13px;
            resize: vertical;
            outline: none;
            background: #ffffff;
          }
          .textarea:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
          }
          .file-name {
            margin-top: 4px;
            font-size: 11px;
            color: #6b7280;
          }
          .radio {
            display: inline-flex;
            align-items: center;
            margin-right: 12px;
            font-size: 13px;
            gap: 4px;
          }
          .pnr-row {
            margin-top: 10px;
          }
          .pnr-row .form-col {
            display: flex;
            flex-direction: column;
          }
          .field-label-small {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .btn {
            border-radius: 999px;
            border: 1px solid #2563eb;
            background: #2563eb;
            color: #ffffff;
            font-size: 12px;
            padding: 6px 10px;
            cursor: pointer;
          }
          .btn:disabled {
            opacity: 0.7;
            cursor: default;
          }
          .btn:hover:not(:disabled) {
            background: #1d4ed8;
            border-color: #1d4ed8;
          }
          .form-subtitle {
            margin-top: 8px;
            font-size: 12px;
            color: #6b7280;
          }
          .segment-table {
            margin-top: 6px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            padding: 6px;
          }
          .segment-header {
            display: grid;
            grid-template-columns: 1.2fr 2.4fr 1.2fr 1.3fr 1.4fr;
            gap: 6px;
            font-size: 11px;
            color: #6b7280;
            padding: 2px 4px 4px;
            border-bottom: 1px solid #e5e7eb;
          }
          .segment-row {
            display: grid;
            grid-template-columns: 1.2fr 2.4fr 1.2fr 1.3fr 1.4fr;
            gap: 6px;
            padding: 4px 4px;
            align-items: center;
          }
          .segment-city {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .segment-dot {
            font-size: 13px;
            color: #6b7280;
          }
          .meeting-datetime {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 6px;
          }
          .pnr-textarea-wrap {
            position: relative;
          }
          .pnr-clear-btn {
            position: absolute;
            top: 4px;
            right: 18px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            color: #9ca3af;
          }
          .pnr-clear-btn:hover {
            color: #4b5563;
          }
          .form-actions {
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-end;
          }
          .form-actions-buttons {
            display: flex;
            gap: 8px;
          }
          .btn-outline {
            border-radius: 999px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #111827;
            font-size: 13px;
            padding: 6px 14px;
            cursor: pointer;
            text-decoration: none;
            white-space: nowrap;
          }
          .btn-outline:hover {
            background: #f3f4f6;
          }
          .generated-url {
            align-self: stretch;
            padding: 8px 10px;
            border-radius: 10px;
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
            font-size: 12px;
          }
          .generated-url-label {
            font-weight: 600;
            color: #166534;
            margin-bottom: 4px;
          }
          .generated-url-link {
            display: inline-block;
            word-break: break-all;
            color: #166534;
            text-decoration: underline;
          }
          .guide-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
          .guide-page-title {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }
          .guide-page-sub {
            margin: 4px 0 0;
            font-size: 13px;
            color: #6b7280;
          }
          .guide-head-right .btn-outline {
            border-radius: 999px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #111827;
            font-size: 13px;
            padding: 6px 14px;
            cursor: pointer;
            text-decoration: none;
            white-space: nowrap;
          }
          .guide-head-right .btn-outline:hover {
            background: #f3f4f6;
          }
        `}</style>
      </div>
    </div>
  );
}
