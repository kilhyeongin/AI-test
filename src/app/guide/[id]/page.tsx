// /src/app/guide/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type GuideSegment = {
  airline: string;
  flightNo: string;
  depart: string;
  arrive: string;
  date?: string;
  depTime?: string;
  arrTime?: string;
  duration?: string;
};

type GuideData = {
  _id: string;
  travelerName: string;
  logoUrl?: string;
  segments: GuideSegment[];
  checkinAirline?: string;
  checkinTerminal?: string;

  meetingPlace?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingStaffName?: string;
  meetingStaffPhone?: string;

  localBoardName?: string;
  localStaffName?: string;
  localPhone?: string;
  localEmergencyPhone?: string;
  localImageUrl?: string;

  country?: string;
  city?: string;
  weatherInfo?: string;
  outfitInfo?: string;
  exchangeInfo?: string;
  immigrationInfo?: string;
  visaInfo?: string;
  localTimeInfo?: string;
  plugInfo?: string;

  companyName?: string;
  companyDesc?: string;
};

/** 항공사 코드 → 한글 이름 */
const AIRLINE_NAME_MAP: Record<string, string> = {
  KE: "대한항공",
  OZ: "아시아나항공",
  LJ: "진에어",
  "7C": "제주항공",
  TW: "티웨이항공",
  BX: "에어부산",
  ZE: "이스타항공",
  YP: "에어프레미아",
  RS: "에어서울",
};

/** 공항 코드 → 한글 도시/공항명 */
const AIRPORT_NAME_MAP: Record<string, string> = {
  ICN: "인천",
  GMP: "서울(김포)",
  PUS: "부산(김해)",
  CJU: "제주",
  NRT: "도쿄(나리타)",
  HND: "도쿄(하네다)",
  KIX: "오사카(간사이)",
  CTS: "삿포로(신치토세)",
  FUK: "후쿠오카",
  BKK: "방콕(수완나품)",
  DMK: "방콕(돈므앙)",
  CNX: "치앙마이",
  HKT: "푸껫",
  SGN: "호치민",
  HAN: "하노이",
  DAD: "다낭",
  CXR: "나트랑",
  DPS: "발리(덴파사르)",
  FCO: "로마(피우미치노)",
};

function getAirlineDisplay(code: string | undefined) {
  if (!code) return "";
  const upper = code.toUpperCase();
  return AIRLINE_NAME_MAP[upper] ?? upper;
}

function getAirportDisplay(code: string | undefined) {
  if (!code) return "";
  const upper = code.toUpperCase();
  return AIRPORT_NAME_MAP[upper] ?? upper;
}

/** 날짜+시간 한 줄 표기 */
function formatDateTime(date?: string, time?: string): string {
  const d = (date || "").trim();
  const t = (time || "").trim();
  if (!d && !t) return "";
  if (d && t) return `${d} ${t}`;
  return d || t;
}

