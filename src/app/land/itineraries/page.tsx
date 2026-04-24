// src/app/land/itineraries/page.tsx
import Link from "next/link";
import { connectDB } from "@/lib/db";
import LandItinerary from "@/models/LandItinerary";

export const dynamic = "force-dynamic";

export default async function LandItinerariesListPage() {
  await connectDB();
  const docs = await LandItinerary.find().sort({ createdAt: -1 }).lean();

  const items = docs.map((doc: any) => ({
    id: String(doc._id),
    title:
      doc.title ||
      doc.name ||
      doc.productName ||
      `여행일정 (${String(doc._id).slice(-6)})`,
    resortName: doc.resortName || doc.hotelName || "",
    daysCount: Array.isArray(doc.days) ? doc.days.length : doc.nights || null,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">여행일정 목록</h1>
        <Link href="/land/itineraries/new" className="btn black">
          새 일정 등록
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          아직 등록된 여행일정이 없습니다. 상단의 &quot;새 일정 등록&quot;을
          이용해 추가해 주세요.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border-b text-left">상품명/제목</th>
                <th className="px-3 py-2 border-b text-left">리조트명</th>
                <th className="px-3 py-2 border-b text-left">일차 수</th>
                <th className="px-3 py-2 border-b text-left">생성일</th>
                <th className="px-3 py-2 border-b text-left">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{it.title}</td>
                  <td className="px-3 py-2">
                    {it.resortName ? it.resortName : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {it.daysCount ? `${it.daysCount}일차` : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {it.createdAt
                      ? it.createdAt.toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 text-xs">
                      <Link
                        href={`/land/itineraries/${it.id}`}
                        className="underline"
                      >
                        상세보기
                      </Link>
                      <Link
                        href={`/land/itineraries/${it.id}/edit`}
                        className="underline text-gray-600"
                      >
                        수정
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
