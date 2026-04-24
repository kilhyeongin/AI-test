// src/app/land/rates/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RateText = {
  saleNotes: string;
  inclusions: string;
  exclusions: string;
  resortBenefits: string;
  honeymoonBenefits: string;
  hbBenefits: string;
  aiBenefits: string;
  paymentAndCancel: string;
  extraCancel: string;
};

export default function LandRateEditPage() {
  const router = useRouter();

  // ✅ Next 15 빌드 타입 에러 방지: client page에서는 params를 props로 받지 말고 useParams로 받기
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [resortName, setResortName] = useState("");
  const [values, setValues] = useState<RateText>({
    saleNotes: "",
    inclusions: "",
    exclusions: "",
    resortBenefits: "",
    honeymoonBenefits: "",
    hbBenefits: "",
    aiBenefits: "",
    paymentAndCancel: "",
    extraCancel: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ✅ id가 아직 준비 안 된 최초 렌더 대응
    if (!id) return;

    (async () => {
      try {
        const r = await fetch(`/api/land/rates/${id}`, {
          cache: "no-store",
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          alert(d?.error || "요금표를 불러오지 못했습니다.");
          router.push("/land/rates");
          return;
        }

        const rate = d.rate as any;
        setResortName(rate.resortName || "");

        setValues((prev) => ({
          ...prev,
          saleNotes: rate.saleNotes || "",
          inclusions: rate.inclusions || "",
          exclusions: rate.exclusions || "",
          resortBenefits: rate.resortBenefits || "",
          honeymoonBenefits: rate.honeymoonBenefits || "",
          hbBenefits: rate.hbBenefits || "",
          aiBenefits: rate.aiBenefits || "",
          paymentAndCancel: rate.paymentAndCancel || "",
          extraCancel: rate.extraCancel || "",
        }));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleChange = (field: keyof RateText, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      const r = await fetch(`/api/land/rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        alert(d?.error || "저장에 실패했습니다.");
        return;
      }

      alert("요금표 텍스트가 저장되었습니다.");
      router.push(`/land/rates/${id}`);
    } finally {
      setSaving(false);
    }
  };

  // ✅ id 없는 상태에서의 방어 (직접 접근/라우팅 타이밍)
  if (!id) {
    return <div className="p-6 text-sm">잘못된 접근입니다.</div>;
  }

  if (loading) {
    return <div className="p-6 text-sm">불러오는 중…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          요금표 텍스트 수정 – {resortName}
        </h1>

        {/* 기존 a 유지 (원하면 Link로 바꿔도 됨) */}
        <a href={`/land/rates/${id}`} className="text-sm underline">
          상세로 돌아가기
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <RateTextarea
          label="판매 시 유의 사항"
          value={values.saleNotes}
          onChange={(v) => handleChange("saleNotes", v)}
        />
        <RateTextarea
          label="포함사항"
          value={values.inclusions}
          onChange={(v) => handleChange("inclusions", v)}
        />
        <RateTextarea
          label="불포함사항"
          value={values.exclusions}
          onChange={(v) => handleChange("exclusions", v)}
        />
        <RateTextarea
          label="리조트 제공 사항"
          value={values.resortBenefits}
          onChange={(v) => handleChange("resortBenefits", v)}
        />
        <RateTextarea
          label="허니문 특전"
          value={values.honeymoonBenefits}
          onChange={(v) => handleChange("honeymoonBenefits", v)}
        />
        <RateTextarea
          label="HB 제공 사항"
          value={values.hbBenefits}
          onChange={(v) => handleChange("hbBenefits", v)}
        />
        <RateTextarea
          label="AI 제공 사항"
          value={values.aiBenefits}
          onChange={(v) => handleChange("aiBenefits", v)}
        />
        <RateTextarea
          label="입금 및 취소 규정"
          value={values.paymentAndCancel}
          onChange={(v) => handleChange("paymentAndCancel", v)}
        />
        <RateTextarea
          label="추가 취소"
          value={values.extraCancel}
          onChange={(v) => handleChange("extraCancel", v)}
        />

        <div className="flex justify-end gap-2">
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
      </form>
    </div>
  );
}

type AreaProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

function RateTextarea({ label, value, onChange }: AreaProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <textarea
        className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label}을(를) 입력하세요.`}
      />
    </div>
  );
}
