// src/app/admin/itineraries/select/SelectItineraryClient.tsx
"use client";

import "@/app/(styles)/checklist-layout.css";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ItineraryListItem = {
  _id: string;
  title: string;
  country?: string;
  city?: string;
  mode: "PNR" | "MANUAL";
  createdAt: string | null;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
};

export default function SelectItineraryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const flowId = searchParams.get("flowId") || "";
  const customerId = searchParams.get("customerId") || "";

  const [items, setItems] = useState<ItineraryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/admin/itineraries/list", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok || !Array.isArray(data.itineraries)) {
          console.error("itinerary list load error:", data);
          setError("여행 일정표 목록을 불러오지 못했습니다. 다시 시도해 주세요.");
          return;
        }

        setItems(data.itineraries as ItineraryListItem[]);
      } catch (e) {
        console.error("itinerary list fetch error:", e);
        setError("여행 일정표 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (itineraryId: string) => {
    if (!flowId) {
      alert("flowId가 없습니다. 체크리스트 화면에서 다시 진입해 주세요.");
      return;
    }

    if (!confirm("이 여행 일정표를 이 체크리스트에 연결할까요?")) return;

    try {
      setSelectingId(itineraryId);

      const res = await fetch(
        `/api/admin/onboarding/${encodeURIComponent(flowId)}/itinerary`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itineraryId }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        console.error("attach itinerary error:", data);
        alert(
          data?.message ||
            "체크리스트에 여행 일정표를 연결하는 중 오류가 발생했습니다."
        );
        return;
      }

      alert("여행 일정표가 체크리스트에 연결되었습니다.");
      router.back();
    } catch (e) {
      console.error("attach itinerary fetch error:", e);
      alert("서버 오류로 연결에 실패했습니다.");
    } finally {
      setSelectingId(null);
    }
  };

  if (!flowId) {
    return (
      <div className="page">
        <div className="wrap itinerary-wrap">
          <section className="it-card">
            <h1>여행 일정표 선택</h1>
            <p style={{ marginTop: 8, color: "#ef4444", fontSize: 13 }}>
              flowId가 없습니다. 고객 체크리스트 화면에서 다시 진입해 주세요.
            </p>
            <button
              className="btn line"
              style={{ marginTop: 12 }}
              onClick={() => router.back()}
            >
              ← 뒤로가기
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap itinerary-wrap">
        <section className="it-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 18 }}>여행 일정표 선택</h1>
              <p style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
                기존에 만들어 둔 여행 일정표 중에서 이 체크리스트에 연결할
                일정표를 선택하세요.
              </p>
              {customerId && (
                <p style={{ marginTop: 2, fontSize: 12, color: "#9ca3af" }}>
                  고객 ID: {customerId}
                </p>
              )}
            </div>

            <button className="btn line" onClick={() => router.back()}>
              ← 체크리스트로 돌아가기
            </button>
          </div>
        </section>

        <section className="it-card">
          {loading && (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              여행 일정표 목록을 불러오는 중입니다…
            </p>
          )}

          {!loading && error && (
            <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <p style={{ fontSize: 13 }}>
              등록된 여행 일정표가 없습니다. 먼저 새 일정표를 생성해 주세요.
            </p>
          )}

          {!loading && !error && items.length > 0 && (
            <table className="itinerary-table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>여행지</th>
                  <th>출발일</th>
                  <th>도착일</th>
                  <th>일수</th>
                  <th>방식</th>
                  <th style={{ textAlign: "right" }}>선택</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id}>
                    <td>{String(it.title ?? "").trim() || "(제목 없음)"}</td>
                    <td>
                      {it.country}
                      {it.city ? ` / ${it.city}` : ""}
                    </td>
                    <td>
                      {it.startDate
                        ? new Date(it.startDate).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td>
                      {it.endDate
                        ? new Date(it.endDate).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td>{it.daysCount ?? "-"}</td>
                    <td>{it.mode === "PNR" ? "PNR 자동" : "수동"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn black"
                        onClick={() => handleSelect(it._id)}
                        disabled={!!selectingId}
                      >
                        {selectingId === it._id ? "연결 중..." : "이 일정표 선택"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
