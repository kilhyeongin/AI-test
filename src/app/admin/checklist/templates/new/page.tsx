// src/app/admin/checklist/templates/new/page.tsx
// 관리자용 체크리스트 템플릿 생성 페이지
// - 템플릿 이름
// - 항목들: 제목 / 업로드 주체(관리자/고객) / 유형(고객업로드/관리자업로드/결제파이프라인) / 필수 서류 or 추가 서류

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminInnerTabs from "@/components/admin/AdminInnerTabs";
import { AdminButton } from "@/components/admin/AdminButton";

type Role = "admin" | "customer";
type Area = "MAIN" | "EXTRA";
type Kind = "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";

type ItemRow = {
  id: number;
  title: string;
  role: Role;
  area: Area;
  kind: Kind; // 유형 추가
};

export default function AdminChecklistTemplateNewPage() {
  const router = useRouter();

  const [templateName, setTemplateName] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: Date.now(),
      title: "",
      role: "customer",
      area: "MAIN",
      kind: "CLIENT_UPLOAD_REVIEW", // 기본: 고객이 업로드
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        title: "",
        role: "customer",
        area: "MAIN",
        kind: "CLIENT_UPLOAD_REVIEW",
      },
    ]);
  }

  function updateItem(
    id: number,
    field: keyof ItemRow,
    value: string | Role | Area | Kind
  ) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // 제목 → key 자동 생성
  function makeKeyFromTitle(title: string, index: number) {
    const base = title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]+/g, "");
    if (!base) return `item_${index + 1}`;
    return `tpl_${base}_${index + 1}`;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setError("템플릿 이름을 입력해 주세요.");
      return;
    }

    const filledItems = items.filter((it) => it.title.trim());
    if (filledItems.length === 0) {
      setError("최소 1개 이상의 체크리스트 항목을 입력해 주세요.");
      return;
    }

    const mainItems = filledItems.filter((it) => it.area === "MAIN");
    const extraItems = filledItems.filter((it) => it.area === "EXTRA");

    const payloadItems = [...mainItems, ...extraItems].map((it, idx) => {
      const key = makeKeyFromTitle(it.title, idx);

      let defaultRole: Role = it.role;
      let defaultKind: Kind = it.kind;

      if (defaultKind === "PAYMENT_PIPELINE") {
        defaultRole = "admin";
      }

      return {
        key,
        title: it.title.trim(),
        defaultRole,
        defaultKind,
        area: it.area === "EXTRA" ? "extra" : "main",
      };
    });

    const body = {
      name: trimmedName,
      items: payloadItems,
    };

    try {
      setSaving(true);
      const res = await fetch("/api/admin/checklist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "템플릿 저장에 실패했습니다.");
      }

      alert("체크리스트 템플릿이 생성되었습니다.");
      router.push("/admin/checklist/templates");
    } catch (err: any) {
      setError(err?.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* 상단 관리자 탭 */}
      <AdminInnerTabs />

      <div className="cp-content">
        <div className="tpln-wrap">
          {/* 상단 헤더 카드 */}
          <div className="admin-card tpln-head">
            <div className="tpln-head-left">
              <h1 className="tpln-title">체크리스트 템플릿 만들기</h1>
              <p className="tpln-sub">
                계약서, 일정표, 여권 사본, 항공권 결제 등 체크리스트 항목 구성을
                템플릿으로 저장합니다.
              </p>
            </div>
            <div className="tpln-head-right">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/checklist/templates")}
              >
                템플릿 목록
              </AdminButton>
            </div>
          </div>

          {/* 폼 카드 */}
          <form onSubmit={handleSave}>
            <div className="admin-card tpln-card">
              {/* 템플릿 이름 */}
              <div className="tpln-field">
                <label className="tpln-label">템플릿 이름</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="예: 기본 패키지 체크리스트 / 허니문 전용 체크리스트"
                  className="tpln-input"
                />
              </div>

              {/* 항목 리스트 */}
              <div className="tpln-items">
                <div className="tpln-items-head">
                  <div className="tpln-items-title">체크리스트 항목</div>
                  <AdminButton
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addItem}
                  >
                    + 항목 추가
                  </AdminButton>
                </div>

                <p className="tpln-help">
                  필수 서류 영역에 있는 항목들은 체크리스트 1번, 2번, 3번… 순서대로
                  진행 단계에 표시되고, 추가 서류 영역은 고객 화면 하단의{" "}
                  <b>“추가 서류 업로드”</b> 박스 안에 순서와 무관하게 모여서
                  표시됩니다.
                </p>

                {/* ✅ 모바일 깨짐 방지: 테이블 스크롤 래퍼 */}
                <div className="tpln-table-wrap">
                  <table className="tpln-table">
                    <thead>
                      <tr>
                        <th className="col-title">항목 제목</th>
                        <th className="col-role">업로드 주체</th>
                        <th className="col-kind">유형</th>
                        <th className="col-area">영역</th>
                        <th className="col-act">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id}>
                          {/* 제목 */}
                          <td>
                            <input
                              type="text"
                              value={it.title}
                              onChange={(e) =>
                                updateItem(it.id, "title", e.target.value)
                              }
                              placeholder={
                                idx === 0
                                  ? "예: 계약서"
                                  : idx === 1
                                  ? "예: 일정표"
                                  : "예: 여권 사본 / 항공권 결제 / 여행자 보험 등"
                              }
                              className="tpln-input sm"
                            />
                          </td>

                          {/* 업로드 주체 */}
                          <td>
                            <select
                              value={it.role}
                              onChange={(e) =>
                                updateItem(it.id, "role", e.target.value as Role)
                              }
                              className="tpln-select sm"
                            >
                              <option value="customer">고객이 업로드</option>
                              <option value="admin">관리자가 업로드</option>
                            </select>
                          </td>

                          {/* 유형 */}
                          <td>
                            <select
                              value={it.kind}
                              onChange={(e) =>
                                updateItem(it.id, "kind", e.target.value as Kind)
                              }
                              className="tpln-select sm"
                            >
                              <option value="CLIENT_UPLOAD_REVIEW">
                                고객이 업로드 (관리자 검토)
                              </option>
                              <option value="ADMIN_UPLOAD_VIEW">
                                관리자가 업로드 (고객 열람)
                              </option>
                              <option value="PAYMENT_PIPELINE">결제 파이프라인</option>
                            </select>
                          </td>

                          {/* 영역 */}
                          <td>
                            <select
                              value={it.area}
                              onChange={(e) =>
                                updateItem(it.id, "area", e.target.value as Area)
                              }
                              className="tpln-select sm"
                            >
                              <option value="MAIN">필수 서류 영역</option>
                              <option value="EXTRA">추가 서류 영역</option>
                            </select>
                          </td>

                          {/* 삭제 */}
                          <td className="tpln-act">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(it.id)}
                                className="tpln-x"
                                title="항목 삭제"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {error && <p className="tpln-error">오류: {error}</p>}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="admin-card tpln-footer">
              <AdminButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/checklist/templates")}
              >
                취소
              </AdminButton>
              <AdminButton type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? "저장 중..." : "템플릿 저장"}
              </AdminButton>
            </div>
          </form>
        </div>

        {/* 스타일: 기능 그대로, UI만 반응형으로 정리 */}
        <style jsx>{`
          .tpln-wrap {
            max-width: 960px;
            margin: 0 auto;
            padding: clamp(12px, 2.2vw, 22px);
          }

          .tpln-head {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            align-items: start;
            margin-bottom: 14px;
          }

          .tpln-title {
            margin: 0;
            font-size: clamp(18px, 2.2vw, 20px);
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.2;
          }

          .tpln-sub {
            margin: 6px 0 0;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.45;
          }

          .tpln-card {
            margin-bottom: 16px;
          }

          .tpln-field {
            margin-bottom: 16px;
          }

          .tpln-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
            color: #4b5563;
          }

          .tpln-input,
          .tpln-select {
            width: 100%;
            padding: 10px 12px; /* ✅ 모바일 터치 영역 */
            border-radius: 10px;
            border: 1px solid #d1d5db;
            font-size: 14px; /* ✅ 모바일 입력 글씨 */
            outline: none;
            background: #fff;
          }

          .tpln-input:focus,
          .tpln-select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
          }

          .tpln-input.sm,
          .tpln-select.sm {
            padding: 9px 10px;
            border-radius: 8px;
            font-size: 13px;
          }

          .tpln-items {
            margin-top: 8px;
          }

          .tpln-items-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
          }

          .tpln-items-title {
            font-size: 13px;
            font-weight: 650;
            color: #111827;
          }

          .tpln-help {
            font-size: 12px;
            color: #6b7280;
            margin: 0 0 10px 0;
            line-height: 1.45;
          }

          /* ✅ 테이블: 모바일 깨짐 방지 */
          .tpln-table-wrap{
            position: relative;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            background: #fff;

            /* Firefox에서 스크롤바 두께/색 */
            scrollbar-width: auto;
            scrollbar-color: rgba(15,23,42,.35) rgba(15,23,42,.08);
          }

          /* Chrome/Safari/Edge */
          .tpln-table-wrap::-webkit-scrollbar{
            height: 12px; /* ✅ 더 두껍게 */
          }
          .tpln-table-wrap::-webkit-scrollbar-track{
            background: rgba(15,23,42,.08);
            border-radius: 999px;
            margin: 8px; /* 양끝 여백 */
          }
          .tpln-table-wrap::-webkit-scrollbar-thumb{
            background: rgba(15,23,42,.35);
            border-radius: 999px;
            border: 3px solid rgba(15,23,42,.08); /* 트랙과 분리감 */
          }
          .tpln-table-wrap::-webkit-scrollbar-thumb:hover{
            background: rgba(15,23,42,.5);
          }

          .tpln-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            min-width: 760px; /* ✅ 핵심: 너무 좁아지면 스크롤로 */
          }

          .tpln-table thead tr {
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }

          .tpln-table th,
          .tpln-table td {
            padding: 10px 10px;
            text-align: left;
            vertical-align: middle;
            border-bottom: 1px solid #f3f4f6;
          }

          .tpln-table th {
            font-weight: 650;
            color: #374151;
            white-space: nowrap;
          }

          /* 컬럼 폭(가독성) */
          .col-title {
            width: 40%;
            min-width: 260px;
          }
          .col-role {
            width: 18%;
            min-width: 150px;
          }
          .col-kind {
            width: 22%;
            min-width: 200px;
          }
          .col-area {
            width: 15%;
            min-width: 140px;
          }
          .col-act {
            width: 5%;
            min-width: 60px;
            text-align: right;
          }

          .tpln-act {
            text-align: right;
          }

          /* 삭제 버튼 터치 영역 */
          .tpln-x {
            width: 34px;
            height: 34px;
            border: 1px solid #e5e7eb;
            background: #fff;
            border-radius: 10px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            color: #9ca3af;
          }
          .tpln-x:hover {
            background: #f9fafb;
            color: #6b7280;
          }

          .tpln-error {
            margin-top: 10px;
            font-size: 12px;
            color: #dc2626;
          }

          .tpln-footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }

          /* ===== Mobile ===== */
          @media (max-width: 720px) {
            .tpln-head {
              grid-template-columns: 1fr;
            }
            .tpln-head-right {
              justify-self: end;
            }

            /* 모바일에서 제목/설명 더 잘 보이게 */
            .tpln-sub {
              font-size: 13.5px;
            }
          }

          @media (max-width: 420px) {
            .tpln-footer {
              justify-content: space-between; /* 버튼이 화면에 자연스럽게 */
            }
          }
        `}</style>
      </div>
    </div>
  );
}
