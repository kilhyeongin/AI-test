// src/components/editor/TiptapEditor.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Link as LinkIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Eraser,
  Maximize2,
  Minimize2,
  Heading1,
  Heading2,
  Heading3,
  Strikethrough,
  Code,
  Check,
  X,
  Palette,
} from "lucide-react";

type AnyJson = any;

type Props = {
  /**
   * ✅ HTML(string) 또는 JSON(객체) 모두 지원
   * - string이면 HTML 모드
   * - object면 JSON 모드
   */
  value?: string | AnyJson;

  /** (구버전 호환) JSON 변경 콜백: SectionEditor에서 사용 */
  onChange?: (nextJson: AnyJson) => void;

  /** HTML 변경 콜백: itinerary 페이지에서 사용 */
  onChangeHTML?: (html: string) => void;

  /** JSON 변경 콜백(명확한 이름) */
  onChangeJSON?: (json: AnyJson) => void;

  placeholder?: string;
  minHeight?: number;
};

function cls(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function isProbablyJson(v: unknown) {
  return typeof v === "object" && v !== null;
}

function normalizeHtml(html?: string) {
  const h = String(html ?? "").trim();
  return h ? h : "<p></p>";
}

const PRESET_COLORS = [
  "#0f172a",
  "#475569",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function TiptapEditor({
  value,
  onChange,
  onChangeHTML,
  onChangeJSON,
  placeholder,
  minHeight = 140,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");

  const [openColor, setOpenColor] = useState(false);
  const [customColor, setCustomColor] = useState("#298544");
  const colorBtnRef = useRef<HTMLButtonElement | null>(null);

  const [colorPos, setColorPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // ✅ 외부 value 반영 중 onUpdate 루프 방지
  const applyingExternalRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // ✅ 현재 값이 JSON 모드인지 HTML 모드인지 결정
  const jsonMode = isProbablyJson(value);

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),

      ListItem,
      BulletList.configure({ keepMarks: true, keepAttributes: true }),
      OrderedList.configure({ keepMarks: true, keepAttributes: true }),

      TaskList,
      TaskItem.configure({ nested: true }),

      Underline,
      Highlight.configure({ multicolor: false }),

      TextStyle,
      Color.configure({ types: ["textStyle"] }),

      TextAlign.configure({ types: ["heading", "paragraph"] }),

      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      Placeholder.configure({
        placeholder: placeholder ?? "내용을 입력하세요",
      }),
    ],

    // ✅ 초기 content: JSON이면 JSON, 아니면 HTML
    content: jsonMode ? (value as AnyJson) : normalizeHtml(value as string),

    onUpdate({ editor }) {
      if (htmlMode) return;
      if (applyingExternalRef.current) return;

      // ✅ JSON 모드면 JSON 콜백, HTML 모드면 HTML 콜백
      if (jsonMode) {
        const json = editor.getJSON();
        onChangeJSON?.(json);
        onChange?.(json); // 구버전 호환
      } else {
        const html = editor.getHTML();
        onChangeHTML?.(html);
      }
    },

    editorProps: {
      attributes: { class: "tiptap-root" },
    },
  });

  // ✅ 외부 value 변경 반영 (JSON/HTML 각각 방식 다르게)
  useEffect(() => {
    if (!editor) return;
    if (htmlMode) return;

    // JSON 모드: JSON 비교는 깊은 비교 비용이 크므로 "일단 setContent 하되 emitUpdate:false"
    if (jsonMode) {
      applyingExternalRef.current = true;
      editor.commands.setContent((value as AnyJson) ?? { type: "doc", content: [] }, {
        emitUpdate: false,
      } as any);
      queueMicrotask(() => {
        applyingExternalRef.current = false;
      });
      return;
    }

    // HTML 모드: 문자열 비교로만
    const next = normalizeHtml(value as string);
    const curr = normalizeHtml(editor.getHTML());
    if (curr !== next) {
      applyingExternalRef.current = true;
      editor.commands.setContent(next, { emitUpdate: false });
      queueMicrotask(() => {
        applyingExternalRef.current = false;
      });
    }
  }, [value, editor, htmlMode, jsonMode]);

  // 컬러 패널 위치
  const calcColorPos = () => {
    const el = colorBtnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setColorPos({
      top: rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - 260),
    });
  };

  useEffect(() => {
    if (!openColor) return;

    const onDown = (e: MouseEvent) => {
      const panel = document.querySelector(".tt-color-panel");
      const btn = colorBtnRef.current;
      const t = e.target as Node;
      if (panel && panel.contains(t)) return;
      if (btn && btn.contains(t)) return;
      setOpenColor(false);
    };

    const onResize = () => calcColorPos();
    const onScroll = () => calcColorPos();

    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openColor]);

  if (!editor) return null;

  const Btn = ({
    active,
    onClick,
    children,
    title,
    disabled,
    className,
    btnRef,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
    disabled?: boolean;
    className?: string;
    btnRef?: React.Ref<HTMLButtonElement>;
  }) => (
    <button
      ref={btnRef as any}
      type="button"
      title={title}
      disabled={disabled}
      className={cls("tt-btn", className, active && "is-active", disabled && "is-disabled")}
      onClick={onClick}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "");
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 6, cols: 6, withHeaderRow: true }).run();
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
    // 콜백 한번 더 반영
    if (jsonMode) {
      const json = editor.getJSON();
      onChangeJSON?.(json);
      onChange?.(json);
    } else {
      onChangeHTML?.(editor.getHTML());
    }
  };

  // HTML 소스 모드(HTML일 때만 의미)
  const enterHtmlMode = () => {
    setHtmlDraft(editor.getHTML());
    setHtmlMode(true);
    setOpenColor(false);
  };
  const cancelHtmlMode = () => {
    setHtmlMode(false);
    setHtmlDraft("");
  };
  const applyHtmlMode = () => {
    try {
      applyingExternalRef.current = true;
      editor.commands.setContent(normalizeHtml(htmlDraft), { emitUpdate: false });
      queueMicrotask(() => {
        applyingExternalRef.current = false;
      });
      onChangeHTML?.(editor.getHTML());
      setHtmlMode(false);
      setHtmlDraft("");
    } catch (e) {
      console.error(e);
      alert("HTML 적용에 실패했습니다. (태그 구조를 확인해 주세요)");
    }
  };

  const applyTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    if (jsonMode) {
      const json = editor.getJSON();
      onChangeJSON?.(json);
      onChange?.(json);
    } else {
      onChangeHTML?.(editor.getHTML());
    }
    setOpenColor(false);
  };

  const clearTextColor = () => {
    editor.chain().focus().unsetColor().run();
    if (jsonMode) {
      const json = editor.getJSON();
      onChangeJSON?.(json);
      onChange?.(json);
    } else {
      onChangeHTML?.(editor.getHTML());
    }
    setOpenColor(false);
  };

  const toggleColorPanel = () => {
    if (htmlMode) return;
    const next = !openColor;
    if (next) calcColorPos();
    setOpenColor(next);
  };

  const disableToolbar = htmlMode;

  return (
    <div className={cls("tiptap-editor", fullscreen && "is-fullscreen")}>
      <div className="tt-toolbar">
        <div className="tt-left">
          <Btn title="굵게" active={editor.isActive("bold")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </Btn>
          <Btn title="기울임" active={editor.isActive("italic")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </Btn>
          <Btn title="밑줄" active={editor.isActive("underline")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={16} />
          </Btn>
          <Btn title="취소선" active={editor.isActive("strike")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough size={16} />
          </Btn>
          <Btn title="형광펜" active={editor.isActive("highlight")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <Highlighter size={16} />
          </Btn>

          <Btn title="글씨색" disabled={disableToolbar} onClick={toggleColorPanel} className="tt-color-pop" btnRef={colorBtnRef}>
            <Palette size={16} />
          </Btn>

          <span className="tt-sep" />

          <Btn title="제목 1" active={editor.isActive("heading", { level: 1 })} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 size={16} />
          </Btn>
          <Btn title="제목 2" active={editor.isActive("heading", { level: 2 })} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={16} />
          </Btn>
          <Btn title="제목 3" active={editor.isActive("heading", { level: 3 })} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 size={16} />
          </Btn>

          <span className="tt-sep" />

          <Btn title="왼쪽 정렬" active={editor.isActive({ textAlign: "left" })} disabled={disableToolbar} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft size={16} />
          </Btn>
          <Btn title="가운데 정렬" active={editor.isActive({ textAlign: "center" })} disabled={disableToolbar} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter size={16} />
          </Btn>
          <Btn title="오른쪽 정렬" active={editor.isActive({ textAlign: "right" })} disabled={disableToolbar} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight size={16} />
          </Btn>
          <Btn title="양쪽 정렬" active={editor.isActive({ textAlign: "justify" })} disabled={disableToolbar} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <AlignJustify size={16} />
          </Btn>

          <span className="tt-sep" />

          <Btn title="글머리 목록" active={editor.isActive("bulletList")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </Btn>
          <Btn title="번호 목록" active={editor.isActive("orderedList")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={16} />
          </Btn>
          <Btn title="체크리스트" active={editor.isActive("taskList")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ListChecks size={16} />
          </Btn>

          <span className="tt-sep" />

          <Btn title="인용문" active={editor.isActive("blockquote")} disabled={disableToolbar} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={16} />
          </Btn>
          <Btn title="구분선" disabled={disableToolbar} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={16} />
          </Btn>

          <span className="tt-sep" />

          <Btn title="링크" active={editor.isActive("link")} disabled={disableToolbar} onClick={setLink}>
            <LinkIcon size={16} />
          </Btn>
          <Btn title="표 삽입" disabled={disableToolbar} onClick={insertTable}>
            <TableIcon size={16} />
          </Btn>

          <span className="tt-sep" />

          <Btn title="서식 제거" disabled={disableToolbar} onClick={clearFormatting}>
            <Eraser size={16} />
          </Btn>
        </div>

        <div className="tt-right">
          <Btn title="실행취소" disabled={disableToolbar} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </Btn>
          <Btn title="다시실행" disabled={disableToolbar} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </Btn>

          <Btn title={fullscreen ? "전체화면 종료" : "전체화면"} active={fullscreen} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Btn>

          {/* ✅ HTML 소스 편집은 HTML 모드일 때만 표시(=jsonMode false) */}
          {!jsonMode && !htmlMode ? (
            <Btn title="HTML 소스 편집" onClick={enterHtmlMode}>
              <Code size={16} />
            </Btn>
          ) : null}

          {!jsonMode && htmlMode ? (
            <>
              <Btn title="HTML 적용" onClick={applyHtmlMode}>
                <Check size={16} />
              </Btn>
              <Btn title="HTML 취소" onClick={cancelHtmlMode}>
                <X size={16} />
              </Btn>
            </>
          ) : null}
        </div>
      </div>

      <div className="tt-body" style={{ minHeight }}>
        {!htmlMode ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="tt-html-wrap">
            <div className="tt-html-top">
              <div className="tt-html-title">HTML 소스</div>
              <div className="tt-html-hint">적용(✓)을 누르면 HTML이 에디터에 반영됩니다.</div>
            </div>
            <textarea
              className="tt-html"
              value={htmlDraft}
              onChange={(e) => setHtmlDraft(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {mounted && openColor && !htmlMode && colorPos
        ? createPortal(
            <div
              className="tt-color-panel"
              style={{
                position: "fixed",
                top: colorPos.top,
                left: colorPos.left,
                zIndex: 10000,
              }}
            >
              <div className="tt-color-grid">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="tt-color-dot"
                    style={{ background: c }}
                    title={c}
                    onClick={() => applyTextColor(c)}
                  />
                ))}
              </div>

              <div className="tt-color-custom">
                <div className="tt-color-custom-left">
                  <input
                    className="tt-color-picker"
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    aria-label="커스텀 색상 선택"
                  />
                  <input
                    className="tt-color-hex"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <button type="button" className="tt-color-apply" onClick={() => applyTextColor(customColor || "#0f172a")}>
                  적용
                </button>
              </div>

              <button type="button" className="tt-color-clear" onClick={clearTextColor}>
                색 제거
              </button>
            </div>,
            document.body
          )
        : null}

      <style jsx global>{`
        .tiptap-editor {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .tiptap-editor.is-fullscreen {
          position: fixed;
          inset: 10px;
          z-index: 9999;
          border-radius: 18px;
          height: calc(100vh - 20px);
          display: flex;
          flex-direction: column;
        }

        .tiptap-editor:focus-within {
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
        }

        .tiptap-editor .tt-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .tiptap-editor .tt-left,
        .tiptap-editor .tt-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .tiptap-editor .tt-sep {
          width: 1px;
          height: 16px;
          background: #e5e7eb;
          margin: 0 4px;
        }

        .tiptap-editor .tt-btn {
          appearance: none;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 10px;
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .tiptap-editor .tt-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .tiptap-editor .tt-btn.is-active {
          background: #0f172a;
          border-color: #0f172a;
          color: #ffffff;
        }

        .tiptap-editor .tt-btn.is-disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .tiptap-editor .tt-body {
          padding: 10px;
          background: #ffffff;
          flex: 1;
        }

        .tiptap-editor .ProseMirror {
          color: #0f172a !important;
          caret-color: #0f172a !important;

          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          outline: none;

          font-size: 14px;
          line-height: 1.7;
        }

        .tiptap-editor .ProseMirror a {
          text-decoration: underline;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          padding-left: 1.25rem;
          margin: 0.4rem 0;
        }

        .tiptap-editor .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 12px;
          color: #334155;
          margin: 0.6rem 0;
        }

        .tiptap-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 12px 0;
        }

        .tiptap-editor .ProseMirror mark {
          background: #fde68a;
          padding: 0 2px;
          border-radius: 4px;
        }

        .tiptap-editor .ProseMirror table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }
        .tiptap-editor .ProseMirror th,
        .tiptap-editor .ProseMirror td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          vertical-align: top;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .tiptap-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .tiptap-editor .ProseMirror li[data-type="taskItem"] > label {
          margin-top: 2px;
        }

        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .tiptap-editor .ProseMirror h1 {
          font-size: 24px;
          font-weight: 900;
          line-height: 1.25;
          margin: 0.6rem 0 0.4rem;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.3;
          margin: 0.55rem 0 0.35rem;
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 17px;
          font-weight: 900;
          line-height: 1.35;
          margin: 0.5rem 0 0.3rem;
        }

        .tiptap-editor .tt-html-wrap {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tiptap-editor .tt-html-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
        }
        .tiptap-editor .tt-html-title {
          font-weight: 800;
          color: #0f172a;
        }
        .tiptap-editor .tt-html-hint {
          color: #64748b;
          font-size: 12px;
        }
        .tiptap-editor .tt-html {
          width: 100%;
          flex: 1;
          resize: none;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          white-space: pre;
          overflow: auto;
        }
        .tiptap-editor .tt-html:focus {
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
        }

        .tt-color-pop {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .tt-color-panel {
          width: 248px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
          padding: 10px;
          overflow: hidden;
        }
        .tt-color-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
        }
        .tt-color-dot {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          cursor: pointer;
        }
        .tt-color-custom {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .tt-color-custom-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .tt-color-picker {
          width: 34px;
          height: 34px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0;
          background: #fff;
          cursor: pointer;
        }
        .tt-color-hex {
          flex: 1;
          min-width: 0;
          height: 34px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0 10px;
          font-size: 12px;
          color: #0f172a;
          outline: none;
        }
        .tt-color-apply {
          height: 34px;
          border: 1px solid #0f172a;
          background: #0f172a;
          color: #fff;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .tt-color-panel .tt-color-clear {
          margin-top: 10px;
          width: 100%;
          height: 34px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 10px;
          font-size: 12px;
          color: #0f172a;
          cursor: pointer;
        }
        .tt-color-panel .tt-color-clear:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
