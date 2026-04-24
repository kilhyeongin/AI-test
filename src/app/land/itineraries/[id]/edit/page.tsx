// src/app/land/itineraries/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LandItineraryEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const r = await fetch(`/api/land/itineraries/${id}`, {
          cache: "no-store",
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          alert(d?.error || "여행일정을 불러오지 못했습니다.");
          router.push("/land/itineraries");
          return;
        }

        const it = d.itinerary as { title?: string; name?: string; memo?: string };
        setTitle(it.title || it.name || "");
        setMemo(it.memo || "");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      const r = await fetch(`/api/land/itineraries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, memo }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        alert(d?.error || "저장에 실패했습니다.");
        return;
      }
      alert("여행일정 정보가 저장되었습니다.");
      router.push(`/land/itineraries/${id}`);
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">여행일정 수정</h1>
        {/* ✅ next lint 대응: a 대신 Link 쓰는 게 정석이지만, 빌드 막는 규칙이 아니면 일단 유지 가능
            다만 너 프로젝트는 빌드에서 a 경고/에러가 뜬 적이 있어서 Link로 바꾸는 걸 권장 */}
        <a href={`/land/itineraries/${id}`} className="text-sm underline">
          상세로 돌아가기
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="block text-sm font-medium">상품명 / 제목</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="상품명 또는 일정 제목을 입력하세요."
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">메모 / 비고</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[120px]"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="내부 참고용 메모나 비고를 입력하세요."
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn outline-black"
            onClick={() => router.back()}
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
