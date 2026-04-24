// /src/app/admin/customers/[id]/checklist/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ===== 공통 타입 =====
type Role = "admin" | "customer";
type Kind = "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";

type StepInput = {
  order: number;
  title: string;
  role: Role;
  kind: Kind;
  stepKey: string; // 템플릿 항목 키 (계약서, 일정표, 항공권 결제 등)
};

// 서버에서 내려오는 템플릿 타입 (관리자 커스텀)
type ChecklistTemplateFromApi = {
  id: string;
  name: string;
  description?: string;
  items: {
    key: string;
    title: string;
    defaultRole: Role;
    defaultKind: Kind;
    area?: "main" | "extra"; // ✅ 필수/추가 서류 영역
  }[];
};

// 내부에서 공통으로 쓰는 템플릿 타입 (정적 + 커스텀 통합)
type CombinedTemplateItem = {
  key: string;
  title: string;
  defaultRole: Role;
  defaultKind: Kind;
  area?: "main" | "extra";
};

type CombinedTemplate = {
  id: string;
  name: string;
  description?: string;
  items: CombinedTemplateItem[];
};

// ===== 이 페이지 전용 기본(내장) 템플릿 =====
// lib/checklistTemplates.ts 에 있던 내용을 그대로 옮겨온 버전
type BuiltinTemplate = {
  id: string;
  name: string;
  items: {
    key: string;
    title: string;
    defaultRole: Role;
    defaultKind: Kind;
  }[];
};

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "default",
    name: "기본 템플릿",
    items: [
      {
        key: "contract",
        title: "계약서",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        key: "itinerary",
        title: "일정표",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (고객이 여권 사본 업로드)
        key: "passport_copy",
        title: "여권 사본",
        defaultRole: "customer",
        defaultKind: "CLIENT_UPLOAD_REVIEW",
      },
      {
        // ✅ 항공권 결제 (결제 파이프라인)
        key: "ticket_payment",
        title: "항공권 결제",
        defaultRole: "customer",
        defaultKind: "PAYMENT_PIPELINE",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (관리자가 E-TICKET 업로드)
        key: "eticket",
        title: "E-TICKET",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        key: "final_notice",
        title: "파이널 안내",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
      {
        // ✅ 잔금 안내 및 납부 (결제 파이프라인)
        key: "final_payment",
        title: "잔금 안내 및 납부",
        defaultRole: "admin",
        defaultKind: "PAYMENT_PIPELINE",
      },
      {
        key: "visa",
        title: "VISA 발급",
        defaultRole: "customer",
        defaultKind: "CLIENT_UPLOAD_REVIEW",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (고객 여행자 보험 증서)
        key: "insurance",
        title: "여행자 보험",
        defaultRole: "customer",
        defaultKind: "CLIENT_UPLOAD_REVIEW",
      },
      {
        // ✅ 언제든 업로드 가능한 항목 (관리자 최종 설명자료)
        key: "final_docs",
        title: "최종 설명자료",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
      },
    ],
  },
];

// ✅ 하위호환용: 항상 "추가 서류 영역" 으로 보이는 키들
const ALWAYS_EXTRA_KEYS = [
  "passport_copy", // 여권 사본
  "eticket", // E-TICKET
  "insurance", // 여행자 보험
  "final_docs", // 최종 설명자료
];

function isAlwaysExtraKey(key: string) {
  return ALWAYS_EXTRA_KEYS.includes(key);
}

