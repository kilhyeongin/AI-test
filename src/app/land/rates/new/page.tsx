// src/app/land/rates/new/page.tsx
"use client";

import React, { useState } from "react";

type RatePlan = {
  meal: string;           // 식사 이름 (예: 조식, 조·석식, 올인클루시브 등)
  nightsLabel: string;    // O박 라벨 (예: 3박, 4박 등)
  price: string;          // O박 요금
  extraNightPrice: string;// O박 추가 요금
};

type RateRow = {
  stayPeriod: string;     // 투숙기간
  roomType: string;       // 객실
  plan1: RatePlan;        // 첫 번째 요금 (식사 / O박 요금 / O박 추가)
  plan2: RatePlan;        // 두 번째 요금 (식사 / O박 요금 / O박 추가)
};

export default function NewLandRatePage() {
  const [resortName, setResortName] = useState("");

  const [rateRows, setRateRows] = useState<RateRow[]>([
    {
      stayPeriod: "",
      roomType: "",
      plan1: { meal: "", nightsLabel: "", price: "", extraNightPrice: "" },
      plan2: { meal: "", nightsLabel: "", price: "", extraNightPrice: "" },
    },
  ]);

  const [saleNotes, setSaleNotes] = useState("");          // 판매 시 유의 사항
  const [inclusions, setInclusions] = useState("");        // 포함사항
  const [exclusions, setExclusions] = useState("");        // 불포함사항
  const [resortBenefits, setResortBenefits] = useState(""); // 리조트 제공 사항
  const [honeymoonBenefits, setHoneymoonBenefits] = useState(""); // 허니문 특전
  const [hbBenefits, setHbBenefits] = useState("");        // HB 제공 사항
  const [aiBenefits, setAiBenefits] = useState("");        // AI 제공 사항
  const [paymentAndCancel, setPaymentAndCancel] = useState(""); // 입금 및 취소 규정
  const [extraCancel, setExtraCancel] = useState("");      // 추가 취소

  const handleRateRowChange = (
    rowIndex: number,
    field: keyof RateRow,
    value: string
  ) => {
    setRateRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = { ...copy[rowIndex], [field]: value };
      return copy;
    });
  };

  const handleRatePlanChange = (
    rowIndex: number,
    planKey: "plan1" | "plan2",
    field: keyof RatePlan,
    value: string
  ) => {
    setRateRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = {
        ...copy[rowIndex],
        [planKey]: {
          ...copy[rowIndex][planKey],
          [field]: value,
        },
      };
      return copy;
    });
  };

  const addRateRow = () => {
    setRateRows((prev) => [
      ...prev,
      {
        stayPeriod: "",
        roomType: "",
        plan1: { meal: "", nightsLabel: "", price: "", extraNightPrice: "" },
        plan2: { meal: "", nightsLabel: "", price: "", extraNightPrice: "" },
      },
    ]);
  };

  const removeRateRow = (index: number) => {
    setRateRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      resortName,
      rateRows,
      saleNotes,
      inclusions,
      exclusions,
      resortBenefits,
      honeymoonBenefits,
      hbBenefits,
      aiBenefits,
      paymentAndCancel,
      extraCancel,
    };

    try {
      const res = await fetch("/api/land/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("요금표가 저장되었습니다.");
        window.location.href = "/land/rates"; // 목록 페이지로 이동
      } else {
        alert("저장 실패. 콘솔을 확인하세요.");
        console.error(data);
      }
    } catch (err) {
      console.error(err);
      alert("요금표 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">랜드사 요금표 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 리조트명 */}
        <section className="space-y-2">
          <label className="block font-medium">리조트명</label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="예) 말디브 ○○ 리조트"
            value={resortName}
            onChange={(e) => setResortName(e.target.value)}
          />
        </section>

        {/* 투숙기간 / 객실 / 식사 / N박 요금 / 1박 추가 / 식사 / N박 요금 / 1박 추가 */}
        <section className="space-y-3">
          <h2 className="font-medium">
            투숙기간 / 객실 / 식사 / N박 요금 / 1박 추가 / 식사 / N박 요금 / 1박 추가
          </h2>
          <p className="text-sm text-gray-500">
            한 줄에 하나의 요금조건을 입력하고, 필요 시 행 추가 버튼으로 여러 조건을 등록하세요.
          </p>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border-b text-left">투숙기간</th>
                  <th className="px-3 py-2 border-b text-left">객실</th>

                  <th className="px-3 py-2 border-b text-left">식사</th>
                  <th className="px-3 py-2 border-b text-left">N박</th>
                  <th className="px-3 py-2 border-b text-left">N박 요금</th>
                  <th className="px-3 py-2 border-b text-left">1박 추가</th>

                  <th className="px-3 py-2 border-b text-left">식사</th>
                  <th className="px-3 py-2 border-b text-left">N박</th>
                  <th className="px-3 py-2 border-b text-left">N박 요금</th>
                  <th className="px-3 py-2 border-b text-left">1박 추가</th>

                  <th className="px-3 py-2 border-b text-left w-16">삭제</th>
                </tr>
              </thead>
              <tbody>
                {rateRows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 24/05/01~24/06/30"
                        value={row.stayPeriod}
                        onChange={(e) =>
                          handleRateRowChange(index, "stayPeriod", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 워터빌라"
                        value={row.roomType}
                        onChange={(e) =>
                          handleRateRowChange(index, "roomType", e.target.value)
                        }
                      />
                    </td>

                    {/* Plan1 */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) HB"
                        value={row.plan1.meal}
                        onChange={(e) =>
                          handleRatePlanChange(index, "plan1", "meal", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 3박"
                        value={row.plan1.nightsLabel}
                        onChange={(e) =>
                          handleRatePlanChange(index, "plan1", "nightsLabel", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 2,000,000"
                        value={row.plan1.price}
                        onChange={(e) =>
                          handleRatePlanChange(index, "plan1", "price", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 300,000"
                        value={row.plan1.extraNightPrice}
                        onChange={(e) =>
                          handleRatePlanChange(
                            index,
                            "plan1",
                            "extraNightPrice",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    {/* Plan2 */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) AI"
                        value={row.plan2.meal}
                        onChange={(e) =>
                          handleRatePlanChange(index, "plan2", "meal", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 4박"
                        value={row.plan2.nightsLabel}
                        onChange={(e) =>
                          handleRatePlanChange(index, "plan2", "nightsLabel", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 2,500,000"
                        value={row.plan2.price}
                        onChange={(e) =>
                          handleRatePlanChange(index, "plan2", "price", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-full border rounded-md px-2 py-1"
                        placeholder="예) 350,000"
                        value={row.plan2.extraNightPrice}
                        onChange={(e) =>
                          handleRatePlanChange(
                            index,
                            "plan2",
                            "extraNightPrice",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="px-2 py-2 text-center align-middle">
                      {rateRows.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-600 underline"
                          onClick={() => removeRateRow(index)}
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn outline-black mt-2"
            onClick={addRateRow}
          >
            행 추가
          </button>
        </section>

        {/* 텍스트 영역들 */}
        <section className="space-y-4">
          <TextareaField
            label="판매 시 유의 사항"
            value={saleNotes}
            onChange={setSaleNotes}
          />
          <TextareaField
            label="포함사항"
            value={inclusions}
            onChange={setInclusions}
          />
          <TextareaField
            label="불포함사항"
            value={exclusions}
            onChange={setExclusions}
          />
          <TextareaField
            label="리조트 제공 사항"
            value={resortBenefits}
            onChange={setResortBenefits}
          />
          <TextareaField
            label="허니문 특전"
            value={honeymoonBenefits}
            onChange={setHoneymoonBenefits}
          />
          <TextareaField
            label="HB 제공 사항"
            value={hbBenefits}
            onChange={setHbBenefits}
          />
          <TextareaField
            label="AI 제공 사항"
            value={aiBenefits}
            onChange={setAiBenefits}
          />
          <TextareaField
            label="입금 및 취소 규정"
            value={paymentAndCancel}
            onChange={setPaymentAndCancel}
          />
          <TextareaField
            label="추가 취소"
            value={extraCancel}
            onChange={setExtraCancel}
          />
        </section>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn outline-black"
            onClick={() => history.back()}
          >
            취소
          </button>
          <button type="submit" className="btn black">
            요금표 저장
          </button>
        </div>
      </form>
    </div>
  );
}

type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

function TextareaField({ label, value, onChange }: TextareaFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block font-medium">{label}</label>
      <textarea
        className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