function hasSegmentValue(seg: GuideSegment): boolean {
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

export default function PublicGuidePage() {
  const params = useParams();
  const id = (params?.id as string) || "";

  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchGuide() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch(`/api/guides/${id}`);
        if (!res.ok) {
          throw new Error("가이드를 불러오지 못했습니다.");
        }
        const data = await res.json();
        if (!cancelled) {
          setGuide(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMsg("페이지를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGuide();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const segments = (guide?.segments ?? []).filter(hasSegmentValue);
  const meetingDateTimeDisplay =
    guide?.meetingDate && guide?.meetingTime
      ? `${guide.meetingDate} ${guide.meetingTime}`
      : guide?.meetingDate
      ? guide.meetingDate
      : guide?.meetingTime || "";

  return (
    <div className="guide-public-page">
      <div className="guide-public-card">
        {loading && <div className="status-text">페이지를 불러오는 중입니다...</div>}
        {!loading && errorMsg && (
          <div className="status-text error">{errorMsg}</div>
        )}
        {!loading && !errorMsg && !guide && (
          <div className="status-text">가이드를 찾을 수 없습니다.</div>
        )}

        {!loading && !errorMsg && guide && (
          <>
            {/* 상단 헤더 */}
            <header className="preview-header">
              <div className="preview-logo">
                {guide.logoUrl ? (
                  <img
                    src={guide.logoUrl}
                    alt="여행사 로고"
                    className="preview-logo-img"
                  />
                ) : (
                  <span className="preview-logo-placeholder">여행사 로고</span>
                )}
              </div>
              <div className="preview-traveler">
                <span className="preview-traveler-label">여행자 성명</span>
                <span className="preview-traveler-name">
                  {guide.travelerName || "고객님"}
                </span>
              </div>
            </header>

            {/* 항공편 정보 */}
            <section className="preview-section">
              <h3 className="preview-title">항공편 정보</h3>
              {segments.length === 0 && (
                <div className="empty-text">등록된 항공편 정보가 없습니다.</div>
              )}
              {segments.map((seg, idx) => {
                const airlineDisplay = getAirlineDisplay(seg.airline);
                const departDisplay = getAirportDisplay(seg.depart);
                const arriveDisplay = getAirportDisplay(seg.arrive);
                const depDateTime = formatDateTime(seg.date, seg.depTime);
                const arrDateTime = formatDateTime(seg.date, seg.arrTime);

                return (
                  <div key={idx} className="preview-flight-block">
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
                    {idx < segments.length - 1 && (
                      <div className="preview-divider" />
                    )}
                  </div>
                );
              })}
            </section>

            {/* 체크인 카운터 */}
            <section className="preview-section">
              <h3 className="preview-title">체크인 카운터</h3>
              <div className="preview-row">
                <span className="preview-label">항공사</span>
                <span className="preview-value">
                  {guide.checkinAirline || "항공사 카운터 확인"}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">항공 터미널</span>
                <span className="preview-value">
                  {guide.checkinTerminal ||
                    "탑승수속 터미널 및 카운터는 출발 전 재확인 부탁드립니다."}
                </span>
              </div>
            </section>

            {/* 탑승 게이트 찾기 */}
            <section className="preview-section">
              <h3 className="preview-title">탑승 게이트 찾기</h3>
              <div className="preview-row">
                <span className="preview-label">위치찾기</span>
                <span className="preview-value">
                  공항 전광판 및 공항 앱에서 실제 탑승 게이트를 확인해주세요.
                </span>
              </div>
            </section>

            {/* 공항 미팅 장소 */}
            <section className="preview-section">
              <h3 className="preview-title">공항 미팅 장소</h3>
              <div className="preview-row">
                <span className="preview-label">미팅 장소</span>
                <span className="preview-value">
                  {guide.meetingPlace || "공항 내 지정 미팅 장소"}
                </span>
              </div>
              {(guide.meetingDate || guide.meetingTime) && (
                <div className="preview-row">
                  <span className="preview-label">미팅 일시</span>
                  <span className="preview-value">
                    {meetingDateTimeDisplay || "출발 3시간 전 집결"}
                  </span>
                </div>
              )}
              <div className="preview-row">
                <span className="preview-label">담당자</span>
                <span className="preview-value">
                  {guide.meetingStaffName || "공항 미팅 담당자"}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">연락처</span>
                <span className="preview-value">
                  {guide.meetingStaffPhone || "예: 010-0000-0000"}
                </span>
              </div>
            </section>

            {/* 현지 미팅 정보 */}
            <section className="preview-section">
              <h3 className="preview-title">현지 미팅 정보</h3>
              <div className="preview-row">
                <span className="preview-label">미팅 피켓명</span>
                <span className="preview-value">
                  {guide.localBoardName || "공항 피켓에 표시될 이름"}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">담당자</span>
                <span className="preview-value">
                  {guide.localStaffName || "현지 담당자 이름"}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">연락처</span>
                <span className="preview-value">
                  {guide.localPhone || "현지 담당자 연락처"}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">비상 연락처</span>
                <span className="preview-value">
                  {guide.localEmergencyPhone || "긴급 상황 연락처"}
                </span>
              </div>
              {guide.localImageUrl && (
                <div className="preview-local-image-wrap">
                  <img
                    src={guide.localImageUrl}
                    alt="현지 미팅 장소 안내"
                    className="preview-local-image"
                  />
                </div>
              )}
            </section>

            {/* 여행지 정보 */}
            <section className="preview-section">
              <h3 className="preview-title">여행지 정보</h3>

              <div className="travel-destination-chip">
                {guide.country || guide.city ? (
                  <>
                    <span>{guide.country || "여행 국가"}</span>
                    {guide.city && (
                      <span className="travel-destination-dot">·</span>
                    )}
                    {guide.city && <span>{guide.city}</span>}
                  </>
                ) : (
                  <span>여행지 미정</span>
                )}
              </div>

              <div className="travel-info-stack">
                <div className="travel-info-card">
                  <div className="travel-info-icon">🌤️</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">현재 날씨 · 기온</div>
                    <div className="travel-info-text">
                      {guide.weatherInfo ||
                        "여행 시기 기준 평균 기온과 날씨 정보를 출발 전 다시 확인해주세요."}
                    </div>
                  </div>
                </div>

                <div className="travel-info-card">
                  <div className="travel-info-icon">👕</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">옷차림 정보</div>
                    <div className="travel-info-text">
                      {guide.outfitInfo ||
                        "기후에 맞는 옷차림, 겉옷/신발 등 준비물을 안내드립니다."}
                    </div>
                  </div>
                </div>

                <div className="travel-info-card">
                  <div className="travel-info-icon">💱</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">현지 환율</div>
                    <div className="travel-info-text">
                      {guide.exchangeInfo ||
                        "1,000원 기준 대략적인 환율과 환전 팁을 참고해주세요. 실제 환율은 출발 직전 확인 부탁드립니다."}
                    </div>
                  </div>
                </div>

                <div className="travel-info-divider" />

                <div className="travel-info-card">
                  <div className="travel-info-icon">📄</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">입국신고서 안내</div>
                    <div className="travel-info-text">
                      {guide.immigrationInfo ||
                        "입국·세관신고서 작성 여부 및 작성 방법은 기내 또는 현지 안내에 따라 진행해 주세요."}
                    </div>
                  </div>
                </div>

                <div className="travel-info-card">
                  <div className="travel-info-icon">🛂</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">비자 정보</div>
                    <div className="travel-info-text">
                      {guide.visaInfo ||
                        "무비자/비자 필요 여부, 체류 가능 일수 등은 출발 전 최신 공지를 꼭 확인해 주세요."}
                    </div>
                  </div>
                </div>

                <div className="travel-info-card">
                  <div className="travel-info-icon">🕒</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">현지 시간 · 시차</div>
                    <div className="travel-info-text">
                      {guide.localTimeInfo ||
                        "한국과의 시차 및 현지 시간을 미리 확인하시면 여행 일정 관리에 도움이 됩니다."}
                    </div>
                  </div>
                </div>

                <div className="travel-info-card">
                  <div className="travel-info-icon">🔌</div>
                  <div className="travel-info-body">
                    <div className="travel-info-label">콘센트 · 전압</div>
                    <div className="travel-info-text">
                      {guide.plugInfo ||
                        "콘센트 타입, 전압, 멀티어댑터 필요 여부를 확인해 주세요."}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 회사 정보 */}
            {(guide.companyName || guide.companyDesc) && (
              <section className="preview-section">
                <h3 className="preview-title">여행사 정보</h3>
                <div className="company-name">
                  {guide.companyName || "여행사명"}
                </div>
                {guide.companyDesc && (
                  <div className="company-desc">{guide.companyDesc}</div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .guide-public-page {
          min-height: 100vh;
          background: #f3f4f6;
          padding: 20px 12px;
          display: flex;
          justify-content: center;
        }
        .guide-public-card {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          padding: 16px 14px 20px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
          border: 1px solid #e5e7eb;
          font-size: 13px;
          color: #111827;
        }
        .status-text {
          text-align: center;
          padding: 40px 0;
          font-size: 14px;
          color: #4b5563;
        }
        .status-text.error {
          color: #b91c1c;
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
          font-size: 15px;
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
        .empty-text {
          font-size: 12px;
          color: #9ca3af;
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

        .company-name {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .company-desc {
          font-size: 12px;
          color: #374151;
          white-space: pre-line;
        }
      `}</style>
    </div>
  );
}
