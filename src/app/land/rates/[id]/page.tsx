// src/app/land/rates/[id]/page.tsx
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import LandRate from "@/models/LandRate";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LandRateDetailPage({ params }: Props) {
  const { id } = await params; // ⬅ 여기서 await 필요

  await connectDB();
  const doc = await LandRate.findById(id).lean();

  if (!doc) {
    notFound();
  }

  // 타입 단순화
  const rate: any = doc;
  const rateId = String(rate._id || rate.id || id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* 상단 헤더 + 액션 버튼들 */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          요금표 상세 - {rate.resortName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
          <a
            href={`/land/rates/${rateId}/prices`}
            className="underline text-gray-800"
          >
            요금 수정
          </a>
          <a
            href={`/land/rates/${rateId}/edit`}
            className="underline text-gray-600"
          >
            텍스트 수정
          </a>
          <a
            href={`/land/rates/${rateId}/delete`}
            className="underline text-red-600"
          >
            삭제
          </a>
          <a href="/land/rates" className="underline">
            목록으로
          </a>
        </div>
      </div>

      {/* 기본 정보 */}
      <section className="space-y-2">
        <h2 className="font-medium">기본 정보</h2>
        <div className="border rounded-lg p-4 text-sm space-y-1 bg-white">
          <div>
            <span className="font-medium">리조트명: </span>
            <span>{rate.resortName}</span>
          </div>
          <div className="text-xs text-gray-500">
            생성일:{" "}
            {rate.createdAt
              ? new Date(rate.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
              : "-"}
          </div>
        </div>
      </section>

      {/* 요금 테이블 */}
      {rate.rateRows && rate.rateRows.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">
            투숙기간 / 객실 / 투숙인원 / 식사 / N박 요금 / 1박 추가
          </h2>
          <div className="overflow-x-auto border rounded-lg bg-white">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border-b text-left">투숙기간</th>
                  <th className="px-3 py-2 border-b text-left">객실</th>
                  <th className="px-3 py-2 border-b text-left">투숙인원</th>

                  <th className="px-3 py-2 border-b text-left">식사</th>
                  <th className="px-3 py-2 border-b text-left">N박</th>
                  <th className="px-3 py-2 border-b text-left">N박 요금</th>
                  <th className="px-3 py-2 border-b text-left">1박 추가</th>

                  <th className="px-3 py-2 border-b text-left">식사</th>
                  <th className="px-3 py-2 border-b text-left">N박</th>
                  <th className="px-3 py-2 border-b text-left">N박 요금</th>
                  <th className="px-3 py-2 border-b text-left">1박 추가</th>
                </tr>
              </thead>
              <tbody>
                {rate.rateRows.map((row: any, index: number) => (
                  <tr key={index} className="border-t">
                    <td className="px-2 py-2 align-top">{row.stayPeriod}</td>
                    <td className="px-2 py-2 align-top">{row.roomType}</td>
                    <td className="px-2 py-2 align-top">
                      {row.occupancy || "-"}
                    </td>

                    <td className="px-2 py-2 align-top">
                      {row.plan1?.meal || "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.plan1?.nightsLabel || "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.plan1?.price || "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.plan1?.extraNightPrice || "-"}
                    </td>

                    <td className="px-2 py-2 align-top">
                      {row.plan2?.meal || "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.plan2?.nightsLabel || "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.plan2?.price || "-"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {row.plan2?.extraNightPrice || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 기타 텍스트 섹션들 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {rate.saleNotes && (
          <InfoBlock title="판매 시 유의 사항" content={rate.saleNotes} />
        )}
        {rate.inclusions && (
          <InfoBlock title="포함사항" content={rate.inclusions} />
        )}
        {rate.exclusions && (
          <InfoBlock title="불포함사항" content={rate.exclusions} />
        )}
        {rate.resortBenefits && (
          <InfoBlock title="리조트 제공 사항" content={rate.resortBenefits} />
        )}
        {rate.honeymoonBenefits && (
          <InfoBlock title="허니문 특전" content={rate.honeymoonBenefits} />
        )}
        {rate.hbBenefits && (
          <InfoBlock title="HB 제공 사항" content={rate.hbBenefits} />
        )}
        {rate.aiBenefits && (
          <InfoBlock title="AI 제공 사항" content={rate.aiBenefits} />
        )}
        {rate.paymentAndCancel && (
          <InfoBlock
            title="입금 및 취소 규정"
            content={rate.paymentAndCancel}
          />
        )}
        {rate.extraCancel && (
          <InfoBlock title="추가 취소" content={rate.extraCancel} />
        )}
      </section>
    </div>
  );
}

type InfoBlockProps = {
  title: string;
  content: string;
};

function InfoBlock({ title, content }: InfoBlockProps) {
  return (
    <div className="border rounded-lg p-4 bg-white h-full">
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{content}</p>
    </div>
  );
}