// ✅ 항목이 추가 서류인지 판별 (area > fallback: key)
function isExtraItem(item: CombinedTemplateItem) {
  if (item.area === "extra") return true;
  if (item.area === "main") return false;
  // area 정보가 없는 예전 템플릿은 key 기준으로 판단
  return isAlwaysExtraKey(item.key);
}
export default function AdminCustomerChecklistNewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [destination, setDestination] = useState("");
  const [nights, setNights] = useState<string>("");
  const [days, setDays] = useState<string>("");
  const [departDate, setDepartDate] = useState("");

  // ✅ 템플릿 선택 ID (기본값: "default")
  // - 기본 템플릿: BUILTIN_TEMPLATES
  // - 관리자 커스텀 템플릿: apiTemplates
  const [templateId, setTemplateId] = useState<string>("default");

  // ✅ 서버에서 가져온 관리자 커스텀 템플릿 목록
  const [apiTemplates, setApiTemplates] = useState<ChecklistTemplateFromApi[]>(
    [],
  );

  // ✅ 현재 선택된 템플릿 (정적 + 커스텀 통합)
  const template: CombinedTemplate = useMemo(() => {
    // 1) 관리자 커스텀 템플릿에 같은 id가 있으면 그걸 우선 사용
    const apiTpl = apiTemplates.find((t) => t.id === templateId);
    if (apiTpl) {
      return {
        id: apiTpl.id,
        name: apiTpl.name,
        description: apiTpl.description,
        items: apiTpl.items.map((it) => ({
          key: it.key,
          title: it.title,
          defaultRole: it.defaultRole,
          defaultKind: it.defaultKind,
          area: it.area,
        })),
      };
    }

    // 2) 기본(내장) 템플릿에서 id 매칭
    const builtin =
      BUILTIN_TEMPLATES.find((t) => t.id === templateId) ||
      BUILTIN_TEMPLATES[0];

    return {
      id: builtin.id,
      name: builtin.name,
      items: builtin.items.map((it) => ({
        key: it.key,
        title: it.title,
        defaultRole: it.defaultRole,
        defaultKind: it.defaultKind,
      })),
    };
  }, [templateId, apiTemplates]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 관리자 커스텀 템플릿 목록 불러오기
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/checklist-templates", {
          cache: "no-store",
        });
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.ok) return;
        setApiTemplates(data.templates || []);
      } catch (e) {
        console.error("load checklist templates error", e);
      }
    })();
  }, []);

  if (!id) {
    return <div className="wrap">잘못된 접근입니다. (고객 ID 없음)</div>;
  }

  function toggleItem(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  // ✅ 선택된 항목을 템플릿 순서대로 분리 (메인 / 추가)
  const selectedMainItems = useMemo(
    () =>
      template.items.filter(
        (item) => selectedKeys.includes(item.key) && !isExtraItem(item),
      ),
    [template, selectedKeys],
  );

  const selectedExtraItems = useMemo(
    () =>
      template.items.filter(
        (item) => selectedKeys.includes(item.key) && isExtraItem(item),
      ),
    [template, selectedKeys],
  );

  const anySelected = selectedMainItems.length + selectedExtraItems.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nightsNum = Number(nights);
    const daysNum = Number(days);

    if (!destination.trim()) return setError("여행지를 입력해 주세요.");
    if (!nightsNum || nightsNum <= 0) return setError("박수를 입력해 주세요.");
    if (!daysNum || daysNum <= 0) return setError("일수를 입력해 주세요.");
    if (!departDate) return setError("출발일을 선택해 주세요.");
    if (!anySelected)
      return setError("최소 1개 이상의 항목을 선택해 주세요.");

    // ✅ 저장 시: 메인 단계 먼저, 그다음 추가 서류 단계 순서로 order를 매겨줌
    const steps: StepInput[] = [];
    let orderCounter = 1;

    // 1) 메인 단계
    for (const item of selectedMainItems) {
      steps.push({
        order: orderCounter++,
        title: item.title,
        role: item.defaultRole,
        kind: item.defaultKind,
        stepKey: item.key,
      });
    }

    // 2) 추가 서류 단계
    for (const item of selectedExtraItems) {
      steps.push({
        order: orderCounter++,
        title: item.title,
        role: item.defaultRole,
        kind: item.defaultKind,
        stepKey: item.key,
      });
    }

    // 백엔드에는:
    //  - 기본 템플릿이면 "default"
    //  - 커스텀 템플릿이면 Mongo _id
    const body = {
      customerId: id,
      templateId,
      destination: destination.trim(),
      nights: nightsNum,
      days: daysNum,
      departDate,
      steps,
    };

    try {
      setSaving(true);
      const r = await fetch("/api/admin/onboarding/create-from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || "생성 실패");

      alert("체크리스트가 생성되었습니다.");
      router.push(`/admin/customers/${id}/checklist/list`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wrap">
      {/* 헤더 */}
      <header className="header">
        <button
          type="button"
          className="btn line"
          onClick={() =>
            router.push(`/admin/customers/${id}/checklist/list`)
          }
        >
          ← 체크리스트 목록
        </button>
        <h1 className="title">여행 체크리스트 생성</h1>
        <div style={{ width: 120 }} />
      </header>

      <form onSubmit={handleSubmit}>
        {/* 여행 정보 */}
        <section className="card">
          <h2 className="card-title">여행 정보</h2>
          <p className="card-sub">
            고객 체크리스트 상단에 함께 보여질 기본 여행 정보를 입력해 주세요.
          </p>

          <div className="grid-2">
            <div>
              <label className="label">여행지</label>
              <input
                className="input"
                placeholder="예: 제주도 / 발리 / 다낭"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div>
              <label className="label">출발일</label>
              <div className="input-unit">
                <input
                  type="date"
                  className="input input-date"
                  value={departDate}
                  onChange={(e) => setDepartDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid-2 mt10">
            <div>
              <label className="label">박수</label>
              <div className="input-unit">
                <input
                  type="number"
                  className="input"
                  min={1}
                  placeholder="예: 4"
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                />
                <span className="unit-pill">박</span>
              </div>
            </div>

            <div>
              <label className="label">일수</label>
              <div className="input-unit">
                <input
                  type="number"
                  className="input"
                  min={1}
                  placeholder="예: 5"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
                <span className="unit-pill">일</span>
              </div>
            </div>
          </div>
        </section>

        {/* 템플릿 선택 */}
        <section className="card">
          <h2 className="card-title">템플릿 선택</h2>

          <select
            className="input"
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              setSelectedKeys([]);
            }}
          >
            {/* 기본(내장) 템플릿 */}
            {BUILTIN_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}

            {/* 관리자 커스텀 템플릿 */}
            {apiTemplates.length > 0 && (
              <optgroup label="관리자 커스텀 템플릿">
                {apiTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <div className="template-list">
            {template.items.map((item) => {
              const selected = selectedKeys.includes(item.key);
              const extra = isExtraItem(item);

              // 메인 단계인 경우만 "체크리스트 N번" 보여줌
              const mainIdx = selectedMainItems.findIndex(
                (m) => m.key === item.key,
              );
              const displayIndex = mainIdx >= 0 ? mainIdx + 1 : null;

              return (
                <div key={item.key} className="template-row">
                  <div className="template-title">
                    {item.title}
                    {extra ? (
                      <span className="order-badge order-badge-extra">
                        추가 서류 영역
                      </span>
                    ) : (
                      displayIndex && (
                        <span className="order-badge">
                          체크리스트 {displayIndex}번
                        </span>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    className={selected ? "btn square selected" : "btn square"}
                    onClick={() => toggleItem(item.key)}
                  >
                    {selected ? "✓" : "+"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        {/* 선택된 항목 + 저장 */}
        <section className="bottom-card">
          <div className="selected-header">
            <span>선택된 항목 구성</span>
            {anySelected && (
              <button
                type="button"
                className="btn small line"
                onClick={clearSelection}
              >
                모두 해제
              </button>
            )}
          </div>

          <p className="selected-desc">
            순서대로 진행되는 단계는 고객 체크리스트 화면에 1번, 2번, 3번…으로
            표시됩니다.
          </p>

          {/* 메인 단계 칩: 번호 표시 */}
          <div className="chips">
            {selectedMainItems.length === 0 ? (
              <span className="chips-empty">
                위에서 필요한 항목을 선택해 주세요.
              </span>
            ) : (
              selectedMainItems.map((item, idx) => (
                <button
                  key={item.key}
                  type="button"
                  className="chip"
                  onClick={() => toggleItem(item.key)}
                >
                  {idx + 1}. {item.title}
                  <span className="chip-x">×</span>
                </button>
              ))
            )}
          </div>

          {/* 추가 서류 업로드 영역: 번호 없이 표시 */}
          <div className="extra-area">
            <div className="extra-label">추가 서류 업로드</div>
            <p className="selected-desc">
              여권 사본, E-TICKET, 여행자 보험, 최종 설명자료는 고객 체크리스트
              하단의 별도 &quot;추가 서류 업로드&quot; 영역에 표시됩니다.
            </p>
            <div className="chips">
              {selectedExtraItems.length === 0 ? (
                <span className="chips-empty">
                  추가 서류가 선택되지 않았습니다.
                </span>
              ) : (
                selectedExtraItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="chip"
                    onClick={() => toggleItem(item.key)}
                  >
                    {item.title}
                    <span className="chip-x">×</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </section>
      </form>

      {/* 스타일 그대로 유지 */}
      <style jsx>{`
        /* 레이아웃 */
        .wrap {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 16px;
        }

        @media (max-width: 640px) {
          .wrap {
            max-width: 420px;
            padding: 16px;
          }
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 12px;
        }

        .title {
          font-size: 22px;
          font-weight: 800;
          margin: 0;
        }

        @media (max-width: 640px) {
          .title {
            font-size: 18px;
            line-height: 1.3;
          }
          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }

        .card {
          border-radius: 18px;
          background: #f9fafb;
          padding: 20px 22px;
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
        }

        .card-title {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .card-sub {
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 14px 0;
        }

        .bottom-card {
          background: #e5edff;
          padding: 20px;
          border-radius: 22px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 640px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .mt10 {
          margin-top: 10px;
        }

        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          background: #ffffff;
        }

        .input:focus {
          outline: none;
          border-color: #1d3fd6;
          box-shadow: 0 0 0 1px rgba(29, 63, 214, 0.08);
        }

        .input-date {
          padding-right: 10px;
        }

        .label {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 4px;
          display: block;
        }

        .input-unit {
          position: relative;
        }

        .input-unit .input {
          width: 100%;
          padding-right: 44px;
        }

        .unit-pill {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          padding: 4px 10px;
          border-radius: 999px;
          background: #111827;
          font-size: 11px;
          color: #f9fafb;
          font-weight: 600;
          letter-spacing: 0.02em;
          pointer-events: none;
        }

        .template-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .template-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .template-row:last-child {
          border-bottom: none;
        }

        .template-title {
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .order-badge {
          font-size: 11px;
          border-radius: 999px;
          padding: 2px 8px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #4b5563;
        }

        .order-badge-extra {
          border-style: dashed;
          color: #1d3fd6;
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: white;
          cursor: pointer;
          font-size: 13px;
        }

        .btn.line {
          background: #fff;
          color: #111827;
        }

        .btn.primary {
          width: 100%;
          margin-top: 16px;
          background: #1d3fd6;
          color: white;
          border-color: #1d3fd6;
          font-weight: 600;
        }

        .btn.primary:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .btn.square {
          width: 34px;
          height: 34px;
          font-size: 18px;
          padding: 0;
        }

        .btn.square.selected {
          border-color: #1d3fd6;
          background: #eef2ff;
          color: #1d3fd6;
        }

        .btn.small {
          padding: 4px 8px;
          font-size: 11px;
        }

        .selected-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .selected-desc {
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 6px 0;
        }

        .chips {
          min-height: 40px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .chips-empty {
          font-size: 12px;
          color: #4b5563;
        }

        .chip {
          border-radius: 10px;
          border: 1px solid #9ca3af;
          background: #f9fafb;
          padding: 4px 10px;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .chip-x {
          font-size: 11px;
          color: #6b7280;
        }

        .extra-area {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px dashed #c7d2fe;
        }

        .extra-label {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .error-text {
          color: #dc2626;
          font-size: 12px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
