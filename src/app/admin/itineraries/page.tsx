// /src/app/admin/itineraries/page.tsx
// 관리자용 여행 일정표 리스트 페이지
// - 일정표 목록 조회
// - 각 일정표에 대해 "수정" (상세/수정 페이지 이동), "삭제" 기능 제공

import "@/app/(styles)/checklist-layout.css";

import Link from "next/link";
import { connectDB } from "@/lib/db";
import Itinerary from "@/models/Itinerary";
import { ItineraryRowActions } from "./ItineraryRowActions";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";

type ItineraryDoc = {
  _id: string;
  title: string;
  country?: string;
  city?: string;
  mode: "PNR" | "MANUAL";
  createdAt: string;
  startDate?: string;
  endDate?: string;
};

export default async function AdminItineraryListPage() {
  await connectDB();

  const docs = (await Itinerary.find().sort({ createdAt: -1 }).lean()) as any[];

  const itineraries: ItineraryDoc[] = docs.map((d) => {
    const days = Array.isArray(d.days) ? d.days : [];
    const startDate = days.length > 0 ? days[0].date : "";
    const endDate = days.length > 0 ? days[days.length - 1].date : "";

    return {
      _id: String(d._id),
      title: d.title,
      country: d.country || "",
      city: d.city || "",
      mode: d.mode,
      createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
      startDate,
      endDate,
    };
  });

  return (
    <div className="page">
      <AdminInnerTabs />

      <div className="wrap itinerary-wrap">
        {/* 상단 카드 */}
        <section className="it-card">
          <h1>여행 일정표 리스트</h1>
          <div style={{ marginTop: "12px" }}>
            <Link href="/admin/itineraries/new" className="btn black">
              + 새 일정표 만들기
            </Link>
          </div>
        </section>

        {/* 리스트 카드 */}
        <section className="it-card">
          {itineraries.length === 0 && <p>등록된 여행 일정표가 없습니다.</p>}

          {itineraries.length > 0 && (
            <div className="it-table-wrap">
              <table className="itinerary-table it-responsive">
                <thead>
                  <tr>
                    <th>제목</th>
                    <th>여행지</th>
                    <th>출발일</th>
                    <th>도착일</th>
                    <th>방식</th>
                    <th>생성일</th>
                    <th style={{ textAlign: "right" }}>관리</th>
                  </tr>
                </thead>

                <tbody>
                  {itineraries.map((it) => {
                    const travelText = `${it.country || "-"}${
                      it.city ? ` / ${it.city}` : ""
                    }`;

                    const startText = it.startDate
                      ? new Date(it.startDate).toLocaleDateString("ko-KR")
                      : "-";

                    const endText = it.endDate
                      ? new Date(it.endDate).toLocaleDateString("ko-KR")
                      : "-";

                    const modeText = it.mode === "PNR" ? "PNR 자동" : "수동";

                    const createdText = new Date(it.createdAt).toLocaleDateString(
                      "ko-KR",
                      { year: "numeric", month: "2-digit", day: "2-digit" }
                    );

                    return (
                      <tr key={it._id}>
                        <td data-label="제목">
                          <Link href={`/admin/itineraries/${it._id}`} className="it-title-link">
                            {it.title}
                          </Link>
                        </td>

                        <td data-label="여행지">{travelText}</td>
                        <td data-label="출발일">{startText}</td>
                        <td data-label="도착일">{endText}</td>
                        <td data-label="방식">{modeText}</td>
                        <td data-label="생성일">{createdText}</td>

                        <td data-label="관리" className="it-actions-cell">
                          <ItineraryRowActions id={it._id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 모바일에서 “테이블처럼 좌우 스크롤 가능”도 유지하고 싶으면 아래 안내 바가 도움이 됩니다 */}
              <div className="it-scroll-hint" aria-hidden="true">
                좌우로 스크롤하여 확인할 수 있습니다.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
