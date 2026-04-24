// /src/app/admin/itineraries/[id]/edit/page.tsx
// 여행사 관리자 - 여행 일정표 수정 페이지
// 상세보기(/[id])와 거의 같은 정보 구조를 사용하되,
// 기본 정보 + 텍스트 영역 + 일차별 일정까지 전부 수정 가능

import "@/app/(styles)/checklist-layout.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Itinerary from "@/models/Itinerary";
import type { DayPlan } from "@/models/Itinerary";
import { ItineraryEditForm } from "@/app/admin/itineraries/ItineraryEditForm";

type Props = {
  params: Promise<{ id: string }>; // Next 15 스타일
};

// 화면에서 사용할 단순 타입
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
  days?: DayPlan[];
  createdAt?: Date | string;
};

export default async function AdminItineraryEditPage(props: Props) {
  const { id } = await props.params;

  await connectDB();

  const doc = (await Itinerary.findById(id).lean()) as ItineraryDoc | null;

  if (!doc) {
    notFound();
  }

  const createdAtString =
    typeof doc.createdAt === "string"
      ? doc.createdAt
      : doc.createdAt
      ? doc.createdAt.toISOString()
      : "";

  const daysRaw = Array.isArray(doc.days) ? doc.days : [];

  // ✅ 클라이언트용 DayPlan 구조로 정리
  const daysForClient = daysRaw.map((d) => ({
    day: d.day ?? 1,
    date: d.date || "",
    schedules: Array.isArray(d.schedules)
      ? d.schedules.map((s: any) => ({
          time: s.time || "",
          text: s.text || "",
        }))
      : [],
    breakfast: d.breakfast || "",
    lunch: d.lunch || "",
    dinner: d.dinner || "",
    hotelKr: d.hotelKr || "",
    hotelEn: d.hotelEn || "",
    hotelGrade: d.hotelGrade || "",
    hotelAddress: d.hotelAddress || "",
    hotelHomepage: d.hotelHomepage || "",
  }));

  const initial = {
    id,
    title: doc.title || "",
    description: doc.description || "",
    country: doc.country || "",
    city: doc.city || "",
    managerName: doc.managerName || "",
    includeText: doc.includeText || "",
    excludeText: doc.excludeText || "",
    travelerText: doc.travelerText || "",
    shoppingText: doc.shoppingText || "",
    mode: doc.mode === "PNR" ? "PNR" : "MANUAL",
    createdAtString,
    days: daysForClient,
  } as const;

  return (
    <div className="page">
      <div className="wrap itinerary-wrap">
        {/* 상단: 뒤로가기 / 상세보기 이동 */}
        <section className="it-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/admin/itineraries" className="btn white">
                ← 리스트로 돌아가기
              </Link>
              <Link
                href={`/admin/itineraries/${doc._id}`}
                className="btn outline-black"
              >
                상세보기로
              </Link>
            </div>
          </div>
        </section>

        {/* ✅ 전체 수정 폼 카드 (기본 정보 + 텍스트 + 일차별 일정까지 한 번에) */}
        <section className="it-card">
          <ItineraryEditForm initial={initial} />
        </section>
      </div>
    </div>
  );
}
