// /src/app/admin/itineraries/ItineraryRowActions.tsx
// 일정표 리스트에서 각 행의 "수정 / 삭제" 버튼 담당 클라이언트 컴포넌트

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
};

export function ItineraryRowActions({ id }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("정말 이 일정표를 삭제하시겠습니까?")) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/itineraries/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let message = "삭제 중 오류가 발생했습니다.";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        alert(message);
        return;
      }

      // 삭제 성공 후 리스트 새로고침
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        justifyContent: "flex-end",
      }}
    >
      {/* ✅ 수정: 별도 수정 페이지로 이동 */}
      <Link href={`/admin/itineraries/${id}/edit`} className="btn white">
        수정
      </Link>

      {/* 삭제 */}
      <button
        type="button"
        onClick={handleDelete}
        className="btn outline-black"
        disabled={deleting}
      >
        {deleting ? "삭제 중..." : "삭제"}
      </button>
    </div>
  );
}
