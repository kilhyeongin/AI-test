// src/components/editor/ItineraryTableBlock.tsx
"use client";

import { TiptapEditor } from "./TiptapEditor";

export function ItineraryTableBlock({
  value,
  onChange,
}: {
  value: any;
  onChange: (json: any) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">일정표</h2>
      <p className="text-xs text-gray-500">
        표 안의 “일정” 칸은 자유 편집이 가능합니다.
      </p>
      <TiptapEditor
        value={value}
        onChange={onChange}
        placeholder="표를 삽입해 날짜 | 지역 | 교통 | 시간 | 일정 | 식사를 구성하세요"
      />
    </div>
  );
}
