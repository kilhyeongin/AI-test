// src/app/land/rates/import/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PreviewPlan = {
  meal: string;
  nightsLabel: string;
  price: string;
  extraNightPrice: string;
};

type PreviewRow = {
  stayPeriod: string;
  roomType: string;
  occupancy: string;
  plan1: PreviewPlan;
  plan2: PreviewPlan;
};

export default function LandRateImportPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [previewResortName, setPreviewResortName] = useState<string | null>(
    null
  );
  const [totalRows, setTotalRows] = useState<number | null>(null);

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreviewRows(null);
    setPreviewResortName(null);
    setTotalRows(null);
    setError(null);

    if (!f) return;

    // 파일 선택 즉시 미리보기 요청
    try {
      setParsing(true);

      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/land/rates/import?preview=1", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "엑셀 미리보기에 실패했습니다.");
        return;
      }

      setPreviewRows(data.rows || []);
      setPreviewResortName(data.resortName || null);
      setTotalRows(typeof data.totalRows === "number" ? data.totalRows : null);
    } catch (err) {
      console.error(err);
      setError("엑셀 미리보기 중 오류가 발생했습니다.");
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("업로드할 엑셀 파일을 먼저 선택해주세요.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/land/rates/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "엑셀 업로드에 실패했습니다.");
        return;
      }

      alert("요금표가 등록되었습니다.");
      router.push(`/land/rates/${data.id}`);
    } catch (err) {
      console.error(err);
      setError("엑셀 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">요금표 엑셀 업로드</h1>
        <a href="/land/rates" className="text-sm underline">
          요금표 목록
        </a>
      </div>

      <section className="border rounded-lg bg-white p-4 space-y-4 text-sm">
        <p className="text-gray-700">
          제공된 엑셀 양식에 맞춰 요금표를 작성한 뒤, 아래에서 파일을 선택하면
          <br />
          먼저 미리보기가 나타납니다. 내용이 맞는지 확인 후 업로드를 진행해 주세요.
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-medium">엑셀 파일 선택</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block text-sm"
          />
          {parsing && (
            <p className="text-xs text-gray-500">
              엑셀을 분석하는 중입니다…
            </p>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 whitespace-pre-wrap">
            {error}
          </p>
        )}

        {/* 미리보기 영역 */}
        {previewRows && previewRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">
                  리조트명:{" "}
                  {previewResortName ? previewResortName : "(알 수 없음)"}
                </span>
                {typeof totalRows === "number" && (
                  <span className="ml-2 text-xs text-gray-500">
                    총 {totalRows}행 중 {previewRows.length}행 미리보기
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 border-b text-left">투숙기간</th>
                    <th className="px-2 py-2 border-b text-left">객실</th>
                    <th className="px-2 py-2 border-b text-left">투숙인원</th>

                    <th className="px-2 py-2 border-b text-left">식사1</th>
                    <th className="px-2 py-2 border-b text-left">박1</th>
                    <th className="px-2 py-2 border-b text-left">요금1</th>
                    <th className="px-2 py-2 border-b text-left">추가1</th>

                    <th className="px-2 py-2 border-b text-left">식사2</th>
                    <th className="px-2 py-2 border-b text-left">박2</th>
                    <th className="px-2 py-2 border-b text-left">요금2</th>
                    <th className="px-2 py-2 border-b text-left">추가2</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1 align-top">
                        {row.stayPeriod}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.roomType}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.occupancy || "-"}
                      </td>

                      <td className="px-2 py-1 align-top">
                        {row.plan1?.meal || "-"}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.plan1?.nightsLabel || "-"}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.plan1?.price || "-"}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.plan1?.extraNightPrice || "-"}
                      </td>

                      <td className="px-2 py-1 align-top">
                        {row.plan2?.meal || "-"}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.plan2?.nightsLabel || "-"}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.plan2?.price || "-"}
                      </td>
                      <td className="px-2 py-1 align-top">
                        {row.plan2?.extraNightPrice || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500">
              위 미리보기 내용이 엑셀과 동일한지 확인한 후 업로드를 진행해주세요.
            </p>
          </div>
        )}

        <form onSubmit={handleUpload} className="pt-2">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => history.back()}
              className="btn outline-black"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn black"
              disabled={uploading || !file}
            >
              {uploading ? "업로드 중…" : "이 내용으로 업로드"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
