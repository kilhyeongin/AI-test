// /src/app/admin/checklist/templates/[id]/edit/page.tsx
// 체크리스트 템플릿 수정 페이지

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TemplateItemForm = {
  key: string;
  title: string;
  defaultRole: "admin" | "customer";
  defaultKind: "ADMIN_UPLOAD_VIEW" | "CLIENT_UPLOAD_REVIEW" | "PAYMENT_PIPELINE";
  area: "main" | "extra";
};

export default function AdminChecklistTemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItemForm[]>([]);

  async function loadTemplate() {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const r = await fetch(`/api/admin/checklist-templates/${id}`, {
        cache: "no-store",
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok || !data.template) {
        throw new Error(data?.error || "템플릿 조회에 실패했습니다.");
      }

      const tpl = data.template as {
        id: string;
        name: string;
        description?: string;
        items: TemplateItemForm[];
      };

      setName(tpl.name || "");
      setDescription(tpl.description || "");
      setItems(
        (tpl.items || []).map((it, idx) => ({
          key: it.key || `item_${idx + 1}`,
          title: it.title || "",
          defaultRole: it.defaultRole || "admin",
          defaultKind: it.defaultKind || "ADMIN_UPLOAD_VIEW",
          area: it.area || "main",
        }))
      );
    } catch (e: any) {
      console.error("템플릿 조회 오류:", e);
      setError(e?.message || "템플릿 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: `item_${prev.length + 1}`,
        title: "",
        defaultRole: "admin",
        defaultKind: "ADMIN_UPLOAD_VIEW",
        area: "main",
      },
    ]);
  }

  function updateItem(index: number, patch: Partial<TemplateItemForm>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, ...patch } : it))
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    if (!name.trim()) {
      alert("템플릿 이름을 입력해 주세요.");
      return;
    }
    if (items.length === 0) {
      alert("최소 1개 이상의 항목을 추가해 주세요.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name,
        description,
        items: items.map((it) => ({
          key: it.key,
          title: it.title,
          defaultRole: it.defaultRole,
          defaultKind: it.defaultKind,
          area: it.area,
        })),
      };

      const r = await fetch(`/api/admin/checklist-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || "템플릿 수정에 실패했습니다.");
      }

      alert("템플릿이 수정되었습니다.");
      router.push("/admin/checklist/templates");
    } catch (e: any) {
      console.error("템플릿 수정 오류:", e);
      setError(e?.message || "템플릿 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            체크리스트 템플릿 수정
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            기존에 등록된 템플릿의 이름, 설명, 항목 구성을 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          padding: 20,
        }}
      >
        {loading && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            템플릿 정보 불러오는 중...
          </p>
        )}

        {error && !loading && (
          <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 12 }}>
            오류: {error}
          </p>
        )}

        {!loading && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                템플릿 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: 480,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  padding: "8px 10px",
                  fontSize: 14,
                }}
                placeholder="예: 일반 패키지 체크리스트, 허니문 체크리스트 등"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                설명 (선택)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  padding: "8px 10px",
                  fontSize: 13,
                  resize: "vertical",
                }}
                placeholder="이 템플릿을 언제 사용하는지 메모해 두면 좋습니다."
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  체크리스트 항목 ({items.length}개)
                </span>
                <button
                  type="button"
                  className="btn black"
                  onClick={addItem}
                >
                  + 항목 추가
                </button>
              </div>

              {items.length === 0 && (
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                  아직 항목이 없습니다. &quot;항목 추가&quot; 버튼을 눌러 첫 항목을
                  추가해 주세요.
                </p>
              )}

              {items.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {items.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        padding: 10,
                        background: "#f9fafb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          항목 #{index + 1}
                        </div>
                        <button
                          type="button"
                          className="btn outline-black"
                          onClick={() => removeItem(index)}
                        >
                          삭제
                        </button>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          항목 제목
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            updateItem(index, { title: e.target.value })
                          }
                          style={{
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            padding: "6px 8px",
                            fontSize: 13,
                          }}
                          placeholder="예: 여권 사본 업로드 (고객)"
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            기본 담당
                          </label>
                          <select
                            value={item.defaultRole}
                            onChange={(e) =>
                              updateItem(index, {
                                defaultRole: e.target
                                  .value as TemplateItemForm["defaultRole"],
                              })
                            }
                            style={{
                              borderRadius: 8,
                              border: "1px solid #d1d5db",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                          >
                            <option value="admin">관리자</option>
                            <option value="customer">고객</option>
                          </select>
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            기본 유형
                          </label>
                          <select
                            value={item.defaultKind}
                            onChange={(e) =>
                              updateItem(index, {
                                defaultKind: e.target
                                  .value as TemplateItemForm["defaultKind"],
                              })
                            }
                            style={{
                              borderRadius: 8,
                              border: "1px solid #d1d5db",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                          >
                            <option value="ADMIN_UPLOAD_VIEW">
                              관리자 업로드 / 고객 열람
                            </option>
                            <option value="CLIENT_UPLOAD_REVIEW">
                              고객 업로드 / 관리자 검토
                            </option>
                            <option value="PAYMENT_PIPELINE">
                              결제 파이프라인
                            </option>
                          </select>
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            영역
                          </label>
                          <select
                            value={item.area}
                            onChange={(e) =>
                              updateItem(index, {
                                area: e.target.value as TemplateItemForm["area"],
                              })
                            }
                            style={{
                              borderRadius: 8,
                              border: "1px solid #d1d5db",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                          >
                            <option value="main">메인(순서 있는 단계)</option>
                            <option value="extra">추가 서류(언제든 업로드)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn outline-black"
                onClick={() => router.push("/admin/checklist/templates")}
                disabled={saving}
              >
                목록으로
              </button>
              <button
                type="submit"
                className="btn black"
                disabled={saving}
              >
                {saving ? "저장 중..." : "변경사항 저장"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
