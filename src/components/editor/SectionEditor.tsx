// src/components/editor/SectionEditor.tsx
"use client";

import React from "react";
import { TiptapEditor } from "./TiptapEditor";

export type SectionBlock = {
  id: string;
  key: string;
  title: string;
  enabled: boolean;
  contentJson: any;
};

export function SectionEditor({
  section,
  onToggle,
  onChange,
}: {
  section: SectionBlock;
  onToggle: () => void;
  onChange: (next: any) => void;
}) {
  if (!section.enabled) {
    return (
      <button type="button" className="btn outline-black" onClick={onToggle}>
        + {section.title} 추가
      </button>
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{section.title}</div>
        <button type="button" className="text-xs text-red-600 underline" onClick={onToggle}>
          제거
        </button>
      </div>

      <TiptapEditor
        value={section.contentJson}
        onChange={onChange}
        placeholder={`${section.title} 내용을 자유롭게 작성하세요`}
        minHeight={140}
      />
    </div>
  );
}
