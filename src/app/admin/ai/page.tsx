"use client";

import { useEffect, useRef, useState } from "react";

const STANDARD_HEADERS = ["상품명", "룸타입", "기간", "1인요금", "통화", "포함사항", "특이사항"];
const ITINERARY_HEADERS = ["일차", "지역", "교통편", "일정내용", "선택관광", "숙박", "식사", "특이사항"];

type KnowledgeEntry = {
  _id: string;
  fileName: string;
  fileType: string;
  docType?: "rate" | "itinerary";
  sheetName?: string;
  headers: string[];
  rows: Record<string, string>[];
  createdAt: string;
  category?: string;
  validFrom?: string;
  validTo?: string;
};

type DraftEntry = {
  _id: string;
  fileName: string;
  sheetName?: string;
  summary?: string;
  rows: Record<string, string>[];
  status: "pending" | "approved" | "rejected";
  docType?: "rate" | "itinerary";
  category?: string;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Tab = "knowledge" | "review" | "test" | "margin";

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

// 셀 내용을 · 줄바꿈 형식으로 렌더링
function renderCell(value: string | undefined): React.ReactNode {
  if (!value || value === "—") return <span style={{ color: "#cbd5e1" }}>—</span>;
  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return <span>{value}</span>;
  return (
    <span>
      {lines.map((line, i) => (
        <span key={i} style={{ display: "block", lineHeight: 1.7 }}>
          {line.startsWith("·") ? line : `· ${line}`}
        </span>
      ))}
    </span>
  );
}

export default function AdminAiPage() {
  const [tab, setTab] = useState<Tab>("knowledge");

  // 지식베이스
  const [list, setList] = useState<KnowledgeEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadValidFrom, setUploadValidFrom] = useState("");
  const [uploadValidTo, setUploadValidTo] = useState("");
  const [uploadDocType, setUploadDocType] = useState<"rate" | "itinerary">("rate");
  // 파일별 활성 시트 인덱스: key = `${cat}___${fileName}`
  const [activeSheets, setActiveSheets] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // 검토
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ draftId: string; rowIdx: number; col: string } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState("");

  // 수익 설정
  const [marginType, setMarginType] = useState<"fixed" | "percentage">("fixed");
  const [marginAmount, setMarginAmount] = useState(0);
  const [marginSaving, setMarginSaving] = useState(false);
  const [marginMsg, setMarginMsg] = useState("");

  // 챗봇 테스트
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "관리자 테스트 모드입니다. 고객이 입력할 질문을 테스트해보세요." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  async function loadList() {
    const res = await fetch("/api/admin/ai/knowledge");
    const data = await res.json();
    if (data.ok) {
      setList(data.list);
      const cats = new Set<string>(data.list.map((e: KnowledgeEntry) => e.category || "미분류"));
      setOpenFolders(cats);
    } else {
      setUploadMsg(`❌ 목록 조회 오류: ${data.error}`);
    }
  }

  async function loadDrafts() {
    setDraftLoading(true);
    const res = await fetch("/api/admin/ai/draft");
    const data = await res.json();
    if (data.ok) setDrafts(data.drafts);
    setDraftLoading(false);
  }

  async function approveDraft(id: string) {
    setDraftMsg("");
    const draft = drafts.find((d) => d._id === id);
    const res = await fetch("/api/admin/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", ids: [id] }),
    });
    const data = await res.json();
    if (data.ok) {
      if (draft?.docType) setUploadDocType(draft.docType);
      setDraftMsg("✅ 승인되어 지식베이스에 반영되었습니다.");
      loadDrafts();
      loadList();
    }
    else setDraftMsg(`❌ ${data.error}`);
  }

  async function rejectDraft(id: string) {
    if (!confirm("이 시트를 반려할까요?")) return;
    const res = await fetch("/api/admin/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", ids: [id] }),
    });
    const data = await res.json();
    if (data.ok) { setDraftMsg("반려 처리되었습니다."); loadDrafts(); }
    else setDraftMsg(`❌ ${data.error}`);
  }

  async function deleteDraft(id: string) {
    if (!confirm("이 검토 항목을 삭제할까요?")) return;
    const res = await fetch("/api/admin/ai/draft", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.ok) loadDrafts();
  }

  async function reanalyzeDraft(id: string) {
    setReanalyzingId(id);
    setDraftMsg("");
    const res = await fetch("/api/admin/ai/draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.ok) {
      setDraftMsg(data.rowCount > 0
        ? `✅ 재분석 완료 — ${data.rowCount}행 추출됨`
        : "⚠️ 재분석했지만 구조화 가능한 데이터를 찾지 못했습니다.");
      loadDrafts();
    } else {
      setDraftMsg(`❌ 재분석 실패: ${data.error}`);
    }
    setReanalyzingId(null);
  }

  async function approveAllByFile(fileName: string) {
    const targets = drafts.filter((d) => d.fileName === fileName && d.status === "pending");
    if (!targets.length) return;
    if (!confirm(`"${fileName}"의 ${targets.length}개 시트를 모두 승인할까요?`)) return;
    setDraftMsg("");
    const res = await fetch("/api/admin/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", ids: targets.map((t) => t._id) }),
    });
    const data = await res.json();
    if (data.ok) {
      const docType = targets[0]?.docType;
      if (docType) setUploadDocType(docType);
      setDraftMsg(`✅ ${targets.length}개 시트 승인 완료`);
      loadDrafts();
      loadList();
    }
    else setDraftMsg(`❌ ${data.error}`);
  }

  function updateDraftCell(draftId: string, rowIdx: number, col: string, value: string) {
    setDrafts((prev) => prev.map((d) => {
      if (d._id !== draftId) return d;
      const rows = d.rows.map((r, i) => i === rowIdx ? { ...r, [col]: value } : r);
      return { ...d, rows };
    }));
  }

  async function saveDraftRows(draftId: string) {
    const draft = drafts.find((d) => d._id === draftId);
    if (!draft) return;
    await fetch("/api/admin/ai/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draftId, rows: draft.rows }),
    });
  }

  async function loadMarginSettings() {
    const res = await fetch("/api/admin/ai/settings");
    const data = await res.json();
    if (data.ok && data.settings) {
      setMarginType(data.settings.marginType ?? "fixed");
      setMarginAmount(data.settings.marginAmount ?? 0);
    }
  }

  async function saveMarginSettings() {
    setMarginSaving(true);
    setMarginMsg("");
    const res = await fetch("/api/admin/ai/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marginType, marginAmount }),
    });
    const data = await res.json();
    setMarginMsg(data.ok ? "✅ 저장되었습니다." : `❌ 오류: ${data.error}`);
    setMarginSaving(false);
  }

  useEffect(() => { loadList(); loadMarginSettings(); loadDrafts(); }, []);
  useEffect(() => { if (tab === "review") loadDrafts(); }, [tab]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["xlsx", "xls", "csv", "pdf"].includes(fileExt)) {
      setUploadMsg("❌ xlsx, xls, csv, pdf 파일만 업로드할 수 있습니다.");
      return;
    }
    if (!uploadCategory.trim()) {
      setUploadMsg("❌ 여행지(카테고리)를 입력해주세요.");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", uploadCategory.trim());
    fd.append("validFrom", uploadValidFrom);
    fd.append("validTo", uploadValidTo);
    fd.append("docType", uploadDocType);

    const res = await fetch("/api/admin/ai/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.ok) {
      if (fileRef.current) fileRef.current.value = "";
      setUploadCategory("");
      setUploadValidFrom("");
      setUploadValidTo("");
      await loadDrafts();
      setTab("review");
    } else {
      setUploadMsg(`❌ 오류: ${data.error}`);
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("이 데이터를 삭제할까요?")) return;
    await fetch("/api/admin/ai/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadList();
  }

  async function handleDeleteFile(fileName: string, category: string) {
    if (!confirm(`"${fileName}" 파일의 모든 시트를 삭제할까요?`)) return;
    const targets = list.filter((e) => e.fileName === fileName && (e.category || "미분류") === category);
    for (const t of targets) {
      await fetch("/api/admin/ai/knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t._id }),
      });
    }
    loadList();
  }

  async function sendTestMessage() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/ai/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setChatMessages([...newMessages, {
        role: "assistant",
        content: data.ok ? data.reply : `오류: ${data.error}`,
      }]);
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "네트워크 오류가 발생했습니다." }]);
    }
    setChatLoading(false);
  }

  async function renameCategory(oldCategory: string, newCategory: string) {
    if (!newCategory.trim() || newCategory.trim() === oldCategory) {
      setEditingCat(null);
      return;
    }
    const res = await fetch("/api/admin/ai/knowledge", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldCategory, newCategory: newCategory.trim() }),
    });
    const data = await res.json();
    if (data.ok) { setEditingCat(null); loadList(); }
  }

  function toggleFolder(cat: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function getActiveSheet(cat: string, fileName: string) {
    return activeSheets[`${cat}___${fileName}`] ?? 0;
  }

  function setActiveSheet(cat: string, fileName: string, idx: number) {
    setActiveSheets((prev) => ({ ...prev, [`${cat}___${fileName}`]: idx }));
  }

  // 카테고리별 → 파일별 그룹핑 (업로드 타입과 연동)
  const filteredList = list.filter((e) => (e.docType ?? "rate") === uploadDocType);
  const grouped: Record<string, Record<string, KnowledgeEntry[]>> = {};
  for (const item of filteredList) {
    const cat = item.category?.trim() || "미분류";
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][item.fileName]) grouped[cat][item.fileName] = [];
    grouped[cat][item.fileName].push(item);
  }

  const tabStyle = (t: Tab) => ({
    padding: "8px 20px",
    border: "none",
    borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
    background: "none",
    cursor: "pointer",
    fontWeight: tab === t ? 700 : 400,
    color: tab === t ? "#2563eb" : "#64748b",
    fontSize: 14,
  });

  const pendingCount = drafts.filter((d) => d.status === "pending").length;

  // 검토탭: 파일별 그룹핑
  const draftsByFile: Record<string, DraftEntry[]> = {};
  for (const d of drafts.filter((d) => d.status === "pending")) {
    if (!draftsByFile[d.fileName]) draftsByFile[d.fileName] = [];
    draftsByFile[d.fileName].push(d);
  }

  const marginLabel = marginAmount > 0
    ? marginType === "fixed"
      ? `현재: 1인당 ${marginAmount}만원 고정 수익 적용 중`
      : `현재: ${marginAmount}% 수익 적용 중`
    : "현재: 수익 미적용 (원가 그대로 안내)";

  return (
    <div style={{ padding: "24px", maxWidth: 1100 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>AI 챗봇 관리</h2>

      {/* 탭 */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 24, gap: 4 }}>
        <button style={tabStyle("knowledge")} onClick={() => setTab("knowledge")}>지식베이스 관리</button>
        <button style={tabStyle("review")} onClick={() => setTab("review")}>
          검토 대기{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </button>
        <button style={tabStyle("test")} onClick={() => setTab("test")}>챗봇 테스트</button>
        <button style={tabStyle("margin")} onClick={() => setTab("margin")}>수익 설정</button>
      </div>

      {/* ── 지식베이스 탭 ── */}
      {tab === "knowledge" && (
        <>
          {/* 업로드 */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, marginBottom: 14 }}>파일 업로드</p>
            <form onSubmit={handleUpload}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setUploadDocType("rate")}
                  style={{ padding: "7px 20px", borderRadius: 8, border: `2px solid ${uploadDocType === "rate" ? "#2563eb" : "#e2e8f0"}`, background: uploadDocType === "rate" ? "#eff6ff" : "#fff", color: uploadDocType === "rate" ? "#2563eb" : "#64748b", fontWeight: uploadDocType === "rate" ? 700 : 400, cursor: "pointer", fontSize: 13 }}
                >
                  요금표
                </button>
                <button
                  type="button"
                  onClick={() => setUploadDocType("itinerary")}
                  style={{ padding: "7px 20px", borderRadius: 8, border: `2px solid ${uploadDocType === "itinerary" ? "#7c3aed" : "#e2e8f0"}`, background: uploadDocType === "itinerary" ? "#f5f3ff" : "#fff", color: uploadDocType === "itinerary" ? "#7c3aed" : "#64748b", fontWeight: uploadDocType === "itinerary" ? 700 : 400, cursor: "pointer", fontSize: 13 }}
                >
                  일정표
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 160px" }}>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>여행지 (카테고리) *</p>
                  <input
                    type="text"
                    placeholder="예: 발리, 유럽, 하와이"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>요금 시작일</p>
                  <input
                    type="month"
                    value={uploadValidFrom}
                    onChange={(e) => setUploadValidFrom(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>요금 종료일</p>
                  <input
                    type="month"
                    value={uploadValidTo}
                    onChange={(e) => setUploadValidTo(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 }}
                />
                <button
                  type="submit"
                  disabled={uploading}
                  style={{ padding: "9px 22px", background: uploading ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {uploading ? "업로드 중..." : "업로드"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                지원 형식: xlsx, xls, csv, pdf · 업로드 후 AI가 분석하며, 검토 탭에서 확인 후 승인해야 챗봇에 반영됩니다
              </p>
            </form>
            {uploadMsg && (
              <p style={{ marginTop: 10, fontSize: 13, color: uploadMsg.startsWith("✅") ? "#16a34a" : "#dc2626", whiteSpace: "pre-line" }}>
                {uploadMsg}
              </p>
            )}
          </div>

          {/* 목록 */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontWeight: 600 }}>
              업로드된 데이터 —{" "}
              <span style={{ color: uploadDocType === "itinerary" ? "#7c3aed" : "#2563eb" }}>
                {uploadDocType === "rate" ? "요금표" : "일정표"}
              </span>{" "}
              {filteredList.length}개 시트
            </p>
          </div>

          {list.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>업로드된 데이터가 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(grouped).map(([cat, fileMap]) => {
                const isOpen = openFolders.has(cat);
                const totalSheets = Object.values(fileMap).flat().length;
                const sample = Object.values(fileMap).flat()[0];
                const vFrom = sample?.validFrom ? formatDate(sample.validFrom + "-01") : "";
                const vTo = sample?.validTo ? formatDate(sample.validTo + "-01") : "";
                const periodStr = vFrom || vTo ? `${vFrom} ~ ${vTo}` : "";

                return (
                  <div key={cat} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    {/* 카테고리 헤더 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "#f1f5f9", cursor: "pointer" }} onClick={() => !editingCat && toggleFolder(cat)}>
                      <span style={{ fontSize: 16 }}>{isOpen ? "📂" : "📁"}</span>

                      {editingCat === cat ? (
                        <>
                          <input
                            autoFocus
                            value={editingCatValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingCatValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameCategory(cat, editingCatValue);
                              if (e.key === "Escape") setEditingCat(null);
                            }}
                            style={{ flex: 1, padding: "4px 10px", border: "2px solid #2563eb", borderRadius: 6, fontSize: 14, fontWeight: 700 }}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); renameCategory(cat, editingCatValue); }}
                            style={{ padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          >
                            저장
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCat(null); }}
                            style={{ padding: "4px 10px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#64748b" }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", flex: 1 }}>{cat}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setEditingCatValue(cat); }}
                            style={{ padding: "3px 10px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", background: "#fff", color: "#64748b" }}
                          >
                            이름 수정
                          </button>
                          {periodStr && (
                            <span style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>
                              {periodStr}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            파일 {Object.keys(fileMap).length}개 · 시트 {totalSheets}개
                          </span>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
                        </>
                      )}
                    </div>

                    {/* 파일 목록 */}
                    {isOpen && (
                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, background: "#fff" }}>
                        {Object.entries(fileMap).map(([fileName, sheets]) => {
                          const uploadedAt = new Date(sheets[0].createdAt).toLocaleDateString("ko-KR");
                          const activeIdx = getActiveSheet(cat, fileName);
                          const activeSheet = sheets[activeIdx] ?? sheets[0];
                          const isItinerary = activeSheet?.docType === "itinerary";
                          const headers = activeSheet?.headers?.length > 0
                            ? activeSheet.headers
                            : (isItinerary ? ITINERARY_HEADERS : STANDARD_HEADERS);

                          return (
                            <div key={fileName} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                              {/* 파일 헤더 */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: 15 }}>📄</span>
                                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: "#1e293b", wordBreak: "break-all" }}>{fileName}</span>
                                <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>업로드: {uploadedAt}</span>
                                <button
                                  onClick={() => handleDeleteFile(fileName, cat)}
                                  style={{ padding: "4px 12px", fontSize: 12, border: "none", borderRadius: 6, cursor: "pointer", background: "#fee2e2", color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}
                                >
                                  파일 삭제
                                </button>
                              </div>

                              {/* 시트 탭 + 뱃지 + 삭제 */}
                              <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 16px", background: "#fafafa", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>
                                <div style={{ display: "flex", gap: 2, flex: 1, paddingTop: 8 }}>
                                  {sheets.map((sheet, idx) => {
                                    const isActive = activeIdx === idx;
                                    const isIt = sheet.docType === "itinerary";
                                    return (
                                      <button
                                        key={sheet._id}
                                        onClick={() => setActiveSheet(cat, fileName, idx)}
                                        style={{
                                          padding: "6px 14px",
                                          fontSize: 12,
                                          fontWeight: isActive ? 700 : 400,
                                          border: "1px solid #e2e8f0",
                                          borderBottom: isActive ? "2px solid #fff" : "1px solid #e2e8f0",
                                          borderRadius: "6px 6px 0 0",
                                          cursor: "pointer",
                                          background: isActive ? "#fff" : "#f1f5f9",
                                          color: isActive ? "#1e293b" : "#64748b",
                                          whiteSpace: "nowrap",
                                          marginBottom: isActive ? -1 : 0,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            background: isIt ? "#f5f3ff" : "#eff6ff",
                                            color: isIt ? "#7c3aed" : "#2563eb",
                                            padding: "1px 5px",
                                            borderRadius: 4,
                                          }}
                                        >
                                          {isIt ? "일정" : "요금"}
                                        </span>
                                        {sheet.sheetName || "전체"}
                                        <span style={{ fontSize: 10, color: "#94a3b8" }}>({sheet.rows.length}행)</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {/* 활성 시트 삭제 */}
                                <button
                                  onClick={() => handleDelete(activeSheet._id)}
                                  style={{ padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 6, cursor: "pointer", background: "#fee2e2", color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}
                                >
                                  시트 삭제
                                </button>
                              </div>

                              {/* 테이블 콘텐츠 */}
                              <div style={{ overflowX: "auto", background: "#fff" }}>
                                {headers.length > 0 && activeSheet.rows.length > 0 ? (
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                    <thead>
                                      <tr style={{ background: "#f1f5f9" }}>
                                        <th style={{ padding: "8px 12px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: 11, whiteSpace: "nowrap", minWidth: 36 }}>No.</th>
                                        {headers.map((h) => (
                                          <th key={h} style={{ padding: "8px 14px", border: "1px solid #e2e8f0", textAlign: "left", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activeSheet.rows.map((row, i) => (
                                        <tr
                                          key={i}
                                          style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
                                        >
                                          <td style={{ padding: "7px 12px", border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>{i + 1}</td>
                                          {headers.map((h) => (
                                            <td key={h} style={{ padding: "7px 14px", border: "1px solid #e2e8f0", maxWidth: 260, wordBreak: "break-word", verticalAlign: "top" }}>
                                              {renderCell(row[h])}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{ padding: 20, color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                                    표시할 데이터가 없습니다.
                                  </div>
                                )}
                              </div>

                              {/* 행 수 요약 */}
                              <div style={{ padding: "6px 16px", background: "#fafafa", borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8" }}>
                                총 {activeSheet.rows.length}행
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── 검토 탭 ── */}
      {tab === "review" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <p style={{ fontWeight: 600, flex: 1 }}>
              검토 대기 — {Object.values(draftsByFile).flat().length}개 시트 ·{" "}
              {Object.values(draftsByFile).flat().reduce((s, d) => s + d.rows.length, 0)}행
            </p>
            <button
              onClick={loadDrafts}
              style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 7, cursor: "pointer", background: "#fff", color: "#64748b" }}
            >
              새로고침
            </button>
            {Object.keys(draftsByFile).length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm("검토 대기 중인 모든 시트를 승인할까요?")) return;
                  setDraftMsg("");
                  const allIds = Object.values(draftsByFile).flat().map((d) => d._id);
                  const res = await fetch("/api/admin/ai/draft", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "approve", ids: allIds }),
                  });
                  const data = await res.json();
                  if (data.ok) { setDraftMsg(`✅ 전체 ${allIds.length}개 시트 승인 완료`); loadDrafts(); loadList(); }
                  else setDraftMsg(`❌ ${data.error}`);
                }}
                style={{ padding: "7px 18px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 7, cursor: "pointer", background: "#16a34a", color: "#fff" }}
              >
                전체 승인
              </button>
            )}
          </div>

          {draftMsg && (
            <p style={{ marginBottom: 12, fontSize: 13, color: draftMsg.startsWith("✅") ? "#16a34a" : draftMsg.startsWith("반려") ? "#64748b" : "#dc2626" }}>
              {draftMsg}
            </p>
          )}

          {draftLoading ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>로딩 중...</p>
          ) : Object.keys(draftsByFile).length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>검토 대기 항목이 없습니다</p>
              <p style={{ fontSize: 13 }}>파일을 업로드하면 AI 분석 후 여기서 검토할 수 있습니다</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(draftsByFile).map(([fileName, sheets]) => (
                <div key={fileName} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a", flex: 1, wordBreak: "break-all" }}>{fileName}</span>
                    {sheets[0]?.docType === "itinerary" ? (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#f5f3ff", color: "#7c3aed", padding: "2px 8px", borderRadius: 10 }}>일정표</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 10 }}>요금표</span>
                    )}
                    <span style={{ fontSize: 12, color: "#3b82f6" }}>{sheets.length}개 시트 · {sheets.reduce((s, d) => s + d.rows.length, 0)}행</span>
                    <button
                      onClick={() => approveAllByFile(fileName)}
                      style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 6, cursor: "pointer", background: "#16a34a", color: "#fff", whiteSpace: "nowrap" }}
                    >
                      이 파일 전체 승인
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    {(() => {
                      const isItinerary = sheets[0]?.docType === "itinerary";
                      const fallbackHeaders = isItinerary ? ITINERARY_HEADERS : STANDARD_HEADERS;
                      const allKeys = Array.from(new Set(sheets.flatMap((d) => d.rows.flatMap((r) => Object.keys(r)))));
                      const colHeaders = allKeys.length > 0 ? allKeys : fallbackHeaders;
                      return (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: "#f8fafc" }}>
                              <th style={{ padding: "7px 10px", border: "1px solid #e2e8f0", whiteSpace: "nowrap", color: "#64748b", fontWeight: 600, minWidth: 70 }}>시트</th>
                              {colHeaders.map((h) => (
                                <th key={h} style={{ padding: "7px 10px", border: "1px solid #e2e8f0", whiteSpace: "nowrap", fontWeight: 700, color: "#1e293b" }}>{h}</th>
                              ))}
                              <th style={{ padding: "7px 10px", border: "1px solid #e2e8f0", whiteSpace: "nowrap", color: "#64748b", fontWeight: 600 }}>작업</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheets.map((draft) => {
                              const actionCell = (
                                <td style={{ padding: "8px", border: "1px solid #e2e8f0", verticalAlign: "top", background: "#f8fafc", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <button onClick={() => approveDraft(draft._id)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 5, cursor: "pointer", background: "#2563eb", color: "#fff" }}>승인</button>
                                    <button onClick={() => rejectDraft(draft._id)} style={{ padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 5, cursor: "pointer", background: "#fef2f2", color: "#dc2626", fontWeight: 600 }}>반려</button>
                                    <button onClick={() => deleteDraft(draft._id)} style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer", background: "#fff", color: "#94a3b8" }}>삭제</button>
                                  </div>
                                </td>
                              );

                              // rows가 없으면 원본 텍스트(summary)를 보여줌
                              if (draft.rows.length === 0) {
                                return (
                                  <tr key={draft._id}>
                                    <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", verticalAlign: "top", background: "#f1f5f9", whiteSpace: "nowrap", fontSize: 11, color: "#475569", fontWeight: 600 }}>
                                      {draft.sheetName || "전체"}
                                    </td>
                                    <td colSpan={colHeaders.length} style={{ padding: "12px 14px", border: "1px solid #e2e8f0", background: "#fffbeb" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                        <p style={{ fontSize: 11, color: "#d97706", fontWeight: 700, flex: 1 }}>
                                          ⚠️ AI가 표 형식으로 구조화하지 못했습니다. 아래 원본 텍스트를 확인 후 재분석하거나 그대로 승인하세요.
                                        </p>
                                        <button
                                          onClick={() => reanalyzeDraft(draft._id)}
                                          disabled={reanalyzingId === draft._id}
                                          style={{ padding: "4px 12px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 5, cursor: reanalyzingId === draft._id ? "not-allowed" : "pointer", background: "#7c3aed", color: "#fff", whiteSpace: "nowrap", flexShrink: 0, opacity: reanalyzingId === draft._id ? 0.5 : 1, transition: "opacity 0.2s" }}
                                        >
                                          {reanalyzingId === draft._id ? "재분석 중..." : "AI 재분석"}
                                        </button>
                                      </div>
                                      <pre style={{ fontSize: 11, color: "#475569", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 200, overflowY: "auto", margin: 0, lineHeight: 1.6, background: "#fff", padding: "8px", borderRadius: 4, border: "1px solid #fde68a" }}>
                                        {draft.summary || "(내용 없음)"}
                                      </pre>
                                    </td>
                                    {actionCell}
                                  </tr>
                                );
                              }

                              return draft.rows.map((row, rowIdx) => (
                                <tr key={`${draft._id}-${rowIdx}`} style={{ background: rowIdx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                  {rowIdx === 0 ? (
                                    <td
                                      rowSpan={draft.rows.length}
                                      style={{ padding: "6px 10px", border: "1px solid #e2e8f0", verticalAlign: "top", background: "#f1f5f9", whiteSpace: "nowrap", fontSize: 11, color: "#475569", fontWeight: 600 }}
                                    >
                                      {draft.sheetName || "전체"}
                                    </td>
                                  ) : null}

                                  {colHeaders.map((col) => {
                                    const isEditing = editingCell?.draftId === draft._id && editingCell.rowIdx === rowIdx && editingCell.col === col;
                                    return (
                                      <td key={col} style={{ padding: 0, border: "1px solid #e2e8f0", minWidth: 80, maxWidth: 180 }}>
                                        {isEditing ? (
                                          <input
                                            autoFocus
                                            value={editingCellValue}
                                            onChange={(e) => setEditingCellValue(e.target.value)}
                                            onBlur={() => { updateDraftCell(draft._id, rowIdx, col, editingCellValue); saveDraftRows(draft._id); setEditingCell(null); }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" || e.key === "Tab") { updateDraftCell(draft._id, rowIdx, col, editingCellValue); saveDraftRows(draft._id); setEditingCell(null); }
                                              if (e.key === "Escape") setEditingCell(null);
                                            }}
                                            style={{ width: "100%", padding: "5px 8px", border: "2px solid #2563eb", borderRadius: 0, fontSize: 12, boxSizing: "border-box", outline: "none" }}
                                          />
                                        ) : (
                                          <div
                                            onClick={() => { setEditingCell({ draftId: draft._id, rowIdx, col }); setEditingCellValue(row[col] ?? ""); }}
                                            style={{ padding: "5px 8px", minHeight: 28, cursor: "text", wordBreak: "break-word" }}
                                          >
                                            {renderCell(row[col])}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}

                                  {rowIdx === 0 ? (
                                    <td
                                      rowSpan={draft.rows.length}
                                      style={{ padding: "8px", border: "1px solid #e2e8f0", verticalAlign: "top", background: "#f8fafc", whiteSpace: "nowrap" }}
                                    >
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <button onClick={() => approveDraft(draft._id)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 5, cursor: "pointer", background: "#2563eb", color: "#fff" }}>승인</button>
                                        <button onClick={() => rejectDraft(draft._id)} style={{ padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 5, cursor: "pointer", background: "#fef2f2", color: "#dc2626", fontWeight: 600 }}>반려</button>
                                        <button onClick={() => deleteDraft(draft._id)} style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 5, cursor: "pointer", background: "#fff", color: "#94a3b8" }}>삭제</button>
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                  <p style={{ fontSize: 11, color: "#94a3b8", padding: "6px 14px", background: "#fafafa", borderTop: "1px solid #f1f5f9" }}>
                    셀을 클릭하면 편집 가능 · 수정 후 승인하면 지식베이스에 반영됩니다
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 수익 설정 탭 ── */}
      {tab === "margin" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: "#92400e" }}>
              💡 여기서 설정한 수익은 고객 챗봇이 요금을 안내할 때 자동으로 원가에 녹여서 총액으로만 표시됩니다. 고객에게는 마진이 보이지 않습니다.
            </p>
          </div>

          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>현재 상태</p>
          <p style={{ fontWeight: 600, color: marginAmount > 0 ? "#16a34a" : "#94a3b8", marginBottom: 24, fontSize: 14 }}>
            {marginLabel}
          </p>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
            <p style={{ fontWeight: 600, marginBottom: 16 }}>수익 방식 선택</p>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 16px", border: `2px solid ${marginType === "fixed" ? "#2563eb" : "#e2e8f0"}`, borderRadius: 8, flex: 1, background: marginType === "fixed" ? "#eff6ff" : "#fff" }}>
                <input type="radio" name="marginType" value="fixed" checked={marginType === "fixed"} onChange={() => setMarginType("fixed")} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>고정 금액</p>
                  <p style={{ fontSize: 12, color: "#64748b" }}>1인당 N만원 추가</p>
                </div>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 16px", border: `2px solid ${marginType === "percentage" ? "#2563eb" : "#e2e8f0"}`, borderRadius: 8, flex: 1, background: marginType === "percentage" ? "#eff6ff" : "#fff" }}>
                <input type="radio" name="marginType" value="percentage" checked={marginType === "percentage"} onChange={() => setMarginType("percentage")} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>비율(%)</p>
                  <p style={{ fontSize: 12, color: "#64748b" }}>원가의 N% 추가</p>
                </div>
              </label>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              {marginType === "fixed" ? "1인당 수익 금액 (만원)" : "수익 비율 (%)"}
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <input
                type="number"
                min={0}
                value={marginAmount}
                onChange={(e) => setMarginAmount(Number(e.target.value))}
                style={{ width: 140, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, fontWeight: 600 }}
              />
              <span style={{ fontSize: 14, color: "#64748b" }}>
                {marginType === "fixed" ? "만원 / 1인" : "%"}
              </span>
            </div>
            {marginType === "fixed" && marginAmount > 0 && (
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                예) 원가 136만원 → 고객에게 {136 + marginAmount}만원으로 안내
              </p>
            )}
            {marginType === "percentage" && marginAmount > 0 && (
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                예) 원가 136만원 → 고객에게 {Math.round(136 * (1 + marginAmount / 100))}만원으로 안내
              </p>
            )}
            <button
              onClick={saveMarginSettings}
              disabled={marginSaving}
              style={{ padding: "10px 24px", background: marginSaving ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
              {marginSaving ? "저장 중..." : "설정 저장"}
            </button>
            {marginMsg && (
              <p style={{ marginTop: 10, fontSize: 13, color: marginMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                {marginMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 챗봇 테스트 탭 ── */}
      {tab === "test" && (
        <div style={{ display: "flex", flexDirection: "column", height: 600, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#f8fafc" }}>
          <div style={{ padding: "14px 18px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🧪</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>챗봇 테스트</p>
                <p style={{ fontSize: 12, color: "#64748b" }}>고객 입장에서 질문해보세요</p>
              </div>
            </div>
            <button
              onClick={() => { setChatMessages([{ role: "assistant", content: "관리자 테스트 모드입니다. 고객이 입력할 질문을 테스트해보세요." }]); setChatInput(""); }}
              style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 7, cursor: "pointer", background: "#fff", color: "#64748b" }}
            >
              대화 초기화
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "#2563eb" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#1e293b",
                  fontSize: 13, lineHeight: 1.6,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", background: "#fff", borderRadius: "16px 16px 16px 4px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", color: "#94a3b8", fontSize: 13 }}>
                  답변 생성 중...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }}
              placeholder="테스트할 질문 입력..."
              rows={2}
              style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <button
              onClick={sendTestMessage}
              disabled={chatLoading || !chatInput.trim()}
              style={{ padding: "8px 16px", background: chatLoading || !chatInput.trim() ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
