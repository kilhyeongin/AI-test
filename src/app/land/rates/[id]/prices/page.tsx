// src/app/land/rates/[id]/prices/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RatePlanForm = {
  meal: string;
  nightsLabel: string;
  price: string;
  extraNightPrice: string;
};

type RateRowForm = {
  stayPeriod: string;
  roomType: string;
  occupancy: string;
  plan1: RatePlanForm;
  plan2: RatePlanForm;
};

export default function LandRatePricesEditPage() {
  const router = useRouter();

  // ✅ Next 15 대응: Props(params) 대신 useParams 사용
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [resortName, setResortName] = useState("");
  const [rows, setRows] = useState<RateRowForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const r = await fetch(`/api/land/rates/${id}`, { cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          alert(d?.error || "요금표를 불러오지 못했습니다.");
          router.push("/land/rates");
          return;
        }

        const rate = d.rate as any;
        setResortName(rate.resortName || "");

        const sourceRows: any[] = Array.isArray(rate.rateRows) ? rate.rateRows : [];

        const mapped: RateRowForm[] = sourceRows.map((row) => ({
          stayPeriod: row.stayPeriod || "",
          roomType: row.roomType || "",
          occupancy: row.occupancy || "",
          plan1: {
            meal: row.plan1?.meal || "",
            nightsLabel: row.plan1?.nightsLabel || "",
            price: row.plan1?.price || "",
            extraNightPrice: row.plan1?.extraNightPrice || "",
          },
          plan2: {
            meal: row.plan2?.meal || "",
            nightsLabel: row.plan2?.nightsLabel || "",
            price: row.plan2?.price || "",
            extraNightPrice: row.plan2?.extraNightPrice || "",
          },
        }));

        setRows(mapped);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleRowChange = (
    index: number,
    field: keyof RateRowForm,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handlePlanChange = (
    index: number,
    planKey: "plan1" | "plan2",
    field: keyof RatePlanForm,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [planKey]: {
                ...row[planKey],
                [field]: value,
              },
            }
          : row
      )
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        stayPeriod: "",
        roomType: "",
        occupancy: "",
        plan1: {
          meal: "",
          nightsLabel: "",
          price: "",
          extraNightPrice: "",
        },
        plan2: {
          meal: "",
          nightsLabel: "",
          price: "",
          extraNightPrice: "",
        },
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (!confirm("이 행을 삭제하시겠습니까?")) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);

      const payload = {
        rateRows: rows,
      };

      const r = await fetch(`/api/land/rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "요금표 저장에 실패했습니다.");
        return;
      }

      alert("요금표가 저장되었습니다.");
      router.push(`/land/rates/${id}`);
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return <div className="p-6 text-sm">잘못된 접근입니다.</div>;
  }

  if (loading) {
    return <div className="p-6 text-sm">불러오는 중…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          요금표 가격 수정 – {resortName}
        </h1>
        <a href={`/land/rates/${id}`} className="text-sm underline">
          상세로 돌아가기
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-x-auto border rounded-lg bg-white">
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

                <th className="px-2 py-2 border-b text-left">행 삭제</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t">
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.stayPeriod}
                      onChange={(e) =>
                        handleRowChange(index, "stayPeriod", e.target.value)
                      }
                      placeholder="예: 24/01/19~24/04/30"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.roomType}
                      onChange={(e) =>
                        handleRowChange(index, "roomType", e.target.value)
                      }
                      placeholder="객실명"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.occupancy}
                      onChange={(e) =>
                        handleRowChange(index, "occupancy", e.target.value)
                      }
                      placeholder="예: 2A+1C"
                    />
                  </td>

                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan1.meal}
                      onChange={(e) =>
                        handlePlanChange(index, "plan1", "meal", e.target.value)
                      }
                      placeholder="HB"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan1.nightsLabel}
                      onChange={(e) =>
                        handlePlanChange(index, "plan1", "nightsLabel", e.target.value)
                      }
                      placeholder="4박"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan1.price}
                      onChange={(e) =>
                        handlePlanChange(index, "plan1", "price", e.target.value)
                      }
                      placeholder="요금"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan1.extraNightPrice}
                      onChange={(e) =>
                        handlePlanChange(
                          index,
                          "plan1",
                          "extraNightPrice",
                          e.target.value
                        )
                      }
                      placeholder="1박 추가"
                    />
                  </td>

                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan2.meal}
                      onChange={(e) =>
                        handlePlanChange(index, "plan2", "meal", e.target.value)
                      }
                      placeholder="AI"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan2.nightsLabel}
                      onChange={(e) =>
                        handlePlanChange(index, "plan2", "nightsLabel", e.target.value)
                      }
                      placeholder="4박"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan2.price}
                      onChange={(e) =>
                        handlePlanChange(index, "plan2", "price", e.target.value)
                      }
                      placeholder="요금"
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className="w-full border rounded px-1 py-1 text-xs"
                      value={row.plan2.extraNightPrice}
                      onChange={(e) =>
                        handlePlanChange(
                          index,
                          "plan2",
                          "extraNightPrice",
                          e.target.value
                        )
                      }
                      placeholder="1박 추가"
                    />
                  </td>

                  <td className="px-2 py-1 align-top">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-[11px] text-red-600 underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs underline text-gray-700"
          >
            + 행 추가
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn outline-black"
            >
              취소
            </button>
            <button type="submit" className="btn black" disabled={saving}>
              {saving ? "저장 중…" : "저장하기"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
