// /src/components/admin/AdminFlowItineraryBox.tsx
// 관리자: 특정 OnboardingFlow(고객 체크리스트)에 연결된 일정표 상태 + 버튼 박스

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ItinerarySummary = {
  _id: string;
  title: string;
  description: string;
  country: string;
  city: string;
  managerName: string;
  createdAt: string | null;
};

type Props = {
  flowId: string;      // OnboardingFlow의 id
  customerId: string;  // 고객 id (/admin/customers/[id])
};

export function AdminFlowItineraryBox({ flowId, customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<ItinerarySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!flowId) return;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/admin/onboarding/${flowId}/itinerary`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(data.message || "일정표 정보를 불러오지 못했습니다.");
          return;
        }

        if (!data.hasItinerary) {
          setItinerary(null);
          return;
        }

        setItinerary(data.itinerary as ItinerarySummary);
      } catch (err) {
        console.error(err);
        setError("일정표 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [flowId]);

  // flowId가 없으면 아무것도 렌더하지 않음
  if (!flowId) return null;

  return (
    <section
      style={{
        marginTop: 16,
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
      }}
    >
      {/* 상단 제목 + 버튼들 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>여행 일정표</div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* 일정표 만들기: 새 일정표 생성 + 이 Flow에 자동 연결 */}
          <Link
            href={`/admin/itineraries/new?flowId=${encodeURIComponent(
              flowId
            )}&customerId=${encodeURIComponent(customerId)}`}
            className="btn black"
          >
            일정표 만들기
          </Link>

          {/* 불러오기: 나중에 구현할 선택 페이지 (지금은 링크만) */}
          <Link
            href={`/admin/itineraries/select?flowId=${encodeURIComponent(
              flowId
            )}&customerId=${encodeURIComponent(customerId)}`}
            className="btn outline-black"
          >
            일정표 불러오기
          </Link>
        </div>
      </div>

      {/* 바디 내용 */}
      {loading && <p style={{ fontSize: 14 }}>일정표 상태를 불러오는 중입니다…</p>}

      {!loading && error && (
        <p style={{ fontSize: 13, color: "red" }}>{error}</p>
      )}

      {!loading && !error && !itinerary && (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          아직 이 체크리스트에 연결된 일정표가 없습니다.
          <br />
          상단의 [일정표 만들기] 또는 [일정표 불러오기] 버튼을 사용해 연결해주세요.
        </p>
      )}

      {!loading && !error && itinerary && (
        <div style={{ fontSize: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {itinerary.title}
          </div>
          {itinerary.description && (
            <div
              style={{
                marginBottom: 6,
                color: "#4b5563",
                whiteSpace: "pre-wrap",
              }}
            >
              {itinerary.description}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            <span>
              여행지: {itinerary.country}
              {itinerary.city && ` / ${itinerary.city}`}
            </span>
            {itinerary.managerName && (
              <span>담당자: {itinerary.managerName}</span>
            )}
            {itinerary.createdAt && (
              <span>
                생성일:{" "}
                {new Date(itinerary.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <Link
              href={`/admin/itineraries/${itinerary._id}`}
              className="btn line"
            >
              일정표 상세보기
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
