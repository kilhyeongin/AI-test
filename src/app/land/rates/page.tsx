// src/app/land/rates/page.tsx
import Link from "next/link";
import { connectDB } from "@/lib/db";
import LandRate from "@/models/LandRate";

export const dynamic = "force-dynamic";

export default async function LandRatesListPage() {
  await connectDB();
  const docs = await LandRate.find().sort({ createdAt: -1 }).lean();

  const rates = docs.map((doc: any) => ({
    id: String(doc._id),
    resortName: doc.resortName || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
    rows: Array.isArray(doc.rateRows) ? doc.rateRows.length : 0,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">요금표 목록</h1>
        <div className="flex gap-2">
          <Link href="/land/rates/import" className="btn outline-black">
            엑셀 업로드
          </Link>
          <Link href="/land/rates/new" className="btn black">
            새 요금표 등록
          </Link>
        </div>
      </div>

      {rates.length === 0 ? (
        <p className="text-sm text-gray-500">
          아직 등록된 요금표가 없습니다. 상단의 &quot;새 요금표 등록&quot; 또는
          &quot;엑셀 업로드&quot;를 이용해 추가해 주세요.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 border-b text-left">리조트명</th>
                <th className="px-3 py-2 border-b text-left">요금 행 개수</th>
                <th className="px-3 py-2 border-b text-left">생성일</th>
                <th className="px-3 py-2 border-b text-left">관리</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id} className="border-t">
                  <td className="px-3 py-2">{rate.resortName}</td>
                  <td className="px-3 py-2">{rate.rows}개</td>
                  <td className="px-3 py-2">
                    {rate.createdAt
                      ? rate.createdAt.toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 text-xs">
                      <Link
                        href={`/land/rates/${rate.id}`}
                        className="underline"
                      >
                        상세보기
                      </Link>
                      <Link
                        href={`/land/rates/${rate.id}/edit`}
                        className="underline text-gray-600"
                      >
                        텍스트 수정
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
